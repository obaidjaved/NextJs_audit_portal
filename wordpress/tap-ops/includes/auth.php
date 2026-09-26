<?php
/**
 * Auth: X-TAP-Key check, acting user (X-TAP-User) check, permission levels, WP login guard.
 *
 * Permission levels used by routes:
 *   'none'   key only, no user (login, public intake, dev seed, by-token)
 *   'staff'  key + active admin/inspector user
 *   'admin'  key + active admin user
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Holds the acting WP_User for the current request (set by the permission callback). */
function tap_ops_actor( $set = null ) {
	static $actor = null;
	if ( false === $set ) {
		$actor = null;
	} elseif ( null !== $set ) {
		$actor = $set;
	}
	return $actor;
}

/** 'ADMIN' | 'INSPECTOR' | null for a WP_User. */
function tap_ops_user_role( $user ) {
	if ( ! $user || empty( $user->roles ) ) {
		return null;
	}
	if ( in_array( 'tap_admin', $user->roles, true ) || in_array( 'administrator', $user->roles, true ) ) {
		return 'ADMIN';
	}
	if ( in_array( 'tap_inspector', $user->roles, true ) ) {
		return 'INSPECTOR';
	}
	return null;
}

/** Users are active unless meta tap_active is explicitly '0'. */
function tap_ops_user_active( $user ) {
	return '0' !== (string) get_user_meta( $user->ID, 'tap_active', true );
}

function tap_ops_check_key( WP_REST_Request $request ) {
	if ( ! defined( 'TAP_API_KEY' ) || ! is_string( TAP_API_KEY ) || '' === TAP_API_KEY ) {
		return tap_ops_err( 503, 'not_configured', 'TAP_API_KEY is not configured on the server.' );
	}
	$sent = (string) $request->get_header( 'x_tap_key' );
	if ( '' === $sent || ! hash_equals( TAP_API_KEY, $sent ) ) {
		return tap_ops_err( 401, 'bad_key', 'Missing or invalid API key.' );
	}
	return true;
}

function tap_ops_check_user( WP_REST_Request $request, $need_admin ) {
	$raw = trim( (string) $request->get_header( 'x_tap_user' ) );
	$id  = tap_ops_int_id( $raw );
	if ( ! $id ) {
		return tap_ops_err( 403, 'forbidden', 'Acting user is missing or invalid.' );
	}
	$user = get_userdata( $id );
	if ( ! $user || ! tap_ops_user_active( $user ) ) {
		return tap_ops_err( 403, 'forbidden', 'Acting user is unknown or inactive.' );
	}
	$role = tap_ops_user_role( $user );
	if ( null === $role || ( $need_admin && 'ADMIN' !== $role ) ) {
		return tap_ops_err( 403, 'forbidden', 'Insufficient permissions.' );
	}
	tap_ops_actor( $user );
	return true;
}

/** Returns a permission_callback for the given level. */
function tap_ops_permission( $level ) {
	return function ( WP_REST_Request $request ) use ( $level ) {
		tap_ops_actor( false );
		$key = tap_ops_check_key( $request );
		if ( true !== $key ) {
			return $key;
		}
		if ( 'none' === $level ) {
			return true;
		}
		return tap_ops_check_user( $request, 'admin' === $level );
	};
}

/**
 * Inactive TAP users must not authenticate through WordPress' own login either.
 */
add_filter(
	'authenticate',
	function ( $user ) {
		if ( $user instanceof WP_User && null !== tap_ops_user_role( $user ) && ! tap_ops_user_active( $user ) ) {
			return new WP_Error( 'tap_inactive', 'This account is inactive.' );
		}
		return $user;
	},
	100
);
