<?php

namespace Modules\OPD\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OPD extends Model
{
    protected $table = 'opds';

    protected $fillable = ['uuid', 'code', 'name', 'address', 'phone', 'email', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}