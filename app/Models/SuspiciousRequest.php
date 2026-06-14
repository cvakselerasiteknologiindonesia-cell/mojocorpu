<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuspiciousRequest extends Model
{
    protected $fillable = [
        'ip_address', 'method', 'path', 'user_agent',
        'attack_type', 'severity', 'pattern_matched', 'payload_snippet',
    ];
}
