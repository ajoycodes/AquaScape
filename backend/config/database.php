<?php

return [

    'default' => env('DB_CONNECTION', 'oracle'),

    'connections' => [

        'oracle' => [
            'driver'         => 'oracle',
            'tns'            => env('DB_TNS', ''),
            'host'           => env('DB_HOST', 'oracle'),
            'port'           => env('DB_PORT', '1521'),
            'database'       => env('DB_DATABASE', 'XE'),
            'service_name'   => env('DB_SERVICE_NAME', 'XE'),
            'username'       => env('DB_USERNAME', 'AQUASCAPE'),
            'password'       => env('DB_PASSWORD', 'AquaScape123'),
            'charset'        => env('DB_CHARSET', 'AL32UTF8'),
            'prefix'         => env('DB_PREFIX', ''),
            'prefix_schema'  => env('DB_SCHEMA_PREFIX', ''),
            'edition'        => env('DB_EDITION', 'ora$base'),
            'server_version' => '21c',
            'load_balance'   => 'yes',
        ],

    ],

    'migrations' => 'migrations',

];
