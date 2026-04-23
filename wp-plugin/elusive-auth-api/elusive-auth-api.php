<?php
/**
 * Plugin Name: Elusive Racing Auth API
 * Description: Lightweight REST API endpoints for headless customer authentication and password reset.
 * Version: 1.2.0
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
