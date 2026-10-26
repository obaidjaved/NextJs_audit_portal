<?php
/**
 * Email templates + sending (wp_mail).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function tap_ops_email_template_out( array $r ) {
	return array(
		'id'           => (string) $r['id'],
		'name'         => (string) $r['name'],
		'subject'      => (string) $r['subject'],
		'body'         => (string) $r['body'],
		'attachReport' => (bool) (int) $r['attach_report'],
		'createdAt'    => tap_ops_iso( $r['created_at'] ),
		'updatedAt'    => tap_ops_iso( $r['updated_at'] ),
	);
}

function tap_ops_get_email_template_row( $id ) {
	global $wpdb;
	$t = tap_ops_t( 'email_templates' );
	return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $t WHERE id = %d", (int) $id ), ARRAY_A ); // phpcs:ignore
}

/** The two starter templates, added once when the table is empty. */
function tap_ops_seed_email_templates() {
	global $wpdb;
	$t = tap_ops_t( 'email_templates' );
	if ( (int) $wpdb->get_var( "SELECT COUNT(*) FROM $t" ) > 0 ) { // phpcs:ignore
		return;
	}
	$now = tap_ops_now();
	$rows = array(
		array(
			'name'          => 'Send audit report',
			'subject'       => 'Your audit report — {{audit_number}}',
			'body'          => "Hello {{contact_name}},\n\nYour audit ({{audit_title}}) for {{customer_name}} is complete. The report is attached to this email as a PDF.\n\nIf you have any questions, just reply to this message.\n\nThank you,\n{{site_name}}",
			'attach_report' => 1,
		),
		array(
			'name'          => 'Follow-up',
			'subject'       => 'Following up on your audit — {{audit_number}}',
			'body'          => "Hello {{contact_name}},\n\nWe wanted to follow up on the audit ({{audit_title}}) carried out by {{auditor_name}}. Please let us know if you need anything further.\n\nThank you,\n{{site_name}}",
			'attach_report' => 0,
		),
	);
	foreach ( $rows as $row ) {
		$row['created_at'] = $now;
		$row['updated_at'] = $now;
		$wpdb->insert( $t, $row );
	}
}

function tap_ops_email_template_input( array $b, $partial ) {
	$data = array();
	$map  = array(
		'name'    => array( 'name', 120 ),
		'subject' => array( 'subject', 255 ),
	);
	foreach ( $map as $key => $def ) {
		if ( array_key_exists( $key, $b ) ) {
			$v = tap_ops_text( $b[ $key ], $def[1] );
			if ( '' === $v ) {
				return tap_ops_err( 422, 'validation', "$key is required." );
			}
			$data[ $def[0] ] = $v;
		}
	}
	if ( array_key_exists( 'body', $b ) ) {
		$v = tap_ops_textarea( $b['body'], 20000 );
		if ( '' === trim( $v ) ) {
			return tap_ops_err( 422, 'validation', 'body is required.' );
		}
		$data['body'] = $v;
	}
	if ( array_key_exists( 'attachReport', $b ) ) {
		$v = tap_ops_bool( $b['attachReport'] );
		if ( null === $v ) {
			return tap_ops_err( 422, 'validation', 'attachReport must be a boolean.' );
		}
		$data['attach_report'] = $v ? 1 : 0;
	}
	if ( ! $partial && ( ! isset( $data['name'] ) || ! isset( $data['subject'] ) || ! isset( $data['body'] ) ) ) {
		return tap_ops_err( 422, 'validation', 'name, subject and body are required.' );
	}
	return $data;
}

function tap_ops_h_email_templates_list() {
	global $wpdb;
	tap_ops_seed_email_templates();
	$t = tap_ops_t( 'email_templates' );
	return array_map( 'tap_ops_email_template_out', (array) $wpdb->get_results( "SELECT * FROM $t ORDER BY name ASC, id ASC", ARRAY_A ) ); // phpcs:ignore
}

function tap_ops_h_email_template_create( WP_REST_Request $request ) {
	global $wpdb;
	$data = tap_ops_email_template_input( tap_ops_body( $request ), false );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	$data['created_at'] = tap_ops_now();
	$data['updated_at'] = $data['created_at'];
	if ( ! isset( $data['attach_report'] ) ) {
		$data['attach_report'] = 0;
	}
	if ( false === $wpdb->insert( tap_ops_t( 'email_templates' ), $data ) ) {
		return tap_ops_err( 500, 'db_error', 'Could not save the template.' );
	}
	return tap_ops_email_template_out( tap_ops_get_email_template_row( $wpdb->insert_id ) );
}

function tap_ops_h_email_template_patch( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_email_template_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Template not found.' );
	}
	$data = tap_ops_email_template_input( tap_ops_body( $request ), true );
	if ( is_wp_error( $data ) ) {
		return $data;
	}
	if ( $data ) {
		$data['updated_at'] = tap_ops_now();
		$wpdb->update( tap_ops_t( 'email_templates' ), $data, array( 'id' => $id ) );
	}
	return tap_ops_email_template_out( tap_ops_get_email_template_row( $id ) );
}

function tap_ops_h_email_template_delete( WP_REST_Request $request ) {
	global $wpdb;
	$id = tap_ops_int_id( $request['id'] );
	if ( ! tap_ops_get_email_template_row( $id ) ) {
		return tap_ops_err( 404, 'not_found', 'Template not found.' );
	}
	$wpdb->delete( tap_ops_t( 'email_templates' ), array( 'id' => $id ) );
	return array( 'ok' => true );
}

/**
 * POST /mail/send { to, subject, body, attachments?: [{filename, contentType, contentBase64}] }
 * Sends a plain-text email with wp_mail(), attaching up to 3 small files (e.g. the audit report PDF).
 */
function tap_ops_h_mail_send( WP_REST_Request $request ) {
	$b       = tap_ops_body( $request );
	$to      = isset( $b['to'] ) && is_string( $b['to'] ) ? sanitize_email( trim( $b['to'] ) ) : '';
	$subject = isset( $b['subject'] ) ? tap_ops_text( $b['subject'], 255 ) : '';
	$body    = isset( $b['body'] ) ? tap_ops_textarea( $b['body'], 20000 ) : '';
	if ( ! is_email( $to ) ) {
		return tap_ops_err( 422, 'validation', 'to must be a valid email address.' );
	}
	if ( '' === $subject || '' === trim( $body ) ) {
		return tap_ops_err( 422, 'validation', 'subject and body are required.' );
	}

	$files = array();
	$dir   = '';
	if ( ! empty( $b['attachments'] ) && is_array( $b['attachments'] ) ) {
		if ( count( $b['attachments'] ) > 3 ) {
			return tap_ops_err( 422, 'validation', 'At most 3 attachments.' );
		}
		$dir = trailingslashit( get_temp_dir() ) . 'tapops-' . wp_generate_password( 12, false );
		wp_mkdir_p( $dir );
		foreach ( $b['attachments'] as $a ) {
			$name = isset( $a['filename'] ) && is_string( $a['filename'] ) ? sanitize_file_name( $a['filename'] ) : 'attachment.pdf';
			$raw  = isset( $a['contentBase64'] ) && is_string( $a['contentBase64'] ) ? base64_decode( $a['contentBase64'], true ) : false;
			if ( false === $raw || strlen( $raw ) > 15 * 1024 * 1024 ) {
				tap_ops_cleanup_mail_dir( $dir, $files );
				return tap_ops_err( 422, 'validation', 'An attachment is invalid or too large (15 MB max).' );
			}
			$path = $dir . '/' . $name;
			file_put_contents( $path, $raw ); // phpcs:ignore
			$files[] = $path;
		}
	}

	$sent = wp_mail( $to, $subject, $body, array( 'Content-Type: text/plain; charset=UTF-8' ), $files );
	if ( $dir ) {
		tap_ops_cleanup_mail_dir( $dir, $files );
	}
	if ( ! $sent ) {
		return tap_ops_err( 502, 'mail_failed', "WordPress couldn't send the email. Check the site's mail settings (an SMTP plugin is recommended)." );
	}
	return array( 'ok' => true );
}

function tap_ops_cleanup_mail_dir( $dir, array $files ) {
	foreach ( $files as $f ) {
		if ( is_file( $f ) ) {
			unlink( $f ); // phpcs:ignore
		}
	}
	if ( is_dir( $dir ) ) {
		rmdir( $dir ); // phpcs:ignore
	}
}
