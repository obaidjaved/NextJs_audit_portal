<?php
/**
 * Hardening: sign-in throttling, no public user listing, helpers shared by the throttled endpoints.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * IP address of whoever is at the other end. Behind Cloudflare the real visitor is in CF-Connecting-IP.
 * (If the origin were reachable directly this header could be forged, which only lets an attacker dodge the limit, as before.)
 */
function tap_ops_request_ip() {
	foreach ( array( 'HTTP_CF_CONNECTING_IP', 'REMOTE_ADDR' ) as $k ) {
		if ( ! empty( $_SERVER[ $k ] ) ) {
			$ip = trim( (string) $_SERVER[ $k ] ); // phpcs:ignore
			if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
				return $ip;
			}
		}
	}
	return '';
}

/** A client IP supplied by the portal (only used on endpoints that already passed the API-key check). */
function tap_ops_forwarded_ip( array $body ) {
	$ip = isset( $body['clientIp'] ) && is_string( $body['clientIp'] ) ? trim( $body['clientIp'] ) : '';
	return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
}

function tap_ops_throttle_count( $key ) {
	return (int) get_transient( 'tap_thr_' . md5( $key ) );
}

function tap_ops_throttle_hit( $key, $window ) {
	set_transient( 'tap_thr_' . md5( $key ), tap_ops_throttle_count( $key ) + 1, $window );
}

function tap_ops_throttle_clear( $key ) {
	delete_transient( 'tap_thr_' . md5( $key ) );
}

/**
 * WordPress' own login form (wp-login.php): stop password guessing from one address.
 * 10 failures from the same IP lock that IP out for 15 minutes; a correct login clears the count.
 */
add_filter(
	'authenticate',
	function ( $user ) {
		$ip = tap_ops_request_ip();
		if ( '' !== $ip && tap_ops_throttle_count( 'wp-login:' . $ip ) >= 10 ) {
			return new WP_Error( 'tap_too_many', 'Too many failed attempts. Try again in 15 minutes.' );
		}
		return $user;
	},
	1
);
add_action(
	'wp_login_failed',
	function () {
		$ip = tap_ops_request_ip();
		if ( '' !== $ip ) {
			tap_ops_throttle_hit( 'wp-login:' . $ip, 15 * MINUTE_IN_SECONDS );
		}
	}
);
add_action(
	'wp_login',
	function () {
		$ip = tap_ops_request_ip();
		if ( '' !== $ip ) {
			tap_ops_throttle_clear( 'wp-login:' . $ip );
		}
	}
);

/**
 * Do not publish the list of users. Without this, /wp-json/wp/v2/users and /?author=1 hand out login names.
 */
add_filter(
	'rest_endpoints',
	function ( $endpoints ) {
		if ( ! is_user_logged_in() ) {
			unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		}
		return $endpoints;
	}
);
add_action(
	'template_redirect',
	function () {
		if ( ! is_user_logged_in() && ( is_author() || isset( $_GET['author'] ) ) ) { // phpcs:ignore
			global $wp_query;
			$wp_query->set_404();
			status_header( 404 );
			nocache_headers();
			$tpl = get_query_template( '404' );
			if ( $tpl ) {
				include $tpl;
			}
			exit;
		}
	},
	0
);
