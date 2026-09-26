<?php
/**
 * Customer requests (new-customer intake) + approve/reject.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_request_out( array $r ) {
	return array(
		'id'             => (string) $r['id'],
		'firstName'      => (string) $r['first_name'],
		'lastName'       => (string) $r['last_name'],
		'companyName'    => (string) $r['company_name'],
		'title'          => (string) $r['title'],
		'street'         => (string) $r['street'],
		'street2'        => (string) $r['street2'],
		'city'           => (string) $r['city'],
		'state'          => (string) $r['state'],
		'zip'            => (string) $r['zip'],
		'phone'          => (string) $r['phone'],
		'email'          => (string) $r['email'],
		'services'       => array_values( (array) tap_ops_json_out( $r['services'], array() ) ),
		'trainings'      => array_values( (array) tap_ops_json_out( $r['trainings'], array() ) ),
		'dateNeeded'     => tap_ops_date_out( $r['date_needed'] ),
		'additionalInfo' => (string) $r['additional_info'],
		'status'         => (string) $r['status'],
		'reviewedById'   => tap_ops_id_out( $r['reviewed_by_id'] ),
		'reviewedByName' => tap_ops_str_or_null( $r['reviewed_by_name'] ),
		'reviewedAt'     => tap_ops_iso( $r['reviewed_at'] ),
		'reviewNote'     => tap_ops_str_or_null( $r['review_note'] ),
		'customerId'     => tap_ops_id_out( $r['customer_id'] ),
		'createdAt'      => tap_ops_iso( $r['created_at'] ),
		'source'         => (string) $r['source'],
	);
}

function tap_ops_get_request_row( $id ) {
	global $wpdb;
	$t = tap_ops_t( 'requests' );
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
}

/** Clean a list of strings (services/trainings). */
function tap_ops_string_list( $value ) {
	if ( is_string( $value ) ) {
		$value = '' === trim( $value ) ? array() : array( $value );
	}
	if ( ! is_array( $value ) ) {
		return null;
	}
	$out = array();
	foreach ( $value as $v ) {
		if ( is_scalar( $v ) ) {
			$s = tap_ops_text( $v, 255 );
			if ( '' !== $s ) {
				$out[] = $s;
			}
		}
	}
	return array_values( array_unique( $out ) );
}

/**
 * Create a request row from camelCase data (shared by the REST intake and Gravity Forms).
 *
 * @param array $data   Fields as in the contract. Anything missing becomes '' / today.
 * @param bool  $strict When true, required fields are enforced (REST); when false nothing is rejected (GF).
 * @return array|WP_Error Request API object.
 */
function tap_ops_create_request( array $data, $strict, $default_source = 'api' ) {
	global $wpdb;

	$text = function ( $k, $max = 255 ) use ( $data ) {
		return isset( $data[ $k ] ) ? tap_ops_text( $data[ $k ], $max ) : '';
	};
	$row = array(
		'first_name'      => $text( 'firstName', 100 ),
		'last_name'       => $text( 'lastName', 100 ),
		'company_name'    => $text( 'companyName' ),
		'title'           => $text( 'title' ),
		'street'          => $text( 'street' ),
		'street2'         => $text( 'street2' ),
		'city'            => $text( 'city', 100 ),
		'state'           => $text( 'state', 100 ),
		'zip'             => $text( 'zip', 20 ),
		'phone'           => $text( 'phone', 50 ),
		'email'           => isset( $data['email'] ) && is_string( $data['email'] ) ? sanitize_email( trim( $data['email'] ) ) : '',
		'additional_info' => isset( $data['additionalInfo'] ) ? tap_ops_textarea( $data['additionalInfo'], 20000 ) : '',
	);

	if ( $strict ) {
		$required = array(
			'first_name'   => 'firstName',
			'last_name'    => 'lastName',
			'company_name' => 'companyName',
			'street'       => 'street',
			'city'         => 'city',
			'state'        => 'state',
			'zip'          => 'zip',
			'phone'        => 'phone',
			'email'        => 'email',
		);
		foreach ( $required as $col => $key ) {
			if ( '' === $row[ $col ] ) {
				return tap_ops_err( 422, 'validation', "$key is required." );
			}
		}
		if ( ! is_email( $row['email'] ) ) {
			return tap_ops_err( 422, 'validation', 'email is not valid.' );
		}
	}

	$services  = tap_ops_string_list( isset( $data['services'] ) ? $data['services'] : array() );
	$trainings = tap_ops_string_list( isset( $data['trainings'] ) ? $data['trainings'] : array() );
	if ( null === $services || null === $trainings ) {
		if ( $strict ) {
			return tap_ops_err( 422, 'validation', 'services and trainings must be arrays of strings.' );
		}
		$services  = (array) $services;
		$trainings = (array) $trainings;
	}

	$date = gmdate( 'Y-m-d' );
	if ( isset( $data['dateNeeded'] ) && '' !== $data['dateNeeded'] && null !== $data['dateNeeded'] ) {
		$v = tap_ops_valid_date( $data['dateNeeded'] );
		if ( null === $v ) {
			if ( $strict ) {
				return tap_ops_err( 422, 'validation', 'dateNeeded must be YYYY-MM-DD.' );
			}
		} else {
			$date = $v;
		}
	}

	$source = isset( $data['source'] ) ? tap_ops_text( $data['source'], 100 ) : '';

	$row['services']    = tap_ops_json_in( $services );
	$row['trainings']   = tap_ops_json_in( $trainings );
	$row['date_needed'] = $date;
	$row['status']      = 'PENDING';
	$row['source']      = '' === $source ? $default_source : $source;
	$row['created_at']  = tap_ops_now();

	if ( false === $wpdb->insert( tap_ops_t( 'requests' ), $row ) ) {
		return tap_ops_err( 500, 'db_error', 'Could not save request.' );
	}
	return tap_ops_request_out( tap_ops_get_request_row( $wpdb->insert_id ) );
}

function tap_ops_h_request_create( WP_REST_Request $request ) {
	return tap_ops_create_request( tap_ops_body( $request ), true, 'api' );
}

function tap_ops_h_requests_list() {
	global $wpdb;
	$t = tap_ops_t( 'requests' );
	return array_map( 'tap_ops_request_out', (array) $wpdb->get_results( "SELECT * FROM $t ORDER BY created_at DESC, id DESC LIMIT 200", ARRAY_A ) ); // phpcs:ignore
}

function tap_ops_h_requests_pending_count() {
	global $wpdb;
	$t = tap_ops_t( 'requests' );
	return array( 'count' => (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $t WHERE status = %s", 'PENDING' ) ) ); // phpcs:ignore
}

/**
 * Atomically move a request out of PENDING. Only one caller can win.
 */
function tap_ops_claim_request( $id, $status, $note = null ) {
	global $wpdb;
	$t     = tap_ops_t( 'requests' );
	$actor = tap_ops_actor();
	$n     = $wpdb->query(
		$wpdb->prepare(
			"UPDATE $t SET status = %s, reviewed_by_id = %d, reviewed_by_name = %s, reviewed_at = %s, review_note = %s WHERE id = %d AND status = 'PENDING'", // phpcs:ignore
			$status,
			$actor ? (int) $actor->ID : 0,
			$actor ? (string) $actor->display_name : '',
			tap_ops_now(),
			(string) $note,
			(int) $id
		)
	);
	return 1 === (int) $n;
}

function tap_ops_h_request_approve( WP_REST_Request $request ) {
	global $wpdb;
	$id  = tap_ops_int_id( $request['id'] );
	$row = tap_ops_get_request_row( $id );
	if ( ! $row ) {
		return tap_ops_err( 404, 'not_found', 'Request not found.' );
	}
	if ( ! tap_ops_claim_request( $id, 'APPROVED' ) ) {
		return tap_ops_err( 409, 'already_reviewed', 'This request has already been reviewed.' );
	}

	$site    = trim( $row['street'] . ( '' !== $row['street2'] ? ', ' . $row['street2'] : '' ) );
	$contact = trim( $row['first_name'] . ' ' . $row['last_name'] );
	if ( '' !== $row['title'] ) {
		$contact .= ', ' . $row['title'];
	}
	$nn = function ( $v ) {
		return '' === $v ? null : $v;
	};
	$ok = $wpdb->insert(
		tap_ops_t( 'customers' ),
		array(
			'name'       => '' !== $row['company_name'] ? $row['company_name'] : ( '' !== $contact ? $contact : 'Unnamed customer' ),
			'site'       => $nn( $site ),
			'city'       => $nn( $row['city'] ),
			'state'      => $nn( $row['state'] ),
			'zip'        => $nn( $row['zip'] ),
			'contact'    => $nn( $contact ),
			'email'      => $nn( $row['email'] ),
			'phone'      => $nn( $row['phone'] ),
			'created_at' => tap_ops_now(),
		)
	);
	if ( false === $ok ) {
		// Roll the claim back so the request can be retried.
		$wpdb->update( tap_ops_t( 'requests' ), array( 'status' => 'PENDING', 'reviewed_by_id' => null, 'reviewed_by_name' => null, 'reviewed_at' => null ), array( 'id' => $id ) );
		return tap_ops_err( 500, 'db_error', 'Could not create the customer.' );
	}
	$cid = (int) $wpdb->insert_id;
	$wpdb->update( tap_ops_t( 'requests' ), array( 'customer_id' => $cid ), array( 'id' => $id ) );
	return array( 'customerId' => (string) $cid );
}

function tap_ops_h_request_reject( WP_REST_Request $request ) {
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_request_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Request not found.' );
	}
	$b    = tap_ops_body( $request );
	$note = isset( $b['note'] ) ? tap_ops_textarea( $b['note'], 2000 ) : '';
	if ( ! tap_ops_claim_request( $id, 'REJECTED', $note ) ) {
		return tap_ops_err( 409, 'already_reviewed', 'This request has already been reviewed.' );
	}
	return array( 'ok' => true );
}
