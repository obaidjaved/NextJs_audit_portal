<?php
/**
 * Customers.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_customer_fields() {
	// body key => array( column, max length )
	return array(
		'name'    => array( 'name', 255 ),
		'site'    => array( 'site', 255 ),
		'city'    => array( 'city', 100 ),
		'state'   => array( 'state', 100 ),
		'zip'     => array( 'zip', 20 ),
		'contact' => array( 'contact', 255 ),
		'email'   => array( 'email', 255 ),
		'phone'   => array( 'phone', 50 ),
	);
}

function tap_ops_customer_out( array $r ) {
	return array(
		'id'        => (string) $r['id'],
		'name'      => (string) $r['name'],
		'site'      => tap_ops_str_or_null( $r['site'] ),
		'city'      => tap_ops_str_or_null( $r['city'] ),
		'state'     => tap_ops_str_or_null( $r['state'] ),
		'zip'       => tap_ops_str_or_null( $r['zip'] ),
		'contact'   => tap_ops_str_or_null( $r['contact'] ),
		'email'     => tap_ops_str_or_null( $r['email'] ),
		'phone'     => tap_ops_str_or_null( $r['phone'] ),
		'createdAt' => tap_ops_iso( $r['created_at'] ),
	);
}

/** Compact customer used inside audit payloads (no createdAt). */
function tap_ops_customer_brief( array $r ) {
	$o = tap_ops_customer_out( $r );
	unset( $o['createdAt'] );
	return $o;
}

function tap_ops_get_customer_row( $id ) {
	global $wpdb;
	$t = tap_ops_t( 'customers' );
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
}

/**
 * Validate customer input.
 *
 * @return array|WP_Error column => value
 */
function tap_ops_customer_input( array $b, $partial ) {
	$data = array();
	foreach ( tap_ops_customer_fields() as $key => $def ) {
		if ( ! array_key_exists( $key, $b ) ) {
			continue;
		}
		if ( 'email' === $key ) {
			$v = is_string( $b[ $key ] ) ? trim( $b[ $key ] ) : '';
			if ( '' !== $v && ! is_email( $v ) ) {
				return tap_ops_err( 422, 'validation', 'email is not valid.' );
			}
			$v = sanitize_email( $v );
		} else {
			$v = tap_ops_text( $b[ $key ], $def[1] );
		}
		if ( 'name' === $key ) {
			if ( '' === $v ) {
				return tap_ops_err( 422, 'validation', 'name is required.' );
			}
			$data['name'] = $v;
		} else {
			$data[ $def[0] ] = '' === $v ? null : $v;
		}
	}
	if ( ! $partial && ! isset( $data['name'] ) ) {
		return tap_ops_err( 422, 'validation', 'name is required.' );
	}
	return $data;
}

function tap_ops_h_customers_list() {
	global $wpdb;
	$t    = tap_ops_t( 'customers' );
	$rows = $wpdb->get_results( "SELECT * FROM $t ORDER BY name ASC, id ASC", ARRAY_A ); // phpcs:ignore
	return array_map( 'tap_ops_customer_out', (array) $rows );
}

function tap_ops_h_customer_get( WP_REST_Request $request ) {
	$row = tap_ops_get_customer_row( tap_ops_int_id( $request['id'] ) );
	return $row ? tap_ops_customer_out( $row ) : tap_ops_err( 404, 'not_found', 'Customer not found.' );
}

function tap_ops_h_customer_create( WP_REST_Request $request ) {
	global $wpdb;
	$data = tap_ops_customer_input( tap_ops_body( $request ), false );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	$data['created_at'] = tap_ops_now();
	if ( false === $wpdb->insert( tap_ops_t( 'customers' ), $data ) ) {
		return tap_ops_err( 500, 'db_error', 'Could not save customer.' );
	}
	return tap_ops_customer_out( tap_ops_get_customer_row( $wpdb->insert_id ) );
}

function tap_ops_h_customer_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_customer_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Customer not found.' );
	}
	$data = tap_ops_customer_input( tap_ops_body( $request ), true );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	if ( $data ) {
		$wpdb->update( tap_ops_t( 'customers' ), $data, array( 'id' => $id ) );
	}
	return tap_ops_customer_out( tap_ops_get_customer_row( $id ) );
}

function tap_ops_h_customer_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_customer_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Customer not found.' );
	}
	foreach ( array( 'audits', 'schedules', 'actions' ) as $tbl ) {
		$t = tap_ops_t( $tbl );
		if ( (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $t WHERE customer_id = %d", $id ) ) > 0 ) { // phpcs:ignore
			return tap_ops_err( 409, 'referenced', 'Customer is referenced by audits, schedules or actions.' );
		}
	}
	// Keep intake history but detach the deleted customer.
	$wpdb->update( tap_ops_t( 'requests' ), array( 'customer_id' => null ), array( 'customer_id' => $id ) );
	$wpdb->delete( tap_ops_t( 'customers' ), array( 'id' => $id ) );
	return array( 'ok' => true );
}
