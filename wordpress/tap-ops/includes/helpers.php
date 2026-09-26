<?php
/**
 * Shared helpers: errors, dates, sanitizers, JSON, table names.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Full table name for a short name, e.g. tap_ops_t('audits') => wp_tap_audits. */
function tap_ops_t( $name ) {
	global $wpdb;
	return $wpdb->prefix . 'tap_' . $name;
}

/** Error whose REST body is normalised to {code,message} (see routes.php). */
function tap_ops_err( $status, $code, $message ) {
	return new WP_Error( $code, $message, array( 'status' => (int) $status ) );
}

function tap_ops_now() {
	return gmdate( 'Y-m-d H:i:s' );
}

/** MySQL UTC datetime string -> ISO-8601 (2026-09-24T10:49:00.000Z), or null. */
function tap_ops_iso( $mysql ) {
	if ( empty( $mysql ) || '0000-00-00 00:00:00' === $mysql ) {
		return null;
	}
	$ts = strtotime( $mysql . ' UTC' );
	if ( false === $ts ) {
		return null;
	}
	return gmdate( 'Y-m-d\TH:i:s', $ts ) . '.000Z';
}

/** Any parseable date/ISO string -> MySQL UTC datetime, or null. */
function tap_ops_to_mysql_dt( $value ) {
	if ( ! is_string( $value ) || '' === trim( $value ) ) {
		return null;
	}
	$ts = strtotime( $value );
	return false === $ts ? null : gmdate( 'Y-m-d H:i:s', $ts );
}

/** Strict YYYY-MM-DD validation. Returns the string or null. */
function tap_ops_valid_date( $value ) {
	if ( ! is_string( $value ) || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m ) ) {
		return null;
	}
	return checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ? $value : null;
}

/** Date-only column value (may arrive as "2026-09-24 00:00:00") -> YYYY-MM-DD or null. */
function tap_ops_date_out( $value ) {
	if ( empty( $value ) ) {
		return null;
	}
	return substr( (string) $value, 0, 10 );
}

function tap_ops_json_in( $value ) {
	return wp_json_encode( $value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
}

/** Decode a JSON column into a PHP array/object-as-array; falls back to $default. */
function tap_ops_json_out( $raw, $default = array() ) {
	if ( null === $raw || '' === $raw ) {
		return $default;
	}
	$decoded = json_decode( $raw, true );
	return ( null === $decoded && 'null' !== trim( $raw ) ) ? $default : $decoded;
}

function tap_ops_str_or_null( $value ) {
	return ( null === $value || '' === $value ) ? null : (string) $value;
}

function tap_ops_id_out( $value ) {
	return ( null === $value || '' === $value ) ? null : (string) $value;
}

/** Request JSON body as an array (never null). */
function tap_ops_body( WP_REST_Request $request ) {
	$body = $request->get_json_params();
	return is_array( $body ) ? $body : array();
}

/** Loose boolean parsing. Returns true/false, or null if not a boolean-ish value. */
function tap_ops_bool( $value ) {
	if ( is_bool( $value ) ) {
		return $value;
	}
	if ( 1 === $value || '1' === $value || 'true' === $value ) {
		return true;
	}
	if ( 0 === $value || '0' === $value || 'false' === $value ) {
		return false;
	}
	return null;
}

/** Clean single-line text, trimmed and length-capped. Non-scalars become ''. */
function tap_ops_text( $value, $max = 255 ) {
	if ( ! is_scalar( $value ) ) {
		return '';
	}
	$value = sanitize_text_field( (string) $value );
	return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
}

/** Multi-line text, trimmed and length-capped. */
function tap_ops_textarea( $value, $max = 20000 ) {
	if ( ! is_scalar( $value ) ) {
		return '';
	}
	$value = sanitize_textarea_field( (string) $value );
	return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
}

/** Positive integer id from a route/body value, or 0. */
function tap_ops_int_id( $value ) {
	if ( is_int( $value ) ) {
		return $value > 0 ? $value : 0;
	}
	if ( is_string( $value ) && ctype_digit( $value ) ) {
		return (int) $value;
	}
	return 0;
}

/** Build "%d,%d,%d" placeholders for an IN() list of ints (already cast). */
function tap_ops_in_ints( array $ids ) {
	$ids = array_values( array_unique( array_map( 'intval', $ids ) ) );
	return $ids ? implode( ',', $ids ) : '0';
}
