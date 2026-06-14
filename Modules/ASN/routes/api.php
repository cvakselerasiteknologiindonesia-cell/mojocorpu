<?php

use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('asn/status', fn () => response()->json([
    'success' => true,
    'message' => 'ASN module ready',
    'data' => ['module' => 'ASN'],
]));