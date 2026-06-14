<?php

use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->get('attendance/status', fn () => response()->json([
    'success' => true,
    'message' => 'Attendance module ready',
    'data' => ['module' => 'Attendance'],
]));