<?php
/**
 * Corrective actions.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TAP_OPS_ACTION_SELECT = 'a.*, c.name AS customer_name, au.doc_number AS audit_doc';

function tap_ops_action_out( array $r ) {
	$assignee_name = null;
	if ( ! empty( $r['assignee_id'] ) ) {
		$u             = get_userdata( (int) $r['assignee_id'] );
		$assignee_name = $u ? (string) $u->display_name : null;
	}
	return array(
		'id'           => (string) $r['id'],
		'title'        => (string) $r['title'],
		'description'  => (string) $r['description'],
		'priority'     => (string) $r['priority'],
		'status'       => (string) $r['status'],
		'dueDate'      => tap_ops_date_out( $r['due_date'] ),
		'findingLabel' => tap_ops_str_or_null( $r['finding_label'] ),
		'auditId'      => tap_ops_id_out( $r['audit_id'] ),
		'customerId'   => (string) $r['customer_id'],
		'assigneeId'   => tap_ops_id_out( $r['assignee_id'] ),
		'createdById'  => tap_ops_id_out( $r['created_by_id'] ),
		'resolvedAt'   => tap_ops_iso( $r['resolved_at'] ),
		'createdAt'    => tap_ops_iso( $r['created_at'] ),
		'customerName' => (string) $r['customer_name'],
		'auditDoc'     => tap_ops_str_or_null( $r['audit_doc'] ),
		'assigneeName' => $assignee_name,
	);
}

function tap_ops_get_action_out( $id ) {
	global $wpdb;
	$at  = tap_ops_t( 'actions' );
	$ct  = tap_ops_t( 'customers' );
	$aut = tap_ops_t( 'audits' );
	$sel = TAP_OPS_ACTION_SELECT;
	$row = $wpdb->get_row( $wpdb->prepare( "SELECT $sel FROM $at a LEFT JOIN $ct c ON c.id = a.customer_id LEFT JOIN $aut au ON au.id = a.audit_id WHERE a.id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
	return $row ? tap_ops_action_out( $row ) : null;
}

/**
 * Validate action input.
 *
 * @param array $b       Body.
 * @param bool  $partial True for PATCH (only validate keys present).
 * @return array|WP_Error column => value
 */
function tap_ops_action_input( array $b, $partial ) {
	$d = array();

	if ( array_key_exists( 'title', $b ) || ! $partial ) {
		$v = isset( $b['title'] ) ? tap_ops_text( $b['title'], 255 ) : '';
		if ( '' === $v ) {
			return tap_ops_err( 422, 'validation', 'title is required.' );
		}
		$d['title'] = $v;
	}
	if ( array_key_exists( 'description', $b ) ) {
		$d['description'] = null === $b['description'] ? '' : tap_ops_textarea( $b['description'], 20000 );
	}
	if ( array_key_exists( 'priority', $b ) ) {
		if ( ! in_array( $b['priority'], array( 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL' ), true ) ) {
			return tap_ops_err( 422, 'validation', 'priority is invalid.' );
		}
		$d['priority'] = $b['priority'];
	}
	if ( array_key_exists( 'status', $b ) ) {
		if ( ! in_array( $b['status'], array( 'OPEN', 'IN_PROGRESS', 'RESOLVED' ), true ) ) {
			return tap_ops_err( 422, 'validation', 'status is invalid.' );
		}
		$d['status'] = $b['status'];
	}
	if ( array_key_exists( 'dueDate', $b ) ) {
		if ( null === $b['dueDate'] || '' === $b['dueDate'] ) {
			$d['due_date'] = null;
		} else {
			$v = tap_ops_valid_date( $b['dueDate'] );
			if ( null === $v ) {
				return tap_ops_err( 422, 'validation', 'dueDate must be YYYY-MM-DD.' );
			}
			$d['due_date'] = $v;
		}
	}
	if ( array_key_exists( 'findingLabel', $b ) ) {
		$v                  = tap_ops_text( $b['findingLabel'], 255 );
		$d['finding_label'] = '' === $v ? null : $v;
	}
	if ( array_key_exists( 'auditId', $b ) ) {
		if ( null === $b['auditId'] || '' === $b['auditId'] ) {
			$d['audit_id'] = null;
		} else {
			$aid = tap_ops_int_id( $b['auditId'] );
			if ( ! $aid || ! tap_ops_get_audit_row( $aid ) ) {
				return tap_ops_err( 422, 'validation', 'auditId does not exist.' );
			}
			$d['audit_id'] = $aid;
		}
	}
	if ( array_key_exists( 'customerId', $b ) || ! $partial ) {
		$cid = tap_ops_int_id( isset( $b['customerId'] ) ? $b['customerId'] : null );
		if ( ! $cid || ! tap_ops_get_customer_row( $cid ) ) {
			return tap_ops_err( 422, 'validation', 'customerId does not exist.' );
		}
		$d['customer_id'] = $cid;
	}
	if ( array_key_exists( 'assigneeId', $b ) ) {
		if ( null === $b['assigneeId'] || '' === $b['assigneeId'] ) {
			$d['assignee_id'] = null;
		} else {
			$uid = tap_ops_int_id( $b['assigneeId'] );
			if ( ! $uid || ! tap_ops_load_tap_user( $uid ) ) {
				return tap_ops_err( 422, 'validation', 'assigneeId does not exist.' );
			}
			$d['assignee_id'] = $uid;
		}
	}
	return $d;
}

/** Insert a validated action; sets defaults, status handling and creator. Returns new id. */
function tap_ops_insert_action( array $d ) {
	global $wpdb;
	$d = array_merge(
		array(
			'description' => '',
			'priority'    => 'MEDIUM',
			'status'      => 'OPEN',
		),
		$d
	);
	$d['resolved_at']   = 'RESOLVED' === $d['status'] ? tap_ops_now() : null;
	$d['created_by_id'] = tap_ops_actor() ? (int) tap_ops_actor()->ID : null;
	$d['created_at']    = tap_ops_now();
	if ( false === $wpdb->insert( tap_ops_t( 'actions' ), $d ) ) {
		return 0;
	}
	return (int) $wpdb->insert_id;
}

function tap_ops_h_actions_list( WP_REST_Request $request ) {
	global $wpdb;
	$at  = tap_ops_t( 'actions' );
	$ct  = tap_ops_t( 'customers' );
	$aut = tap_ops_t( 'audits' );
	$sel = TAP_OPS_ACTION_SELECT;

	$where = array( '1=1' );
	$args  = array();
	$cid   = tap_ops_int_id( (string) $request->get_param( 'customerId' ) );
	if ( $cid ) {
		$where[] = 'a.customer_id = %d';
		$args[]  = $cid;
	}
	$aid = tap_ops_int_id( (string) $request->get_param( 'auditId' ) );
	if ( $aid ) {
		$where[] = 'a.audit_id = %d';
		$args[]  = $aid;
	}
	$sql = "SELECT $sel FROM $at a LEFT JOIN $ct c ON c.id = a.customer_id LEFT JOIN $aut au ON au.id = a.audit_id WHERE " . implode( ' AND ', $where )
		. ' ORDER BY (a.due_date IS NULL) ASC, a.due_date ASC, a.created_at DESC, a.id DESC';
	if ( $args ) {
		$sql = $wpdb->prepare( $sql, $args ); // phpcs:ignore
	}
	return array_map( 'tap_ops_action_out', (array) $wpdb->get_results( $sql, ARRAY_A ) ); // phpcs:ignore
}

function tap_ops_h_action_create( WP_REST_Request $request ) {
	$d = tap_ops_action_input( tap_ops_body( $request ), false );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$id = tap_ops_insert_action( $d );
	if ( ! $id ) {
		return tap_ops_err( 500, 'db_error', 'Could not save action.' );
	}
	return tap_ops_get_action_out( $id );
}

function tap_ops_h_actions_bulk( WP_REST_Request $request ) {
	$b     = tap_ops_body( $request );
	$items = isset( $b['items'] ) ? $b['items'] : null;
	if ( ! is_array( $items ) ) {
		return tap_ops_err( 422, 'validation', 'items must be an array.' );
	}
	if ( count( $items ) > 200 ) {
		return tap_ops_err( 422, 'validation', 'At most 200 items per request.' );
	}
	// Validate everything first so a bad item creates nothing.
	$rows = array();
	foreach ( array_values( $items ) as $i => $item ) {
		if ( ! is_array( $item ) ) {
			return tap_ops_err( 422, 'validation', "items[$i] must be an object." );
		}
		$d = tap_ops_action_input( $item, false );
		if ( is_wp_error( $d ) ) {
			return tap_ops_err( 422, 'validation', "items[$i]: " . $d->get_error_message() );
		}
		$rows[] = $d;
	}
	$created = 0;
	foreach ( $rows as $d ) {
		if ( tap_ops_insert_action( $d ) ) {
			$created++;
		}
	}
	return array( 'created' => $created );
}

function tap_ops_h_action_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	$t  = tap_ops_t( 'actions' );
	$cur = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", $id ), ARRAY_A ); // phpcs:ignore
	if ( ! $cur ) {
		return tap_ops_err( 404, 'not_found', 'Action not found.' );
	}
	$d = tap_ops_action_input( tap_ops_body( $request ), true );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	if ( isset( $d['status'] ) ) {
		if ( 'RESOLVED' === $d['status'] ) {
			$d['resolved_at'] = ( 'RESOLVED' === $cur['status'] && $cur['resolved_at'] ) ? $cur['resolved_at'] : tap_ops_now();
		} else {
			$d['resolved_at'] = null;
		}
	}
	if ( $d ) {
		$wpdb->update( $t, $d, array( 'id' => $id ) );
	}
	return tap_ops_get_action_out( $id );
}

function tap_ops_h_action_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	$t  = tap_ops_t( 'actions' );
	if ( ! (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $t WHERE id = %d", $id ) ) ) { // phpcs:ignore
		return tap_ops_err( 404, 'not_found', 'Action not found.' );
	}
	$wpdb->delete( $t, array( 'id' => $id ) );
	return array( 'ok' => true );
}
