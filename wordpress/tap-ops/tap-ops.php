<?php
/**
 * Plugin Name: TAP Ops
 * Description: Headless back end (REST API, custom tables, roles, Gravity Forms intake) for the TAP Ops console.
 * Version:     1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author:      TAP
 * License:     GPL-2.0-or-later
 * Text Domain: tap-ops
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TAP_OPS_VERSION', '1.0.0' );
define( 'TAP_OPS_DB_VERSION', '1' );
define( 'TAP_OPS_DIR', plugin_dir_path( __FILE__ ) );

require_once TAP_OPS_DIR . 'includes/helpers.php';
require_once TAP_OPS_DIR . 'includes/db.php';
require_once TAP_OPS_DIR . 'includes/auth.php';
require_once TAP_OPS_DIR . 'includes/users.php';
require_once TAP_OPS_DIR . 'includes/customers.php';
require_once TAP_OPS_DIR . 'includes/templates.php';
require_once TAP_OPS_DIR . 'includes/audits.php';
require_once TAP_OPS_DIR . 'includes/actions.php';
require_once TAP_OPS_DIR . 'includes/requests.php';
require_once TAP_OPS_DIR . 'includes/schedules.php';
require_once TAP_OPS_DIR . 'includes/gravity-forms.php';
require_once TAP_OPS_DIR . 'includes/seed.php';
require_once TAP_OPS_DIR . 'includes/routes.php';

register_activation_hook( __FILE__, 'tap_ops_activate' );

function tap_ops_activate() {
	tap_ops_install_schema();
	tap_ops_register_roles();
}

// Lazy upgrade: tables/roles are (re)created whenever the stored version is behind.
add_action( 'plugins_loaded', 'tap_ops_maybe_upgrade' );
