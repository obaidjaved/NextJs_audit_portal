<?php
/**
 * Templates.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_categories() {
	return array( 'ELECTRICAL', 'PLUMBING', 'HVAC', 'SAFETY', 'GENERAL' );
}

function tap_ops_template_out( array $r, $with_fields = true ) {
	$o = array(
		'id'                => (string) $r['id'],
		'name'              => (string) $r['name'],
		'category'          => (string) $r['category'],
	);
	if ( $with_fields ) {
		$o['fields'] = tap_ops_json_out( $r['tpl_fields'], array() );
	}
	$o['approvalRequired']   = (bool) (int) $r['approval_required'];
	$o['reportStyle']        = (string) $r['report_style'];
	$o['reportAccentColor']  = tap_ops_str_or_null( $r['report_accent_color'] );
	$o['reportLogo']         = tap_ops_str_or_null( $r['report_logo'] );
	return $o;
}

function tap_ops_template_full_out( array $r ) {
	$o              = tap_ops_template_out( $r, true );
	$o['createdAt'] = tap_ops_iso( $r['created_at'] );
	$o['updatedAt'] = tap_ops_iso( $r['updated_at'] );
	return $o;
}

function tap_ops_get_template_row( $id ) {
	global $wpdb;
	$t = tap_ops_t( 'templates' );
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
}

/** @return array|WP_Error column => value */
function tap_ops_template_input( array $b, $partial ) {
	$d = array();
	if ( array_key_exists( 'name', $b ) ) {
		$v = tap_ops_text( $b['name'], 255 );
		if ( '' === $v ) {
			return tap_ops_err( 422, 'validation', 'name is required.' );
		}
		$d['name'] = $v;
	} elseif ( ! $partial ) {
		return tap_ops_err( 422, 'validation', 'name is required.' );
	}
	if ( array_key_exists( 'category', $b ) ) {
		if ( ! in_array( $b['category'], tap_ops_categories(), true ) ) {
			return tap_ops_err( 422, 'validation', 'category is invalid.' );
		}
		$d['category'] = $b['category'];
	}
	if ( array_key_exists( 'fields', $b ) ) {
		if ( ! is_array( $b['fields'] ) ) {
			return tap_ops_err( 422, 'validation', 'fields must be an array.' );
		}
		$d['tpl_fields'] = tap_ops_json_in( array_values( $b['fields'] ) );
	}
	if ( array_key_exists( 'approvalRequired', $b ) ) {
		$v = tap_ops_bool( $b['approvalRequired'] );
		if ( null === $v ) {
			return tap_ops_err( 422, 'validation', 'approvalRequired must be a boolean.' );
		}
		$d['approval_required'] = $v ? 1 : 0;
	}
	if ( array_key_exists( 'reportStyle', $b ) ) {
		if ( ! in_array( $b['reportStyle'], array( 'MODERN', 'CLASSIC' ), true ) ) {
			return tap_ops_err( 422, 'validation', 'reportStyle is invalid.' );
		}
		$d['report_style'] = $b['reportStyle'];
	}
	if ( array_key_exists( 'reportAccentColor', $b ) ) {
		$v                        = tap_ops_text( $b['reportAccentColor'], 50 );
		$d['report_accent_color'] = '' === $v ? null : $v;
	}
	if ( array_key_exists( 'reportLogo', $b ) ) {
		// A URL or data: URI; stored verbatim (length-capped), never rendered as HTML by this plugin.
		$v = is_string( $b['reportLogo'] ) ? trim( $b['reportLogo'] ) : '';
		if ( strlen( $v ) > 3000000 ) {
			return tap_ops_err( 422, 'validation', 'reportLogo is too large.' );
		}
		$d['report_logo'] = '' === $v ? null : $v;
	}
	return $d;
}

function tap_ops_h_templates_list() {
	global $wpdb;
	$t    = tap_ops_t( 'templates' );
	$rows = $wpdb->get_results( "SELECT * FROM $t ORDER BY name ASC, id ASC", ARRAY_A ); // phpcs:ignore
	return array_map( 'tap_ops_template_full_out', (array) $rows );
}

function tap_ops_h_template_get( WP_REST_Request $request ) {
	$row = tap_ops_get_template_row( tap_ops_int_id( $request['id'] ) );
	return $row ? tap_ops_template_full_out( $row ) : tap_ops_err( 404, 'not_found', 'Template not found.' );
}

function tap_ops_h_template_create( WP_REST_Request $request ) {
	global $wpdb;
	$d = tap_ops_template_input( tap_ops_body( $request ), false );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$now = tap_ops_now();
	$d   = array_merge(
		array(
			'category'   => 'GENERAL',
			'tpl_fields' => '[]',
		),
		$d,
		array(
			'created_at' => $now,
			'updated_at' => $now,
		)
	);
	if ( false === $wpdb->insert( tap_ops_t( 'templates' ), $d ) ) {
		return tap_ops_err( 500, 'db_error', 'Could not save template.' );
	}
	return tap_ops_template_full_out( tap_ops_get_template_row( $wpdb->insert_id ) );
}

function tap_ops_h_template_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_template_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Template not found.' );
	}
	$d = tap_ops_template_input( tap_ops_body( $request ), true );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$d['updated_at'] = tap_ops_now();
	$wpdb->update( tap_ops_t( 'templates' ), $d, array( 'id' => $id ) );
	return tap_ops_template_full_out( tap_ops_get_template_row( $id ) );
}

function tap_ops_h_template_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_template_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Template not found.' );
	}
	foreach ( array( 'audits', 'schedules' ) as $tbl ) {
		$t = tap_ops_t( $tbl );
		if ( (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $t WHERE template_id = %d", $id ) ) > 0 ) { // phpcs:ignore
			return tap_ops_err( 409, 'referenced', 'Template is used by audits or schedules.' );
		}
	}
	$wpdb->delete( tap_ops_t( 'templates' ), array( 'id' => $id ) );
	return array( 'ok' => true );
}
