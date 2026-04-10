<?php
/**
 * Plugin Name: Elusive Racing Auth API
 * Description: Lightweight REST API endpoint for headless customer authentication. No wp-config.php changes needed.
 * Version: 1.0.0
 * Author: Elusive Racing
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('elusive/v1', '/login', [
        'methods'             => 'POST',
        'callback'            => 'elusive_auth_login',
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
