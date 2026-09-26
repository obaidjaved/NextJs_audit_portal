<?php
/**
 * Inspection schedules.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_schedule_out( array $r ) {
	return array(
		'id'           => (string) $r['id'],
		'title'        => (string) $r['title'],
		'templateId'   => (string) $r['template_id'],
		'customerId'   => (string) $r['customer_id'],
		'frequency'    => (string) $r['frequency'],
		'startDate'    => tap_ops_date_out( $r['start_date'] ),
		'active'       => (bool) (int) $r['active'],
		'createdAt'    => tap_ops_iso( $r['created_at'] ),
		'templateName' => (string) $r['template_name'],
		'customerName' => (string) $r['customer_name'],
	);
}

function tap_ops_schedule_select( $where_sql, $args ) {
	global $wpdb;
	$st  = tap_ops_t( 'schedules' );
	$tt  = tap_ops_t( 'templates' );
	$ct  = tap_ops_t( 'customers' );
	$sql = "SELECT s.*, t.name AS template_name, c.name AS customer_name FROM $st s LEFT JOIN $tt t ON t.id = s.template_id LEFT JOIN $ct c ON c.id = s.customer_id $where_sql ORDER BY s.start_date ASC, s.id ASC";
	if ( $args ) {
		$sql = $wpdb->prepare( $sql, $args ); // phpcs:ignore
	}
	return (array) $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore
}

function tap_ops_schedule_input( array $b, $partial ) {
	$d = array();
	if ( array_key_exists( 'title', $b ) || ! $partial ) {
		$v = isset( $b['title'] ) ? tap_ops_text( $b['title'], 255 ) : '';
		if ( '' === $v ) {
			return tap_ops_err( 422, 'validation', 'title is required.' );
		}
		$d['title'] = $v;
	}
	if ( array_key_exists( 'templateId', $b ) || ! $partial ) {
		$id = tap_ops_int_id( isset( $b['templateId'] ) ? $b['templateId'] : null );
		if ( ! $id || ! tap_ops_get_template_row( $id ) ) {
			return tap_ops_err( 422, 'validation', 'templateId does not exist.' );
		}
		$d['template_id'] = $id;
	}
	if ( array_key_exists( 'customerId', $b ) || ! $partial ) {
		$id = tap_ops_int_id( isset( $b['customerId'] ) ? $b['customerId'] : null );
		if ( ! $id || ! tap_ops_get_customer_row( $id ) ) {
			return tap_ops_err( 422, 'validation', 'customerId does not exist.' );
		}
		$d['customer_id'] = $id;
	}
	if ( array_key_exists( 'frequency', $b ) || ! $partial ) {
		$f = isset( $b['frequency'] ) ? $b['frequency'] : null;
		if ( ! in_array( $f, array( 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY' ), true ) ) {
			return tap_ops_err( 422, 'validation', 'frequency is invalid.' );
		}
		$d['frequency'] = $f;
	}
	if ( array_key_exists( 'startDate', $b ) || ! $partial ) {
		$v = tap_ops_valid_date( isset( $b['startDate'] ) ? $b['startDate'] : null );
		if ( null === $v ) {
			return tap_ops_err( 422, 'validation', 'startDate must be YYYY-MM-DD.' );
		}
		$d['start_date'] = $v;
	}
	if ( array_key_exists( 'active', $b ) ) {
		$v = tap_ops_bool( $b['active'] );
		if ( null === $v ) {
			return tap_ops_err( 422, 'validation', 'active must be a boolean.' );
		}
		$d['active'] = $v ? 1 : 0;
	}
	return $d;
}

function tap_ops_h_schedules_list() {
	return array_map( 'tap_ops_schedule_out', tap_ops_schedule_select( '', array() ) );
}

function tap_ops_h_schedule_create( WP_REST_Request $request ) {
	global $wpdb;
	$d = tap_ops_schedule_input( tap_ops_body( $request ), false );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$d = array_merge( array( 'active' => 1 ), $d, array( 'created_at' => tap_ops_now() ) );
	if ( false === $wpdb->insert( tap_ops_t( 'schedules' ), $d ) ) {
		return tap_ops_err( 500, 'db_error', 'Could not save schedule.' );
	}
	$rows = tap_ops_schedule_select( 'WHERE s.id = %d', array( (int) $wpdb->insert_id ) );
	return tap_ops_schedule_out( $rows[0] );
}

function tap_ops_h_schedule_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id   = tap_ops_int_id( $request['id'] );
	$rows = tap_ops_schedule_select( 'WHERE s.id = %d', array( $id ) );
	if ( ! $rows ) {
		return tap_ops_err( 404, 'not_found', 'Schedule not found.' );
	}
	$d = tap_ops_schedule_input( tap_ops_body( $request ), true );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	if ( $d ) {
		$wpdb->update( tap_ops_t( 'schedules' ), $d, array( 'id' => $id ) );
	}
	$rows = tap_ops_schedule_select( 'WHERE s.id = %d', array( $id ) );
	return tap_ops_schedule_out( $rows[0] );
}

function tap_ops_h_schedule_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_schedule_select( 'WHERE s.id = %d', array( $id ) ) ) {
		return tap_ops_err( 404, 'not_found', 'Schedule not found.' );
	}
	$wpdb->delete( tap_ops_t( 'schedules' ), array( 'id' => $id ) );
	return array( 'ok' => true );
}
