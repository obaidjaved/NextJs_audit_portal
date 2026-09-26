<?php
/**
 * Dev seed (POST /dev/seed, only when TAP_ALLOW_DEV_SEED is true). Idempotent.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_seed_user( $email, $name, $wp_role ) {
	$existing = get_user_by( 'email', $email );
	if ( $existing ) {
		return (int) $existing->ID;
	}
	$id = wp_insert_user(
		array(
			'user_login'   => $email,
			'user_email'   => $email,
			'user_pass'    => 'changeme123',
			'display_name' => $name,
			'nickname'     => $name,
			'role'         => $wp_role,
		)
	);
	if ( is_wp_error( $id ) ) {
		return 0;
	}
	update_user_meta( $id, 'tap_active', '1' );
	return (int) $id;
}

function tap_ops_seed_customer( $name, $site, $city, $state, $zip, $contact, $email, $phone ) {
	global $wpdb;
	$t  = tap_ops_t( 'customers' );
	$id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $t WHERE name = %s", $name ) ); // phpcs:ignore
	if ( $id ) {
		return (int) $id;
	}
	$wpdb->insert(
		$t,
		array(
			'name'       => $name,
			'site'       => $site,
			'city'       => $city,
			'state'      => $state,
			'zip'        => $zip,
			'contact'    => $contact,
			'email'      => $email,
			'phone'      => $phone,
			'created_at' => tap_ops_now(),
		)
	);
	return (int) $wpdb->insert_id;
}

function tap_ops_seed_template_fields() {
	return array(
		array( 'id' => 'f1', 'label' => 'Panel cover intact', 'type' => 'status', 'required' => true ),
		array(
			'id'        => 'f2',
			'label'     => 'Breaker condition',
			'type'      => 'choice',
			'required'  => true,
			'presetKey' => 'good-fair-poor',
			'options'   => array(
				array( 'label' => 'Good', 'score' => 100, 'fail' => false ),
				array( 'label' => 'Fair', 'score' => 60, 'fail' => false ),
				array( 'label' => 'Poor', 'score' => 0, 'fail' => true ),
			),
		),
		array( 'id' => 'f3', 'label' => 'Photo evidence', 'type' => 'photo', 'required' => false ),
		array( 'id' => 'f4', 'label' => 'Additional notes', 'type' => 'text', 'required' => false ),
	);
}

function tap_ops_h_dev_seed() {
	global $wpdb;
	if ( ! defined( 'TAP_ALLOW_DEV_SEED' ) || true !== TAP_ALLOW_DEV_SEED ) {
		return tap_ops_err( 403, 'seed_disabled', 'Dev seed is disabled (define TAP_ALLOW_DEV_SEED as true).' );
	}
	tap_ops_maybe_upgrade();

	$admin_id     = tap_ops_seed_user( 'admin@tapsvs.com', 'TAP Admin', 'tap_admin' );
	$inspector_id = tap_ops_seed_user( 'inspector@tapsvs.com', 'Travis Perry', 'tap_inspector' );

	$cust = array(
		tap_ops_seed_customer( 'Riverside Medical Plaza', 'Building B', 'Austin', 'TX', '78701', 'Dana Whitfield', 'dana@riverside-plaza.example', '512-555-0101' ),
		tap_ops_seed_customer( 'Northgate Data Center', 'North Campus', 'Round Rock', 'TX', '78664', 'Marcus Lee', 'marcus@northgate-dc.example', '512-555-0102' ),
		tap_ops_seed_customer( 'Lakeside Cold Storage', 'Dock 4', 'Austin', 'TX', '78734', 'Priya Nair', 'priya@lakeside-cold.example', '512-555-0103' ),
	);

	// Template.
	$tt   = tap_ops_t( 'templates' );
	$name = 'Panel & Breaker Inspection';
	$tpl  = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $tt WHERE name = %s", $name ) ); // phpcs:ignore
	if ( ! $tpl ) {
		$now = tap_ops_now();
		$wpdb->insert(
			$tt,
			array(
				'name'              => $name,
				'category'          => 'ELECTRICAL',
				'tpl_fields'        => tap_ops_json_in( tap_ops_seed_template_fields() ),
				'approval_required' => 0,
				'report_style'      => 'MODERN',
				'created_at'        => $now,
				'updated_at'        => $now,
			)
		);
		$tpl = (int) $wpdb->insert_id;
	}

	// Audits EL-0001.. (skipped individually if the doc number already exists).
	$good = array( 'label' => 'Good', 'score' => 100, 'fail' => false );
	$fair = array( 'label' => 'Fair', 'score' => 60, 'fail' => false );
	$poor = array( 'label' => 'Poor', 'score' => 0, 'fail' => true );
	$plan = array(
		// customer idx, days ago, status, choice
		array( 0, 340, 'pass', $good ),
		array( 1, 300, 'pass', $fair ),
		array( 2, 250, 'marginal', $fair ),
		array( 0, 200, 'pass', $good ),
		array( 1, 150, 'fail', $poor ),
		array( 2, 100, 'pass', $good ),
		array( 0, 60, 'marginal', $good ),
		array( 1, 30, 'pass', $good ),
		array( 0, 5, 'fail', $fair ),
	);
	$at      = tap_ops_t( 'audits' );
	$acts    = tap_ops_t( 'actions' );
	$seq     = 0;
	$created = 0;
	foreach ( $plan as $i => $p ) {
		$seq = $i + 1;
		$doc = sprintf( 'EL-%04d', $seq );
		if ( $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $at WHERE doc_number = %s", $doc ) ) ) { // phpcs:ignore
			continue;
		}
		$responses = array(
			array( 'label' => 'Panel cover intact', 'type' => 'status', 'value' => $p[2] ),
			array( 'label' => 'Breaker condition', 'type' => 'choice', 'option' => $p[3] ),
			array( 'label' => 'Photo evidence', 'type' => 'photo', 'value' => null, 'caption' => '' ),
			array( 'label' => 'Additional notes', 'type' => 'text', 'value' => '' ),
		);
		$status_score = 'pass' === $p[2] ? 100 : ( 'marginal' === $p[2] ? 60 : 0 );
		$score        = (int) round( ( $status_score + $p[3]['score'] ) / 2 );
		$crit         = 'fail' === $p[2] || $p[3]['fail'];
		$when         = gmdate( 'Y-m-d H:i:s', time() - $p[1] * DAY_IN_SECONDS );
		$wpdb->insert(
			$at,
			array(
				'doc_number'       => $doc,
				'template_id'      => $tpl,
				'customer_id'      => $cust[ $p[0] ],
				'inspector_id'     => $inspector_id ? $inspector_id : null,
				'title'            => $name,
				'score'            => $score,
				'critical_fail'    => $crit ? 1 : 0,
				'draft'            => 0,
				'pending_approval' => 0,
				'audit_date'       => $when,
				'responses'        => tap_ops_json_in( $responses ),
				'notes'            => 'Demo inspection.',
				'photos'           => '[]',
				'created_at'       => $when,
				'updated_at'       => $when,
			)
		);
		$audit_id = (int) $wpdb->insert_id;
		if ( ! $audit_id ) {
			continue;
		}
		$created++;
		$wpdb->insert(
			tap_ops_t( 'events' ),
			array(
				'audit_id'   => $audit_id,
				'user_id'    => $inspector_id ? $inspector_id : null,
				'user_name'  => 'Travis Perry',
				'message'    => 'Inspection submitted',
				'created_at' => $when,
			)
		);
		// Corrective actions for failed / marginal findings.
		$findings = array();
		if ( 'fail' === $p[2] ) {
			$findings[] = array( 'Panel cover intact', 'HIGH', 'Failed inspection item' );
		} elseif ( 'marginal' === $p[2] ) {
			$findings[] = array( 'Panel cover intact', 'MEDIUM', 'Marginal inspection item' );
		}
		if ( $p[3]['fail'] ) {
			$findings[] = array( 'Breaker condition', 'HIGH', 'Answered "Poor"' );
		}
		foreach ( $findings as $f ) {
			$resolved = $p[1] > 120;
			$due      = gmdate( 'Y-m-d', time() - $p[1] * DAY_IN_SECONDS + ( 'HIGH' === $f[1] ? 14 : 30 ) * DAY_IN_SECONDS );
			$wpdb->insert(
				$acts,
				array(
					'title'         => 'Resolve: ' . $f[0],
					'description'   => $f[2] . ' on ' . $name . '.',
					'priority'      => $f[1],
					'status'        => $resolved ? 'RESOLVED' : 'OPEN',
					'due_date'      => $due,
					'finding_label' => $f[0],
					'audit_id'      => $audit_id,
					'customer_id'   => $cust[ $p[0] ],
					'created_by_id' => $inspector_id ? $inspector_id : null,
					'resolved_at'   => $resolved ? gmdate( 'Y-m-d H:i:s', time() - ( $p[1] - 10 ) * DAY_IN_SECONDS ) : null,
					'created_at'    => $when,
				)
			);
		}
	}

	// Keep the doc-number sequence in step with the seeded audits (never lower it).
	$ds  = tap_ops_t( 'doc_sequences' );
	$cur = $wpdb->get_var( $wpdb->prepare( "SELECT seq FROM $ds WHERE category = %s", 'ELECTRICAL' ) ); // phpcs:ignore
	if ( null === $cur ) {
		$wpdb->insert( $ds, array( 'category' => 'ELECTRICAL', 'seq' => $seq ) );
	} elseif ( (int) $cur < $seq ) {
		$wpdb->update( $ds, array( 'seq' => $seq ), array( 'category' => 'ELECTRICAL' ) );
	}
	unset( $admin_id );

	return array( 'ok' => true );
}
