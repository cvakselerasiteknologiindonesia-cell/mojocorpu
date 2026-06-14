<?php

namespace App\Policies;

use App\Models\User;

class BaseCorporatePolicy
{
    public function before(User $user): ?bool
    {
        return $user->hasRole('super-admin') ? true : null;
    }
}