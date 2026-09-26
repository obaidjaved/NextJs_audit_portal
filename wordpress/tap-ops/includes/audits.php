<?php
/**
 * Audits, share tokens, audit events, doc-number sequences.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAP_OPS_AUDIT_LIST_COLS = 'a.id, a.doc_number, a.template_id, a.customer_id, a.inspector_id, a.title, a.score, a.critical_fail, a.draft, a.pending_approval, a.audit_date, a.share_token, a.created_at, a.updated_at';

/**
 * Turn audit rows into API objects.
 *
 * @param array  $rows Rows keyed by column name (may lack responses/notes/photos/signature).
 * @param string $mode 'full' (template with fields) or 'list' (template without fields).
 */
function tap_ops_audits_out( array $rows, $mode = 'full' ) {
	global $wpdb;
	if ( ! $rows ) {
		return array();
	}
	$cust_ids = array_column( $rows, 'customer_id' );
	$tpl_ids  = array_column( $rows, 'template_id' );

	$ct = tap_ops_t( 'customers' );
	$tt = tap_ops_t( 'templates' );
	$in = tap_ops_in_ints( $cust_ids );
	$cs = array();
	foreach ( (array) $wpdb->get_results( "SELECT * FROM $ct WHERE id IN ($in)", ARRAY_A ) as $r ) { // phpcs:ignore
		$cs[ (int) $r['id'] ] = tap_ops_customer_brief( $r );
	}
	$in = tap_ops_in_ints( $tpl_ids );
	$ts = array();
	foreach ( (array) $wpdb->get_results( "SELECT * FROM $tt WHERE id IN ($in)", ARRAY_A ) as $r ) { // phpcs:ignore
		$ts[ (int) $r['id'] ] = tap_ops_template_out( $r, 'full' === $mode );
	}

	$users = array();
	$out   = array();
	foreach ( $rows as $r ) {
		$insp = null;
		if ( ! empty( $r['inspector_id'] ) ) {
			$uid = (int) $r['inspector_id'];
			if ( ! array_key_exists( $uid, $users ) ) {
				$u           = get_userdata( $uid );
				$users[ $uid ] = $u ? array(
					'id'   => (string) $u->ID,
					'name' => (string) $u->display_name,
				) : null;
			}
			$insp = $users[ $uid ];
		}
		$o = array(
			'id'              => (string) $r['id'],
			'docNumber'       => (string) $r['doc_number'],
			'templateId'      => (string) $r['template_id'],
			'customerId'      => (string) $r['customer_id'],
			'inspectorId'     => tap_ops_id_out( $r['inspector_id'] ),
			'title'           => (string) $r['title'],
			'score'           => null === $r['score'] ? null : (int) $r['score'],
			'criticalFail'    => (bool) (int) $r['critical_fail'],
			'draft'           => (bool) (int) $r['draft'],
			'pendingApproval' => (bool) (int) $r['pending_approval'],
			'date'            => tap_ops_iso( $r['audit_date'] ),
		);
		if ( array_key_exists( 'responses', $r ) ) {
			$o['responses'] = tap_ops_json_out( $r['responses'], array() );
		}
		if ( array_key_exists( 'notes', $r ) ) {
			$o['notes'] = (string) $r['notes'];
		}
		if ( array_key_exists( 'photos', $r ) ) {
			$o['photos'] = tap_ops_json_out( $r['photos'], array() );
		}
		if ( array_key_exists( 'signature', $r ) ) {
			$o['signature'] = tap_ops_str_or_null( $r['signature'] );
		}
		$o['shareToken'] = tap_ops_str_or_null( $r['share_token'] );
		$o['createdAt']  = tap_ops_iso( $r['created_at'] );
		$o['updatedAt']  = tap_ops_iso( $r['updated_at'] );
		$o['customer']   = isset( $cs[ (int) $r['customer_id'] ] ) ? $cs[ (int) $r['customer_id'] ] : null;
		$o['template']   = isset( $ts[ (int) $r['template_id'] ] ) ? $ts[ (int) $r['template_id'] ] : null;
		$o['inspector']  = $insp;
		$out[]           = $o;
	}
	return $out;
}

function tap_ops_get_audit_row( $id ) {
	global $wpdb;
	$t = tap_ops_t( 'audits' );
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
}

function tap_ops_full_audit( $id ) {
	$row = tap_ops_get_audit_row( $id );
	if ( ! $row ) {
		return null;
	}
	$o = tap_ops_audits_out( array( $row ), 'full' );
	return $o[0];
}

/**
 * Validate the mutable audit fields shared by create and patch.
 *
 * @return array|WP_Error column => value
 */
function tap_ops_audit_input( array $b ) {
	$d = array();
	if ( array_key_exists( 'score', $b ) ) {
		if ( null === $b['score'] ) {
			$d['score'] = null;
		} elseif ( is_numeric( $b['score'] ) && (int) round( (float) $b['score'] ) >= 0 && (int) round( (float) $b['score'] ) <= 100 ) {
			$d['score'] = (int) round( (float) $b['score'] );
		} else {
			return tap_ops_err( 422, 'validation', 'score must be an integer 0-100 or null.' );
		}
	}
	$flags = array(
		'criticalFail'    => 'critical_fail',
		'draft'           => 'draft',
		'pendingApproval' => 'pending_approval',
	);
	foreach ( $flags as $key => $col ) {
		if ( array_key_exists( $key, $b ) ) {
			$v = tap_ops_bool( $b[ $key ] );
			if ( null === $v ) {
				return tap_ops_err( 422, 'validation', "$key must be a boolean." );
			}
			$d[ $col ] = $v ? 1 : 0;
		}
	}
	foreach ( array( 'responses', 'photos' ) as $key ) {
		if ( array_key_exists( $key, $b ) ) {
			if ( ! is_array( $b[ $key ] ) ) {
				return tap_ops_err( 422, 'validation', "$key must be an array." );
			}
			$d[ $key ] = tap_ops_json_in( array_values( $b[ $key ] ) );
		}
	}
	if ( array_key_exists( 'notes', $b ) ) {
		if ( null !== $b['notes'] && ! is_string( $b['notes'] ) ) {
			return tap_ops_err( 422, 'validation', 'notes must be a string.' );
		}
		$d['notes'] = null === $b['notes'] ? '' : substr( (string) $b['notes'], 0, 200000 );
	}
	if ( array_key_exists( 'signature', $b ) ) {
		if ( null !== $b['signature'] && ! is_string( $b['signature'] ) ) {
			return tap_ops_err( 422, 'validation', 'signature must be a string or null.' );
		}
		if ( is_string( $b['signature'] ) && strlen( $b['signature'] ) > 5000000 ) {
			return tap_ops_err( 422, 'validation', 'signature is too large.' );
		}
		$d['signature'] = ( null === $b['signature'] || '' === $b['signature'] ) ? null : $b['signature'];
	}
	return $d;
}

function tap_ops_h_audits_list( WP_REST_Request $request ) {
	global $wpdb;
	$at = tap_ops_t( 'audits' );
	$ct = tap_ops_t( 'customers' );

	$cols = TAP_OPS_AUDIT_LIST_COLS;
	if ( ! tap_ops_bool( $request->get_param( 'noResponses' ) ) ) {
		$cols .= ', a.responses, a.notes';
	}
	$where = array( '1=1' );
	$args  = array();
	$cid   = tap_ops_int_id( (string) $request->get_param( 'customerId' ) );
	if ( $cid ) {
		$where[] = 'a.customer_id = %d';
		$args[]  = $cid;
	}
	$q = $request->get_param( 'q' );
	if ( is_string( $q ) && '' !== trim( $q ) ) {
		$like    = '%' . $wpdb->esc_like( trim( $q ) ) . '%';
		$where[] = '(a.title LIKE %s OR a.doc_number LIKE %s OR c.name LIKE %s)';
		array_push( $args, $like, $like, $like );
	}
	$sql = "SELECT $cols FROM $at a LEFT JOIN $ct c ON c.id = a.customer_id WHERE " . implode( ' AND ', $where ) . ' ORDER BY a.audit_date DESC, a.id DESC';
	if ( $args ) {
		$sql = $wpdb->prepare( $sql, $args ); // phpcs:ignore
	}
	$rows = $wpdb->get_results( $sql, ARRAY_A ); // phpcs:ignore
	return tap_ops_audits_out( (array) $rows, 'list' );
}

function tap_ops_h_audit_get( WP_REST_Request $request ) {
	$a = tap_ops_full_audit( tap_ops_int_id( $request['id'] ) );
	return $a ? $a : tap_ops_err( 404, 'not_found', 'Audit not found.' );
}

function tap_ops_h_audit_by_token( WP_REST_Request $request ) {
	global $wpdb;
	$token = (string) $request['token'];
	if ( ! preg_match( '/^[A-Za-z0-9_-]{8,64}$/', $token ) ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$t   = tap_ops_t( 'audits' );
	$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE share_token = %s", $token ), ARRAY_A ); // phpcs:ignore
	if ( ! $row ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$o = tap_ops_audits_out( array( $row ), 'full' );
	return $o[0];
}

function tap_ops_h_audit_create( WP_REST_Request $request ) {
	global $wpdb;
	$b = tap_ops_body( $request );

	$doc = isset( $b['docNumber'] ) ? tap_ops_text( $b['docNumber'], 40 ) : '';
	if ( '' === $doc ) {
		return tap_ops_err( 422, 'validation', 'docNumber is required.' );
	}
	$title = isset( $b['title'] ) ? tap_ops_text( $b['title'], 255 ) : '';
	if ( '' === $title ) {
		return tap_ops_err( 422, 'validation', 'title is required.' );
	}
	$tpl_id  = tap_ops_int_id( isset( $b['templateId'] ) ? $b['templateId'] : null );
	$cust_id = tap_ops_int_id( isset( $b['customerId'] ) ? $b['customerId'] : null );
	if ( ! $tpl_id || ! tap_ops_get_template_row( $tpl_id ) ) {
		return tap_ops_err( 422, 'validation', 'templateId does not exist.' );
	}
	if ( ! $cust_id || ! tap_ops_get_customer_row( $cust_id ) ) {
		return tap_ops_err( 422, 'validation', 'customerId does not exist.' );
	}
	$d = tap_ops_audit_input( $b );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$date = tap_ops_now();
	if ( isset( $b['date'] ) && null !== $b['date'] ) {
		$date = tap_ops_to_mysql_dt( $b['date'] );
		if ( null === $date ) {
			return tap_ops_err( 422, 'validation', 'date is not a valid date.' );
		}
	}

	$at = tap_ops_t( 'audits' );
	if ( (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $at WHERE doc_number = %s", $doc ) ) > 0 ) { // phpcs:ignore
		return tap_ops_err( 409, 'duplicate_doc_number', 'That document number already exists.' );
	}

	$now  = tap_ops_now();
	$row  = array_merge(
		array(
			'responses' => '[]',
			'photos'    => '[]',
			'notes'     => '',
		),
		$d,
		array(
			'doc_number'   => $doc,
			'template_id'  => $tpl_id,
			'customer_id'  => $cust_id,
			'inspector_id' => tap_ops_actor() ? (int) tap_ops_actor()->ID : null,
			'title'        => $title,
			'audit_date'   => $date,
			'created_at'   => $now,
			'updated_at'   => $now,
		)
	);
	$prev = $wpdb->suppress_errors( true );
	$ok   = $wpdb->insert( $at, $row );
	$wpdb->suppress_errors( $prev );
	if ( false === $ok ) {
		// Lost a race with another writer on the unique index?
		if ( (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $at WHERE doc_number = %s", $doc ) ) > 0 ) { // phpcs:ignore
			return tap_ops_err( 409, 'duplicate_doc_number', 'That document number already exists.' );
		}
		return tap_ops_err( 500, 'db_error', 'Could not save audit.' );
	}
	return tap_ops_full_audit( $wpdb->insert_id );
}

function tap_ops_h_audit_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_audit_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$d = tap_ops_audit_input( tap_ops_body( $request ) );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$d['updated_at'] = tap_ops_now();
	$wpdb->update( tap_ops_t( 'audits' ), $d, array( 'id' => $id ) );
	return tap_ops_full_audit( $id );
}

function tap_ops_h_audit_share( WP_REST_Request $request ) {
	global $wpdb;
	$id  = tap_ops_int_id( $request['id'] );
	$row = tap_ops_get_audit_row( $id );
	if ( ! $row ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$b       = tap_ops_body( $request );
	$enabled = array_key_exists( 'enabled', $b ) ? tap_ops_bool( $b['enabled'] ) : null;
	if ( null === $enabled ) {
		return tap_ops_err( 422, 'validation', 'enabled must be a boolean.' );
	}
	$token = null;
	if ( $enabled ) {
		$token = $row['share_token'];
		if ( empty( $token ) ) {
			// 18 random bytes -> exactly 24 url-safe base64 chars.
			$token = strtr( base64_encode( random_bytes( 18 ) ), '+/', '-_' );
		}
	}
	$wpdb->update( tap_ops_t( 'audits' ), array( 'share_token' => $token ), array( 'id' => $id ) );
	return array( 'shareToken' => $token );
}

function tap_ops_h_audit_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_audit_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$wpdb->delete( tap_ops_t( 'events' ), array( 'audit_id' => $id ) );
	$wpdb->delete( tap_ops_t( 'actions' ), array( 'audit_id' => $id ) );
	$wpdb->delete( tap_ops_t( 'audits' ), array( 'id' => $id ) );
	return array( 'ok' => true );
}

/* ---------------------------------------------------------------- events */

function tap_ops_event_out( array $r ) {
	return array(
		'id'        => (string) $r['id'],
		'auditId'   => (string) $r['audit_id'],
		'userId'    => tap_ops_id_out( $r['user_id'] ),
		'userName'  => tap_ops_str_or_null( $r['user_name'] ),
		'message'   => (string) $r['message'],
		'createdAt' => tap_ops_iso( $r['created_at'] ),
	);
}

function tap_ops_h_events_list( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_audit_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$t    = tap_ops_t( 'events' );
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM $t WHERE audit_id = %d ORDER BY created_at DESC, id DESC LIMIT 30", $id ), ARRAY_A ); // phpcs:ignore
	return array_map( 'tap_ops_event_out', (array) $rows );
}

function tap_ops_h_event_create( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_audit_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Audit not found.' );
	}
	$b   = tap_ops_body( $request );
	$msg = isset( $b['message'] ) ? tap_ops_text( $b['message'], 1000 ) : '';
	if ( '' === $msg ) {
		return tap_ops_err( 422, 'validation', 'message is required.' );
	}
	$actor = tap_ops_actor();
	$wpdb->insert(
		tap_ops_t( 'events' ),
		array(
			'audit_id'   => $id,
			'user_id'    => $actor ? (int) $actor->ID : null,
			'user_name'  => $actor ? (string) $actor->display_name : null,
			'message'    => $msg,
			'created_at' => tap_ops_now(),
		)
	);
	$t = tap_ops_t( 'events' );
	return tap_ops_event_out( $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", $wpdb->insert_id ), ARRAY_A ) ); // phpcs:ignore
}

/* ----------------------------------------------------------- doc numbers */

/**
 * Compare-and-swap increment: safe under concurrency without transactions or
 * engine-specific SQL. Returns the new sequence value, or 0 if it gave up.
 */
function tap_ops_next_seq( $category ) {
	global $wpdb;
	$t = tap_ops_t( 'doc_sequences' );
	for ( $i = 0; $i < 20; $i++ ) {
		$cur = $wpdb->get_var( $wpdb->prepare( "SELECT seq FROM $t WHERE category = %s", $category ) ); // phpcs:ignore
		if ( null === $cur ) {
			$prev = $wpdb->suppress_errors( true );
			$ok   = $wpdb->insert( $t, array( 'category' => $category, 'seq' => 1 ) );
			$wpdb->suppress_errors( $prev );
			if ( $ok ) {
				return 1;
			}
			continue; // someone else created it first; re-read.
		}
		$cur     = (int) $cur;
		$changed = $wpdb->query( $wpdb->prepare( "UPDATE $t SET seq = %d WHERE category = %s AND seq = %d", $cur + 1, $category, $cur ) ); // phpcs:ignore
		if ( 1 === (int) $changed ) {
			return $cur + 1;
		}
	}
	return 0;
}

function tap_ops_h_doc_numbers( WP_REST_Request $request ) {
	$b = tap_ops_body( $request );
	if ( ! isset( $b['category'] ) || ! in_array( $b['category'], tap_ops_categories(), true ) ) {
		return tap_ops_err( 422, 'validation', 'category is invalid.' );
	}
	$seq = tap_ops_next_seq( $b['category'] );
	if ( ! $seq ) {
		return tap_ops_err( 503, 'busy', 'Could not allocate a sequence number; retry.' );
	}
	return array( 'seq' => $seq );
}
