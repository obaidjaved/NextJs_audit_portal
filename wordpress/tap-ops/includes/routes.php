<?php
/**
 * REST route registration (namespace tap/v1) and error-body normalisation.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'tap_ops_register_routes' );

/**
 * Errors from this namespace are returned as exactly {code, message}.
 */
add_filter(
	'rest_post_dispatch',
	function ( $result, $server, $request ) {
		if ( 0 !== strpos( $request->get_route(), '/tap/v1' ) || ! ( $result instanceof WP_REST_Response ) ) {
			return $result;
		}
		$data = $result->get_data();
		if ( $result->get_status() >= 400 && is_array( $data ) && isset( $data['code'], $data['message'] ) ) {
			$result->set_data(
				array(
					'code'    => (string) $data['code'],
					'message' => (string) $data['message'],
				)
			);
		}
		return $result;
	},
	10,
	3
);

function tap_ops_register_routes() {
	$ns = 'tap/v1';
	$id = '(?P<id>\d+)';

	/**
	 * Register one route with several method handlers.
	 * $defs: array of [ method, callback, level ].
	 */
	$add = function ( $route, array $defs ) use ( $ns ) {
		$handlers = array();
		foreach ( $defs as $d ) {
			$handlers[] = array(
				'methods'             => $d[0],
				'callback'            => $d[1],
				'permission_callback' => tap_ops_permission( $d[2] ),
			);
		}
		register_rest_route( $ns, $route, $handlers );
	};

	// Auth / users.
	$add( '/auth/login', array( array( 'POST', 'tap_ops_h_login', 'none' ) ) );
	$add(
		'/users',
		array(
			array( 'GET', 'tap_ops_h_users_list', 'staff' ),
			array( 'POST', 'tap_ops_h_user_create', 'admin' ),
		)
	);
	$add(
		"/users/$id",
		array(
			array( 'GET', 'tap_ops_h_user_get', 'staff' ),
			array( 'PATCH', 'tap_ops_h_user_patch', 'admin' ),
		)
	);

	// Customers.
	$add(
		'/customers',
		array(
			array( 'GET', 'tap_ops_h_customers_list', 'staff' ),
			array( 'POST', 'tap_ops_h_customer_create', 'staff' ),
		)
	);
	$add(
		"/customers/$id",
		array(
			array( 'GET', 'tap_ops_h_customer_get', 'staff' ),
			array( 'PATCH', 'tap_ops_h_customer_patch', 'staff' ),
			array( 'DELETE', 'tap_ops_h_customer_delete', 'staff' ),
		)
	);

	// Templates.
	$add(
		'/templates',
		array(
			array( 'GET', 'tap_ops_h_templates_list', 'staff' ),
			array( 'POST', 'tap_ops_h_template_create', 'staff' ),
		)
	);
	$add(
		"/templates/$id",
		array(
			array( 'GET', 'tap_ops_h_template_get', 'staff' ),
			array( 'PATCH', 'tap_ops_h_template_patch', 'staff' ),
			array( 'DELETE', 'tap_ops_h_template_delete', 'staff' ),
		)
	);

	// Audits.
	$add(
		'/audits',
		array(
			array( 'GET', 'tap_ops_h_audits_list', 'staff' ),
			array( 'POST', 'tap_ops_h_audit_create', 'staff' ),
		)
	);
	$add( '/audits/by-token/(?P<token>[^/]+)', array( array( 'GET', 'tap_ops_h_audit_by_token', 'none' ) ) );
	$add(
		"/audits/$id",
		array(
			array( 'GET', 'tap_ops_h_audit_get', 'staff' ),
			array( 'PATCH', 'tap_ops_h_audit_patch', 'staff' ),
			array( 'DELETE', 'tap_ops_h_audit_delete', 'admin' ),
		)
	);
	$add( "/audits/$id/share", array( array( 'PATCH', 'tap_ops_h_audit_share', 'staff' ) ) );
	$add(
		"/audits/$id/events",
		array(
			array( 'GET', 'tap_ops_h_events_list', 'staff' ),
			array( 'POST', 'tap_ops_h_event_create', 'staff' ),
		)
	);
	$add( '/doc-numbers', array( array( 'POST', 'tap_ops_h_doc_numbers', 'staff' ) ) );

	// Corrective actions.
	$add(
		'/actions',
		array(
			array( 'GET', 'tap_ops_h_actions_list', 'staff' ),
			array( 'POST', 'tap_ops_h_action_create', 'staff' ),
		)
	);
	$add( '/actions/bulk', array( array( 'POST', 'tap_ops_h_actions_bulk', 'staff' ) ) );
	$add(
		"/actions/$id",
		array(
			array( 'PATCH', 'tap_ops_h_action_patch', 'staff' ),
			array( 'DELETE', 'tap_ops_h_action_delete', 'staff' ),
		)
	);

	// Customer requests.
	$add(
		'/requests',
		array(
			array( 'GET', 'tap_ops_h_requests_list', 'staff' ),
			array( 'POST', 'tap_ops_h_request_create', 'none' ),
		)
	);
	$add( '/requests/pending-count', array( array( 'GET', 'tap_ops_h_requests_pending_count', 'staff' ) ) );
	$add( "/requests/$id/approve", array( array( 'POST', 'tap_ops_h_request_approve', 'admin' ) ) );
	$add( "/requests/$id/reject", array( array( 'POST', 'tap_ops_h_request_reject', 'admin' ) ) );

	// Schedules.
	$add(
		'/schedules',
		array(
			array( 'GET', 'tap_ops_h_schedules_list', 'staff' ),
			array( 'POST', 'tap_ops_h_schedule_create', 'staff' ),
		)
	);
	$add(
		"/schedules/$id",
		array(
			array( 'PATCH', 'tap_ops_h_schedule_patch', 'staff' ),
			array( 'DELETE', 'tap_ops_h_schedule_delete', 'staff' ),
		)
	);

	// Dev seed.
	$add( '/dev/seed', array( array( 'POST', 'tap_ops_h_dev_seed', 'none' ) ) );
}
