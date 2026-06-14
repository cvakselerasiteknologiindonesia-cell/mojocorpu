<?php

namespace Modules\Achievement\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Badge extends Model
{
    protected $fillable = [
        'name', 'slug', 'description', 'icon', 'color', 'background',
        'tier', 'criteria_type', 'criteria_value', 'is_active', 'sort_order',
    ];

    protected $casts = ['is_active' => 'boolean', 'criteria_value' => 'integer'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\User::class, 'user_badges')
            ->withPivot('awarded_at')
            ->withTimestamps();
    }
}
