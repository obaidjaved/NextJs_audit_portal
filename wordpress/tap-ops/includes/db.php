<?php
/**
 * Schema (dbDelta) and roles.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_install_schema() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$c = $wpdb->get_charset_collate();
	$t = function ( $n ) {
		return tap_ops_t( $n );
	};

	$sql   = array();
	$sql[] = "CREATE TABLE {$t('customers')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  site varchar(255) DEFAULT NULL,
  city varchar(100) DEFAULT NULL,
  state varchar(100) DEFAULT NULL,
  zip varchar(20) DEFAULT NULL,
  contact varchar(255) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  phone varchar(50) DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY name (name)
) $c;";

	$sql[] = "CREATE TABLE {$t('templates')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  category varchar(20) NOT NULL DEFAULT 'GENERAL',
  tpl_fields longtext,
  approval_required tinyint(1) NOT NULL DEFAULT 0,
  report_style varchar(20) NOT NULL DEFAULT 'MODERN',
  report_accent_color varchar(50) DEFAULT NULL,
  report_logo longtext,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY name (name)
) $c;";

	$sql[] = "CREATE TABLE {$t('audits')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  doc_number varchar(40) NOT NULL,
  template_id bigint(20) unsigned NOT NULL,
  customer_id bigint(20) unsigned NOT NULL,
  inspector_id bigint(20) unsigned DEFAULT NULL,
  title varchar(255) NOT NULL,
  score int(11) DEFAULT NULL,
  critical_fail tinyint(1) NOT NULL DEFAULT 0,
  draft tinyint(1) NOT NULL DEFAULT 0,
  pending_approval tinyint(1) NOT NULL DEFAULT 0,
  audit_date datetime NOT NULL,
  responses longtext,
  notes longtext,
  photos longtext,
  signature longtext,
  share_token varchar(40) DEFAULT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY doc_number (doc_number),
  UNIQUE KEY share_token (share_token),
  KEY customer_id (customer_id),
  KEY template_id (template_id),
  KEY audit_date (audit_date)
) $c;";

	$sql[] = "CREATE TABLE {$t('schedules')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  title varchar(255) NOT NULL,
  template_id bigint(20) unsigned NOT NULL,
  customer_id bigint(20) unsigned NOT NULL,
  frequency varchar(20) NOT NULL,
  start_date date NOT NULL,
  active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY template_id (template_id),
  KEY customer_id (customer_id)
) $c;";

	$sql[] = "CREATE TABLE {$t('actions')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  title varchar(255) NOT NULL,
  description longtext,
  priority varchar(20) NOT NULL DEFAULT 'MEDIUM',
  status varchar(20) NOT NULL DEFAULT 'OPEN',
  due_date date DEFAULT NULL,
  finding_label varchar(255) DEFAULT NULL,
  audit_id bigint(20) unsigned DEFAULT NULL,
  customer_id bigint(20) unsigned NOT NULL,
  assignee_id bigint(20) unsigned DEFAULT NULL,
  created_by_id bigint(20) unsigned DEFAULT NULL,
  resolved_at datetime DEFAULT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY audit_id (audit_id),
  KEY customer_id (customer_id)
) $c;";

	$sql[] = "CREATE TABLE {$t('events')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  audit_id bigint(20) unsigned NOT NULL,
  user_id bigint(20) unsigned DEFAULT NULL,
  user_name varchar(255) DEFAULT NULL,
  message text NOT NULL,
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY audit_id (audit_id)
) $c;";

	$sql[] = "CREATE TABLE {$t('requests')} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  first_name varchar(100) NOT NULL DEFAULT '',
  last_name varchar(100) NOT NULL DEFAULT '',
  company_name varchar(255) NOT NULL DEFAULT '',
  title varchar(255) NOT NULL DEFAULT '',
  street varchar(255) NOT NULL DEFAULT '',
  street2 varchar(255) NOT NULL DEFAULT '',
  city varchar(100) NOT NULL DEFAULT '',
  state varchar(100) NOT NULL DEFAULT '',
  zip varchar(20) NOT NULL DEFAULT '',
  phone varchar(50) NOT NULL DEFAULT '',
  email varchar(255) NOT NULL DEFAULT '',
  services longtext,
  trainings longtext,
  date_needed date NOT NULL,
  additional_info longtext,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by_id bigint(20) unsigned DEFAULT NULL,
  reviewed_by_name varchar(255) DEFAULT NULL,
  reviewed_at datetime DEFAULT NULL,
  review_note text,
  customer_id bigint(20) unsigned DEFAULT NULL,
  source varchar(100) NOT NULL DEFAULT '',
  created_at datetime NOT NULL,
  PRIMARY KEY  (id),
  KEY status (status)
) $c;";

	$sql[] = "CREATE TABLE {$t('doc_sequences')} (
  category varchar(20) NOT NULL,
  seq int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY  (category)
) $c;";

	foreach ( $sql as $statement ) {
		dbDelta( $statement );
	}

	update_option( 'tap_ops_db_version', TAP_OPS_DB_VERSION );
}

function tap_ops_register_roles() {
	// Capability `read` only: these accounts have no wp-admin power; all access is through the REST plugin.
	if ( ! get_role( 'tap_admin' ) ) {
		add_role( 'tap_admin', 'TAP Admin', array( 'read' => true ) );
	}
	if ( ! get_role( 'tap_inspector' ) ) {
		add_role( 'tap_inspector', 'TAP Inspector', array( 'read' => true ) );
	}
}

function tap_ops_maybe_upgrade() {
	if ( get_option( 'tap_ops_db_version' ) !== TAP_OPS_DB_VERSION ) {
		tap_ops_install_schema();
	}
	if ( ! get_role( 'tap_admin' ) || ! get_role( 'tap_inspector' ) ) {
		tap_ops_register_roles();
	}
}
