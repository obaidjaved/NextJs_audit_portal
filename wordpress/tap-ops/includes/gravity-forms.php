<?php
/**
 * Gravity Forms intake. Registering the hook is harmless when GF is not installed
 * (the action simply never fires); nothing here calls a GF class.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'gform_after_submission', 'tap_ops_gf_after_submission', 10, 2 );

/** Read a property from a GF_Field object, stdClass or array. */
function tap_ops_gf_prop( $field, $prop, $default = null ) {
	if ( is_array( $field ) ) {
		return isset( $field[ $prop ] ) ? $field[ $prop ] : $default;
	}
	if ( is_object( $field ) ) {
		return isset( $field->$prop ) ? $field->$prop : $default;
	}
	return $default;
}

/** Entry value as a trimmed string ('' if missing / non-scalar). */
function tap_ops_gf_val( $entry, $key ) {
	$key = (string) $key;
	return ( isset( $entry[ $key ] ) && is_scalar( $entry[ $key ] ) ) ? trim( (string) $entry[ $key ] ) : '';
}

/** Normalise m/d/Y, Y-m-d or d/m/Y to Y-m-d. Returns today's date if unparseable. */
function tap_ops_gf_date( $raw ) {
	$raw = trim( (string) $raw );
	if ( preg_match( '/^(\d{4})-(\d{1,2})-(\d{1,2})/', $raw, $m ) && checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ) {
		return sprintf( '%04d-%02d-%02d', $m[1], $m[2], $m[3] );
	}
	if ( preg_match( '#^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$#', $raw, $m ) ) {
		$a = (int) $m[1];
		$b = (int) $m[2];
		$y = (int) $m[3];
		if ( checkdate( $a, $b, $y ) ) { // m/d/Y first (US form).
			return sprintf( '%04d-%02d-%02d', $y, $a, $b );
		}
		if ( checkdate( $b, $a, $y ) ) { // otherwise d/m/Y.
			return sprintf( '%04d-%02d-%02d', $y, $b, $a );
		}
	}
	if ( '' !== $raw ) {
		$ts = strtotime( $raw );
		if ( false !== $ts ) {
			return gmdate( 'Y-m-d', $ts );
		}
	}
	return gmdate( 'Y-m-d' );
}

/** Selected checkbox choice labels for a checkbox field (GF stores the choice value per input id). */
function tap_ops_gf_checked( $field, $entry ) {
	$choices = (array) tap_ops_gf_prop( $field, 'choices', array() );
	$by_val  = array();
	foreach ( $choices as $c ) {
		$text = tap_ops_gf_prop( $c, 'text' );
		$val  = tap_ops_gf_prop( $c, 'value' );
		if ( null !== $val && null !== $text ) {
			$by_val[ (string) $val ] = (string) $text;
		}
	}
	$out = array();
	foreach ( (array) tap_ops_gf_prop( $field, 'inputs', array() ) as $input ) {
		$id = tap_ops_gf_prop( $input, 'id' );
		if ( null === $id ) {
			continue;
		}
		$v = tap_ops_gf_val( $entry, $id );
		if ( '' !== $v ) {
			$out[] = isset( $by_val[ $v ] ) ? $by_val[ $v ] : $v;
		}
	}
	return $out;
}

/**
 * Map a Gravity Forms entry to the request fields of the API contract (camelCase).
 *
 * @param array $entry GF entry (keys are field ids / "id.input" strings).
 * @param array $form  GF form (with a `fields` array of GF_Field objects or arrays).
 * @return array
 */
function tap_ops_map_gf_entry( $entry, $form ) {
	$m = array(
		'firstName'      => '',
		'lastName'       => '',
		'companyName'    => '',
		'title'          => '',
		'street'         => '',
		'street2'        => '',
		'city'           => '',
		'state'          => '',
		'zip'            => '',
		'phone'          => '',
		'email'          => '',
		'services'       => array(),
		'trainings'      => array(),
		'dateNeeded'     => '',
		'additionalInfo' => '',
	);
	$set = function ( $key, $val ) use ( &$m ) {
		$val = trim( (string) $val );
		if ( '' !== $val && '' === $m[ $key ] ) {
			$m[ $key ] = $val;
		}
	};

	// Label rules, checked in order; first match wins ("address line 2" must precede "street").
	$rules = array(
		'firstName'      => array( 'first name' ),
		'lastName'       => array( 'last name' ),
		'companyName'    => array( 'company' ),
		'street2'        => array( 'address line 2', 'line 2', 'street address 2', 'address 2', 'suite', 'apt' ),
		'street'         => array( 'street' ),
		'city'           => array( 'city' ),
		'state'          => array( 'state', 'province' ),
		'zip'            => array( 'zip', 'postal' ),
		'phone'          => array( 'phone' ),
		'email'          => array( 'email', 'e-mail' ),
		'dateNeeded'     => array( 'date needed', 'date' ),
		'additionalInfo' => array( 'additional' ),
		'title'          => array( 'title' ),
	);

	$fields = is_array( $form ) && isset( $form['fields'] ) ? (array) $form['fields'] : ( is_object( $form ) && isset( $form->fields ) ? (array) $form->fields : array() );

	foreach ( $fields as $field ) {
		$type  = strtolower( (string) tap_ops_gf_prop( $field, 'type', '' ) );
		$label = strtolower( trim( (string) tap_ops_gf_prop( $field, 'label', '' ) ) );
		$id    = tap_ops_gf_prop( $field, 'id' );
		if ( null === $id ) {
			continue;
		}

		if ( 'name' === $type ) {
			$set( 'firstName', tap_ops_gf_val( $entry, $id . '.3' ) );
			$set( 'lastName', tap_ops_gf_val( $entry, $id . '.6' ) );
			continue;
		}
		if ( 'address' === $type ) {
			$set( 'street', tap_ops_gf_val( $entry, $id . '.1' ) );
			$set( 'street2', tap_ops_gf_val( $entry, $id . '.2' ) );
			$set( 'city', tap_ops_gf_val( $entry, $id . '.3' ) );
			$set( 'state', tap_ops_gf_val( $entry, $id . '.4' ) );
			$set( 'zip', tap_ops_gf_val( $entry, $id . '.5' ) );
			continue;
		}
		if ( 'checkbox' === $type ) {
			$picked = tap_ops_gf_checked( $field, $entry );
			$bucket = false !== strpos( $label, 'training' ) ? 'trainings' : 'services';
			$m[ $bucket ] = array_values( array_unique( array_merge( $m[ $bucket ], $picked ) ) );
			continue;
		}
		if ( in_array( $type, array( 'section', 'html', 'page', 'captcha', 'hidden' ), true ) ) {
			continue;
		}

		$value = tap_ops_gf_val( $entry, $id );
		if ( '' === $value ) {
			continue;
		}
		$matched = false;
		foreach ( $rules as $key => $needles ) {
			foreach ( $needles as $needle ) {
				if ( false !== strpos( $label, $needle ) ) {
					$set( $key, $value );
					$matched = true;
					break 2;
				}
			}
		}
		if ( ! $matched ) { // fall back on field type.
			if ( 'email' === $type ) {
				$set( 'email', $value );
			} elseif ( 'phone' === $type ) {
				$set( 'phone', $value );
			} elseif ( 'date' === $type ) {
				$set( 'dateNeeded', $value );
			} elseif ( 'textarea' === $type ) {
				$set( 'additionalInfo', $value );
			}
		}
	}

	$m['dateNeeded'] = tap_ops_gf_date( $m['dateNeeded'] );

	/**
	 * Filter the mapped request before it is stored.
	 *
	 * @param array $m     Mapped request fields.
	 * @param array $entry Gravity Forms entry.
	 * @param array $form  Gravity Forms form.
	 */
	return apply_filters( 'tap_gf_map_entry', $m, $entry, $form );
}

/** Is this the quote form? TAP_QUOTE_FORM_ID if defined, else any form titled "...quote...". */
function tap_ops_gf_is_quote_form( $form ) {
	$fid = is_array( $form ) && isset( $form['id'] ) ? $form['id'] : 0;
	if ( defined( 'TAP_QUOTE_FORM_ID' ) && '' !== (string) TAP_QUOTE_FORM_ID && 0 !== (int) TAP_QUOTE_FORM_ID ) {
		return (int) $fid === (int) TAP_QUOTE_FORM_ID;
	}
	$title = is_array( $form ) && isset( $form['title'] ) ? (string) $form['title'] : '';
	return false !== stripos( $title, 'quote' );
}

function tap_ops_gf_after_submission( $entry, $form ) {
	if ( ! is_array( $entry ) || ! is_array( $form ) || ! tap_ops_gf_is_quote_form( $form ) ) {
		return;
	}
	tap_ops_maybe_upgrade(); // make sure tables exist even if this fires before init.
	$mapped           = tap_ops_map_gf_entry( $entry, $form );
	$mapped['source'] = 'gravityforms:' . ( isset( $form['id'] ) ? (int) $form['id'] : 0 );
	// Never lose a lead: non-strict mode stores whatever is present.
	tap_ops_create_request( $mapped, false, $mapped['source'] );
}
