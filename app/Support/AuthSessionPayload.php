<?php

namespace App\Support;

use App\Models\User;

class AuthSessionPayload
{
    public static function user(User $user): User
    {
        return $user->refresh()->load('roles:id,name');
    }

    public static function permissions(User $user): array
    {
        return $user->getAllPermissions()
            ->pluck('name')
            ->values()
            ->all();
    }

    public static function make(string $plainTextToken, User $user, int $expiresIn = 3600): array
    {
        $loadedUser = self::user($user);

        return [
            'access_token' => $plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => $expiresIn,
            'user' => $loadedUser,
            'permissions' => self::permissions($loadedUser),
        ];
    }
}
