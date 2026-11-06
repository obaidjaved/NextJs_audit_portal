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

/**
 * Cross-origin access. WordPress answers any website's cross-origin request with "Access-Control-Allow-Origin: <that site>"
 * and credentials allowed. The portal talks to this API from its server (no browser, so no CORS), so by default nothing is allowed.
 * Define TAP_OPS_CORS_ORIGINS (comma separated, e.g. 'https://auditportal.tapsvs.com') if a browser ever has to call it.
 */
add_action(
	'rest_api_init',
	function () {
		remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
		add_filter(
			'rest_pre_serve_request',
			function ( $value ) {
				$origin  = isset( $_SERVER['HTTP_ORIGIN'] ) ? trim( (string) $_SERVER['HTTP_ORIGIN'] ) : ''; // phpcs:ignore
				$allowed = defined( 'TAP_OPS_CORS_ORIGINS' ) ? array_map( 'trim', explode( ',', (string) TAP_OPS_CORS_ORIGINS ) ) : array();
				header( 'Vary: Origin', false );
				if ( '' !== $origin && in_array( $origin, $allowed, true ) ) {
					header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
					header( 'Access-Control-Allow-Methods: OPTIONS, GET, POST, PUT, PATCH, DELETE' );
					header( 'Access-Control-Allow-Headers: Authorization, X-WP-Nonce, Content-Type, X-TAP-Key, X-TAP-User' );
					header( 'Access-Control-Allow-Credentials: true' );
				}
				return $value;
			}
		);
	},
	20
);

/**
 * Anonymous visitors only need the TAP API (which has its own key). Everything else in the WordPress REST API
 * (posts, pages, comments, media, the index of routes) is closed to them. Signed-in WordPress users, and the admin screens, are unaffected.
 * Define TAP_OPS_KEEP_PUBLIC_REST as true to switch this off.
 */
add_filter(
	'rest_authentication_errors',
	function ( $result ) {
		if ( ! empty( $result ) || ( defined( 'TAP_OPS_KEEP_PUBLIC_REST' ) && TAP_OPS_KEEP_PUBLIC_REST ) || is_user_logged_in() ) {
			return $result;
		}
		$route = isset( $GLOBALS['wp']->query_vars['rest_route'] ) ? (string) $GLOBALS['wp']->query_vars['rest_route'] : '';
		if ( 0 === strpos( $route, '/tap/v1' ) ) {
			return $result;
		}
		return new WP_Error( 'rest_not_available', 'This part of the API is not available.', array( 'status' => 401 ) );
	},
	99
);

/** Do not announce the WordPress version in the page source. */
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );
