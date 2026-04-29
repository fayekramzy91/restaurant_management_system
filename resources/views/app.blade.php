<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ app()->getLocale() == 'ar' ? 'rtl' : 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead

        <style>
            :root {
                --primary-color: #ee1d23;
                --secondary-color: #6f272a;
                --accent-color: #feca0b;
                --bg-light: #f8f9fa;
                --text-dark: #1a1a1a;
            }
            body {
                font-family: 'Cairo', sans-serif !important;
                background-color: var(--bg-light);
                color: var(--text-dark);
            }
        </style>
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
