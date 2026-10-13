<?php

namespace Modules\Settings\Models;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class AppSetting extends Model
{
    protected $table = 'app_settings';

    protected $fillable = ['key', 'value', 'group', 'is_secret'];

    protected $casts = ['is_secret' => 'boolean'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $row = static::where('key', $key)->first();
        if (! $row) {
            return $default;
        }

        if ($row->is_secret && $row->value) {
            try {
                return Crypt::decryptString($row->value);
            } catch (DecryptException) {
                // nilai lama belum terenkripsi — kembalikan plain dan re-enkripsi
                static::where('key', $key)->update(['value' => Crypt::encryptString($row->value)]);

                return $row->value;
            }
        }

        return $row->value ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        $row = static::where('key', $key)->first();

        $stored = ($row?->is_secret && $value !== null && $value !== '')
            ? Crypt::encryptString((string) $value)
            : $value;

        static::where('key', $key)->update(['value' => $stored]);
    }
}
