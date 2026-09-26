<?php
/**
 * Users + login handlers.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_tap_roles() {
	return array( 'tap_admin', 'tap_inspector', 'administrator' );
}

function tap_ops_audit_counts() {
	global $wpdb;
	$t    = tap_ops_t( 'audits' );
	$rows = $wpdb->get_results( "SELECT inspector_id, COUNT(*) AS n FROM $t WHERE inspector_id IS NOT NULL GROUP BY inspector_id", ARRAY_A ); // phpcs:ignore
	$out  = array();
	foreach ( (array) $rows as $r ) {
		$out[ (int) $r['inspector_id'] ] = (int) $r['n'];
	}
	return $out;
}

function tap_ops_user_out( WP_User $user, $counts = null ) {
	if ( null === $counts ) {
		$counts = tap_ops_audit_counts();
	}
	return array(
		'id'         => (string) $user->ID,
		'name'       => (string) $user->display_name,
		'email'      => (string) $user->user_email,
		'role'       => tap_ops_user_role( $user ) ? tap_ops_user_role( $user ) : 'INSPECTOR',
		'active'     => tap_ops_user_active( $user ),
		'auditCount' => isset( $counts[ $user->ID ] ) ? (int) $counts[ $user->ID ] : 0,
	);
}

/** Load a user only if it is a TAP user (has a tap role / administrator). */
function tap_ops_load_tap_user( $id ) {
	$id   = tap_ops_int_id( $id );
	$user = $id ? get_userdata( $id ) : false;
	if ( ! $user || null === tap_ops_user_role( $user ) ) {
		return null;
	}
	return $user;
}

function tap_ops_h_login( WP_REST_Request $request ) {
	$body     = tap_ops_body( $request );
	$identity = isset( $body['email'] ) && is_string( $body['email'] ) ? trim( $body['email'] ) : '';
	$password = isset( $body['password'] ) && is_string( $body['password'] ) ? $body['password'] : '';
	if ( '' === $identity || '' === $password ) {
		return tap_ops_err( 422, 'validation', 'email and password are required.' );
	}

	$throttle_key = 'tap_login_' . md5( strtolower( $identity ) );
	$fails        = (int) get_transient( $throttle_key );
	if ( $fails >= 10 ) {
		return tap_ops_err( 429, 'too_many_attempts', 'Too many failed attempts. Try again in 15 minutes.' );
	}

	$user = is_email( $identity ) ? get_user_by( 'email', $identity ) : false;
	if ( ! $user ) {
		$user = get_user_by( 'login', $identity );
	}
	$ok = $user
		&& wp_check_password( $password, $user->user_pass, $user->ID )
		&& null !== tap_ops_user_role( $user )
		&& tap_ops_user_active( $user );

	if ( ! $ok ) {
		set_transient( $throttle_key, $fails + 1, 15 * MINUTE_IN_SECONDS );
		return tap_ops_err( 401, 'bad_credentials', 'Invalid email or password.' );
	}
	delete_transient( $throttle_key );

	return array(
		'id'    => (string) $user->ID,
		'name'  => (string) $user->display_name,
		'email' => (string) $user->user_email,
		'role'  => tap_ops_user_role( $user ),
	);
}

function tap_ops_h_users_list() {
	$users  = get_users( array( 'role__in' => tap_ops_tap_roles(), 'orderby' => 'display_name', 'order' => 'ASC' ) );
	$counts = tap_ops_audit_counts();
	$out    = array();
	foreach ( $users as $u ) {
		$out[] = tap_ops_user_out( $u, $counts );
	}
	return $out;
}

function tap_ops_h_user_get( WP_REST_Request $request ) {
	$user = tap_ops_load_tap_user( $request['id'] );
	if ( ! $user ) {
		return tap_ops_err( 404, 'not_found', 'User not found.' );
	}
	return tap_ops_user_out( $user );
}

function tap_ops_h_user_create( WP_REST_Request $request ) {
	$b     = tap_ops_body( $request );
	$name  = isset( $b['name'] ) ? tap_ops_text( $b['name'], 100 ) : '';
	$email = isset( $b['email'] ) && is_string( $b['email'] ) ? sanitize_email( trim( $b['email'] ) ) : '';
	$pass  = isset( $b['password'] ) && is_string( $b['password'] ) ? $b['password'] : '';
	$role  = isset( $b['role'] ) ? $b['role'] : '';

	if ( '' === $name ) {
		return tap_ops_err( 422, 'validation', 'name is required.' );
	}
	if ( ! is_email( $email ) ) {
		return tap_ops_err( 422, 'validation', 'A valid email is required.' );
	}
	if ( strlen( $pass ) < 8 ) {
		return tap_ops_err( 422, 'validation', 'password must be at least 8 characters.' );
	}
	if ( ! in_array( $role, array( 'ADMIN', 'INSPECTOR' ), true ) ) {
		return tap_ops_err( 422, 'validation', 'role must be ADMIN or INSPECTOR.' );
	}
	if ( email_exists( $email ) || username_exists( $email ) ) {
		return tap_ops_err( 409, 'email_exists', 'A user with that email already exists.' );
	}

	$id = wp_insert_user(
		array(
			'user_login'   => $email,
			'user_email'   => $email,
			'user_pass'    => $pass,
			'display_name' => $name,
			'nickname'     => $name,
			'role'         => 'ADMIN' === $role ? 'tap_admin' : 'tap_inspector',
		)
	);
	if ( is_wp_error( $id ) ) {
		return tap_ops_err( 422, 'validation', $id->get_error_message() );
	}
	update_user_meta( $id, 'tap_active', '1' );
	return tap_ops_user_out( get_userdata( $id ) );
}

function tap_ops_h_user_patch( WP_REST_Request $request ) {
	$user = tap_ops_load_tap_user( $request['id'] );
	if ( ! $user ) {
		return tap_ops_err( 404, 'not_found', 'User not found.' );
	}
	$b    = tap_ops_body( $request );
	$self = tap_ops_actor() && (int) tap_ops_actor()->ID === (int) $user->ID;

	$role = null;
	if ( array_key_exists( 'role', $b ) ) {
		if ( ! in_array( $b['role'], array( 'ADMIN', 'INSPECTOR' ), true ) ) {
			return tap_ops_err( 422, 'validation', 'role must be ADMIN or INSPECTOR.' );
		}
		$role = $b['role'];
	}
	$active = null;
	if ( array_key_exists( 'active', $b ) ) {
		$active = tap_ops_bool( $b['active'] );
		if ( null === $active ) {
			return tap_ops_err( 422, 'validation', 'active must be a boolean.' );
		}
	}
	$pass = null;
	if ( array_key_exists( 'password', $b ) ) {
		if ( ! is_string( $b['password'] ) || strlen( $b['password'] ) < 8 ) {
			return tap_ops_err( 422, 'validation', 'password must be at least 8 characters.' );
		}
		$pass = $b['password'];
	}
	if ( $self && ( ( null !== $role && tap_ops_user_role( $user ) !== $role ) || false === $active ) ) {
		return tap_ops_err( 422, 'self_change', 'You cannot change your own role or deactivate yourself.' );
	}

	if ( null !== $role && tap_ops_user_role( $user ) !== $role ) {
		$user->set_role( 'ADMIN' === $role ? 'tap_admin' : 'tap_inspector' );
	}
	if ( null !== $active ) {
		update_user_meta( $user->ID, 'tap_active', $active ? '1' : '0' );
	}
	if ( null !== $pass ) {
		wp_set_password( $pass, $user->ID );
	}
	clean_user_cache( $user->ID );
	return tap_ops_user_out( get_userdata( $user->ID ) );
}
