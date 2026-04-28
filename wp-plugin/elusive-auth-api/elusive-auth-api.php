<?php
/**
 * Plugin Name: Elusive Racing Auth API
 * Description: Lightweight REST API endpoints for headless customer authentication, password reset, and the vehicle_fitment taxonomy used by the React vehicle selector.
 * Version: 1.3.0
 * Author: Elusive Racing
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('elusive/v1', '/login', [
        'methods'             => 'POST',
        'callback'            => 'elusive_auth_login',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/verify', [
        'methods'             => 'POST',
        'callback'            => 'elusive_auth_verify',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/lost-password', [
        'methods'             => 'POST',
        'callback'            => 'elusive_auth_lost_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/reset-password', [
        'methods'             => 'POST',
        'callback'            => 'elusive_auth_reset_password',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/vehicles/makes', [
        'methods'             => 'GET',
        'callback'            => 'elusive_vehicles_makes',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/vehicles/models', [
        'methods'             => 'GET',
        'callback'            => 'elusive_vehicles_models',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/vehicles/submodels', [
        'methods'             => 'GET',
        'callback'            => 'elusive_vehicles_submodels',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('elusive/v1', '/vehicles/term/(?P<id>\d+)', [
        'methods'             => 'GET',
        'callback'            => 'elusive_vehicles_term',
        'permission_callback' => '__return_true',
    ]);
});

function elusive_auth_login(WP_REST_Request $request) {
    $username = sanitize_text_field($request->get_param('username'));
    $password = $request->get_param('password');

    if (empty($username) || empty($password)) {
        return new WP_REST_Response([
            'code'    => 'missing_fields',
            'message' => 'Username and password are required.',
        ], 400);
    }

    $user = wp_authenticate($username, $password);

    if (is_wp_error($user)) {
        return new WP_REST_Response([
            'code'    => 'invalid_credentials',
            'message' => 'Invalid email or password.',
        ], 401);
    }

    // Build a simple signed token (WordPress auth salt is already available at runtime)
    $payload   = $user->ID . '|' . time();
    $signature = hash_hmac('sha256', $payload, wp_salt('auth'));
    $token     = base64_encode($payload . '|' . $signature);

    return new WP_REST_Response([
        'token'             => $token,
        'user_id'           => $user->ID,
        'user_email'        => $user->user_email,
        'user_display_name' => $user->display_name,
    ], 200);
}

// Validate a token issued by /elusive/v1/login and return the matching user.
// Inverse of the token construction in elusive_auth_login(): base64-decode,
// split on "|", and HMAC-verify against wp_salt('auth').
function elusive_auth_verify(WP_REST_Request $request) {
    $token = (string) $request->get_param('token');
    if ($token === '') {
        $auth = (string) $request->get_header('authorization');
        if ($auth !== '' && stripos($auth, 'Bearer ') === 0) {
            $token = trim(substr($auth, 7));
        }
    }
    if ($token === '') {
        return new WP_REST_Response([
            'code'    => 'missing_token',
            'message' => 'Token is required.',
        ], 400);
    }

    $decoded = base64_decode($token, true);
    if ($decoded === false) {
        return new WP_REST_Response([
            'code'    => 'invalid_token',
            'message' => 'Invalid token.',
        ], 401);
    }

    $parts = explode('|', $decoded);
    if (count($parts) !== 3) {
        return new WP_REST_Response([
            'code'    => 'invalid_token',
            'message' => 'Invalid token.',
        ], 401);
    }

    list($user_id, $timestamp, $signature) = $parts;
    $payload  = $user_id . '|' . $timestamp;
    $expected = hash_hmac('sha256', $payload, wp_salt('auth'));

    if (!hash_equals($expected, (string) $signature)) {
        return new WP_REST_Response([
            'code'    => 'invalid_token',
            'message' => 'Invalid token.',
        ], 401);
    }

    $user = get_userdata((int) $user_id);
    if (!$user) {
        return new WP_REST_Response([
            'code'    => 'invalid_token',
            'message' => 'User not found.',
        ], 401);
    }

    return new WP_REST_Response([
        'user_id'    => (int) $user->ID,
        'user_email' => $user->user_email,
    ], 200);
}

// Request a password reset email. Always returns 200 so the endpoint
// cannot be used to enumerate which emails belong to real accounts.
function elusive_auth_lost_password(WP_REST_Request $request) {
    $email = sanitize_email($request->get_param('email'));

    if (!empty($email) && is_email($email)) {
        $user = get_user_by('email', $email);
        if ($user) {
            // retrieve_password() generates a reset key, stores it, and sends
            // the standard WP password-reset email. The retrieve_password_message
            // filter below rewrites the link to point at the React frontend.
            retrieve_password($user->user_login);
        }
    }

    return new WP_REST_Response(['ok' => true], 200);
}

// Consume a reset key + login from the email and set a new password.
function elusive_auth_reset_password(WP_REST_Request $request) {
    $key      = (string) $request->get_param('key');
    $login    = (string) $request->get_param('login');
    $password = (string) $request->get_param('password');

    if ($key === '' || $login === '' || $password === '') {
        return new WP_REST_Response([
            'code'    => 'missing_fields',
            'message' => 'Reset key, login and new password are all required.',
        ], 400);
    }

    if (strlen($password) < 8) {
        return new WP_REST_Response([
            'code'    => 'weak_password',
            'message' => 'Password must be at least 8 characters.',
        ], 400);
    }

    $user = check_password_reset_key($key, $login);
    if (is_wp_error($user)) {
        return new WP_REST_Response([
            'code'    => 'invalid_key',
            'message' => 'This reset link is invalid or has expired. Please request a new one.',
        ], 400);
    }

    reset_password($user, $password);

    return new WP_REST_Response(['ok' => true], 200);
}

// Rewrite the password-reset email body so the link lands on the React
// frontend instead of the WP theme's /my-account/reset-password page.
// The frontend URL is taken from the `elusive_frontend_url` WP option;
// falls back to site_url() if unset.
add_filter('retrieve_password_message', function ($message, $key, $user_login, $user_data) {
    $frontend = rtrim((string) get_option('elusive_frontend_url', site_url()), '/');
    $url = $frontend
        . '/my-account/reset-password?key=' . rawurlencode($key)
        . '&login=' . rawurlencode($user_login);

    $site_name = wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);

    $out  = "Hi " . $user_login . ",\n\n";
    $out .= "Someone requested a password reset for your " . $site_name . " account.\n\n";
    $out .= "If this wasn't you, you can safely ignore this email — your password will stay the same.\n\n";
    $out .= "To choose a new password, visit the link below:\n";
    $out .= $url . "\n";
    return $out;
}, 10, 4);

add_filter('retrieve_password_title', function ($title) {
    $site_name = wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);
    return '[' . $site_name . '] Reset your password';
}, 10, 1);

// ---------------------------------------------------------------------------
// Vehicle fitment taxonomy
// ---------------------------------------------------------------------------
// The live site stores Make/Model/Submodel as a 3-level hierarchical custom
// taxonomy named `vehicle_fitment`. The taxonomy is registered by a separate
// plugin on the production server. These routes expose its terms as a public
// read-only API so the React frontend can populate the vehicle selector.

const ELUSIVE_VEHICLE_TAXONOMY = 'vehicle_fitment';

function elusive_vehicles_format_term($term) {
    return [
        'id'     => (int) $term->term_id,
        'name'   => $term->name,
        'slug'   => $term->slug,
        'parent' => (int) $term->parent,
    ];
}

function elusive_vehicles_taxonomy_missing_response() {
    return new WP_REST_Response([
        'code'    => 'taxonomy_missing',
        'message' => 'vehicle_fitment taxonomy is not registered on this site.',
    ], 404);
}

function elusive_vehicles_children(int $parent_id) {
    if (!taxonomy_exists(ELUSIVE_VEHICLE_TAXONOMY)) {
        return elusive_vehicles_taxonomy_missing_response();
    }

    $terms = get_terms([
        'taxonomy'   => ELUSIVE_VEHICLE_TAXONOMY,
        'parent'     => $parent_id,
        'hide_empty' => false,
        'orderby'    => 'name',
        'order'      => 'ASC',
    ]);

    if (is_wp_error($terms)) {
        return new WP_REST_Response([
            'code'    => 'terms_query_failed',
            'message' => $terms->get_error_message(),
        ], 500);
    }

    return new WP_REST_Response(array_map('elusive_vehicles_format_term', $terms), 200);
}

function elusive_vehicles_makes(WP_REST_Request $request) {
    return elusive_vehicles_children(0);
}

function elusive_vehicles_models(WP_REST_Request $request) {
    $make_id = (int) $request->get_param('make_id');
    if ($make_id <= 0) {
        return new WP_REST_Response([
            'code'    => 'missing_make_id',
            'message' => 'make_id is required.',
        ], 400);
    }
    return elusive_vehicles_children($make_id);
}

function elusive_vehicles_submodels(WP_REST_Request $request) {
    $model_id = (int) $request->get_param('model_id');
    if ($model_id <= 0) {
        return new WP_REST_Response([
            'code'    => 'missing_model_id',
            'message' => 'model_id is required.',
        ], 400);
    }
    return elusive_vehicles_children($model_id);
}

// Resolve a single term and its ancestor chain (root → self). Used by the
// React Go button to build the slug path /shop?vehicle_make=…&vehicle_model=…
// without making three extra round-trips.
function elusive_vehicles_term(WP_REST_Request $request) {
    if (!taxonomy_exists(ELUSIVE_VEHICLE_TAXONOMY)) {
        return elusive_vehicles_taxonomy_missing_response();
    }

    $id   = (int) $request->get_param('id');
    $term = get_term($id, ELUSIVE_VEHICLE_TAXONOMY);

    if (!$term || is_wp_error($term)) {
        return new WP_REST_Response([
            'code'    => 'term_not_found',
            'message' => 'Vehicle term not found.',
        ], 404);
    }

    $ancestor_ids = get_ancestors($term->term_id, ELUSIVE_VEHICLE_TAXONOMY, 'taxonomy');
    // get_ancestors() returns immediate-parent first; reverse so the path
    // reads root → parent.
    $ancestor_ids = array_reverse($ancestor_ids);

    $ancestors = [];
    foreach ($ancestor_ids as $aid) {
        $a = get_term($aid, ELUSIVE_VEHICLE_TAXONOMY);
        if ($a && !is_wp_error($a)) {
            $ancestors[] = elusive_vehicles_format_term($a);
        }
    }

    return new WP_REST_Response(array_merge(elusive_vehicles_format_term($term), [
        'link'      => get_term_link($term),
        'ancestors' => $ancestors,
    ]), 200);
}

// Inject vehicle_fitment terms into every WC REST product response so the
// search-server sync can index Make/Model/Submodel slugs as filterable
// attributes. Each entry includes its ancestor chain (root → parent) so
// sync can derive make/model slugs from a deeper assignment without
// looking up parents itself.
add_filter('woocommerce_rest_prepare_product_object', function ($response, $object, $request) {
    if (!taxonomy_exists(ELUSIVE_VEHICLE_TAXONOMY)) {
        return $response;
    }
    $terms = wp_get_post_terms($object->get_id(), ELUSIVE_VEHICLE_TAXONOMY, ['fields' => 'all']);
    if (is_wp_error($terms)) {
        return $response;
    }
    $data = $response->get_data();
    $data['vehicle_fitment'] = array_map(function ($t) {
        $aids = get_ancestors($t->term_id, ELUSIVE_VEHICLE_TAXONOMY, 'taxonomy');
        // get_ancestors() returns immediate-parent first; reverse so the path reads root → parent.
        $aids = array_reverse($aids);
        $ancestors = [];
        foreach ($aids as $aid) {
            $a = get_term($aid, ELUSIVE_VEHICLE_TAXONOMY);
            if ($a && !is_wp_error($a)) {
                $ancestors[] = [
                    'id'   => (int) $a->term_id,
                    'name' => $a->name,
                    'slug' => $a->slug,
                ];
            }
        }
        return [
            'id'        => (int) $t->term_id,
            'name'      => $t->name,
            'slug'      => $t->slug,
            'parent'    => (int) $t->parent,
            'ancestors' => $ancestors,
        ];
    }, $terms);
    $response->set_data($data);
    return $response;
}, 10, 3);
