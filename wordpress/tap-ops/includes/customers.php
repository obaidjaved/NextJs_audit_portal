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

function tap_ops_lead_statuses() {
	return array( 'New', 'Contacted', 'In progress', 'Cold', 'Not Interested', 'Converted' );
}

function tap_ops_payment_statuses() {
	return array( 'None', 'Partial', 'Full Payment' );
}

function tap_ops_progress_statuses() {
	return array( 'In progress', 'Rescheduled', 'Completed' );
}

/**
 * Payment proofs (transfer screenshots / invoices): up to 10 strings, each an https URL, an
 * uploaded-file path or an image/PDF data URL. Returns the clean list, or null if the value is malformed.
 */
function tap_ops_proof_list( $value ) {
	if ( ! is_array( $value ) || count( $value ) > 20 ) {
		return null;
	}
	$out = array();
	foreach ( $value as $v ) {
		if ( ! is_string( $v ) || strlen( $v ) > 3000000 ) {
			return null;
		}
		$ok = 0 === strpos( $v, 'https://' ) || 0 === strpos( $v, '/uploads/' ) || 0 === strpos( $v, 'data:image/' ) || 0 === strpos( $v, 'data:application/pdf' );
		if ( ! $ok ) {
			return null;
		}
		$out[] = $v;
	}
	return array_values( array_unique( $out ) );
}

/**
 * Payment records: [{id, amount, method, date, transactionId, proofs[], recordedAt}], up to 20.
 * Returns the cleaned list, or null if anything is malformed.
 */
function tap_ops_payments_in( $value ) {
	if ( ! is_array( $value ) || count( $value ) > 20 ) {
		return null;
	}
	$out = array();
	foreach ( $value as $p ) {
		if ( ! is_array( $p ) ) {
			return null;
		}
		$amount = isset( $p['amount'] ) ? tap_ops_money_in( $p['amount'] ) : false;
		$date   = isset( $p['date'] ) ? tap_ops_valid_date( $p['date'] ) : null;
		$method = isset( $p['method'] ) ? $p['method'] : '';
		$proofs = isset( $p['proofs'] ) ? tap_ops_proof_list( $p['proofs'] ) : array();
		if ( false === $amount || null === $amount || null === $date || ! in_array( $method, array( 'PayPal', 'Bank Transfer' ), true ) || null === $proofs ) {
			return null;
		}
		$out[] = array(
			'id'            => isset( $p['id'] ) ? tap_ops_text( $p['id'], 64 ) : wp_generate_password( 10, false ),
			'amount'        => $amount,
			'method'        => $method,
			'date'          => $date,
			'transactionId' => isset( $p['transactionId'] ) ? tap_ops_text( $p['transactionId'], 120 ) : '',
			'proofs'        => $proofs,
			'recordedAt'    => isset( $p['recordedAt'] ) ? tap_ops_text( $p['recordedAt'], 40 ) : gmdate( 'c' ),
		);
	}
	return $out;
}

/** Money input: null/'' -> null, a non-negative number -> rounded float, anything else -> false. */
function tap_ops_money_in( $value ) {
	if ( null === $value || '' === $value ) {
		return null;
	}
	if ( ! is_numeric( $value ) || (float) $value < 0 || (float) $value > 999999999 ) {
		return false;
	}
	return round( (float) $value, 2 );
}

function tap_ops_customer_out( array $r ) {
	$aid     = isset( $r['assigned_auditor_id'] ) ? (int) $r['assigned_auditor_id'] : 0;
	$auditor = $aid ? get_userdata( $aid ) : false;
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
		'services'  => array_values( (array) tap_ops_json_out( isset( $r['services'] ) ? $r['services'] : null, array() ) ),
		'serviceDate'         => tap_ops_date_out( isset( $r['service_date'] ) ? $r['service_date'] : null ),
		'assignedAuditorId'   => $aid ? (string) $aid : null,
		'assignedAuditorName' => $auditor ? (string) $auditor->display_name : null,
		'assignedAt'          => tap_ops_iso( isset( $r['assigned_at'] ) ? $r['assigned_at'] : null ),
		'paymentStatus'       => isset( $r['payment_status'] ) && '' !== $r['payment_status'] ? (string) $r['payment_status'] : 'None',
		'projectValue'        => isset( $r['project_value'] ) && null !== $r['project_value'] ? (float) $r['project_value'] : null,
		'progressStatus'      => isset( $r['progress_status'] ) && '' !== $r['progress_status'] ? (string) $r['progress_status'] : 'In progress',
		'paymentProofs'       => array_values( (array) tap_ops_json_out( isset( $r['payment_proofs'] ) ? $r['payment_proofs'] : null, array() ) ),
		'payments'            => array_values( (array) tap_ops_json_out( isset( $r['payments'] ) ? $r['payments'] : null, array() ) ),
		'amountPaid'          => isset( $r['amount_paid'] ) ? (float) $r['amount_paid'] : 0.0,
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
function tap_ops_customer_input( array $b, $partial, $current = null ) {
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

	// Operations tracking.
	if ( array_key_exists( 'services', $b ) ) {
		$list = tap_ops_string_list( $b['services'] );
		if ( null === $list ) {
			return tap_ops_err( 422, 'validation', 'services must be an array of strings.' );
		}
		$data['services'] = tap_ops_json_in( $list );
	}
	if ( array_key_exists( 'serviceDate', $b ) ) {
		if ( null === $b['serviceDate'] || '' === $b['serviceDate'] ) {
			$data['service_date'] = null;
		} else {
			$d = tap_ops_valid_date( $b['serviceDate'] );
			if ( null === $d ) {
				return tap_ops_err( 422, 'validation', 'serviceDate must be YYYY-MM-DD.' );
			}
			$data['service_date'] = $d;
		}
	}
	if ( array_key_exists( 'paymentProofs', $b ) ) {
		$proofs = tap_ops_proof_list( $b['paymentProofs'] );
		if ( null === $proofs ) {
			return tap_ops_err( 422, 'validation', 'paymentProofs must be up to 10 image/PDF links.' );
		}
		$data['payment_proofs'] = tap_ops_json_in( $proofs );
	}
	if ( array_key_exists( 'payments', $b ) ) {
		$pay = tap_ops_payments_in( $b['payments'] );
		if ( null === $pay ) {
			return tap_ops_err( 422, 'validation', 'payments is invalid.' );
		}
		$data['payments'] = tap_ops_json_in( $pay );
	}
	if ( array_key_exists( 'amountPaid', $b ) ) {
		$m = tap_ops_money_in( $b['amountPaid'] );
		if ( false === $m ) {
			return tap_ops_err( 422, 'validation', 'amountPaid must be a non-negative number.' );
		}
		$data['amount_paid'] = null === $m ? 0 : $m;
	}
	if ( array_key_exists( 'paymentStatus', $b ) ) {
		if ( ! in_array( $b['paymentStatus'], tap_ops_payment_statuses(), true ) ) {
			return tap_ops_err( 422, 'validation', 'paymentStatus is invalid.' );
		}
		$data['payment_status'] = $b['paymentStatus'];
	}
	if ( array_key_exists( 'progressStatus', $b ) ) {
		if ( ! in_array( $b['progressStatus'], tap_ops_progress_statuses(), true ) ) {
			return tap_ops_err( 422, 'validation', 'progressStatus is invalid.' );
		}
		$data['progress_status'] = $b['progressStatus'];
	}
	if ( array_key_exists( 'projectValue', $b ) ) {
		$m = tap_ops_money_in( $b['projectValue'] );
		if ( false === $m ) {
			return tap_ops_err( 422, 'validation', 'projectValue must be a non-negative number.' );
		}
		$data['project_value'] = $m;
	}
	if ( array_key_exists( 'assignedAuditorId', $b ) ) {
		if ( null === $b['assignedAuditorId'] || '' === $b['assignedAuditorId'] ) {
			$new_id = null;
		} else {
			$u = tap_ops_load_tap_user( $b['assignedAuditorId'] );
			if ( ! $u ) {
				return tap_ops_err( 422, 'validation', 'assignedAuditorId is not a TAP user.' );
			}
			$new_id = (int) $u->ID;
		}
		$old_id = $current && ! empty( $current['assigned_auditor_id'] ) ? (int) $current['assigned_auditor_id'] : null;
		$data['assigned_auditor_id'] = $new_id;
		if ( $new_id !== $old_id ) {
			$data['assigned_at'] = null === $new_id ? null : tap_ops_now();
		}
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
	$data = tap_ops_customer_input( tap_ops_body( $request ), false, null );
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
	$current = tap_ops_get_customer_row( $id );
	if ( ! $current ) {
		return tap_ops_err( 404, 'not_found', 'Customer not found.' );
	}
	$data = tap_ops_customer_input( tap_ops_body( $request ), true, $current );
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
