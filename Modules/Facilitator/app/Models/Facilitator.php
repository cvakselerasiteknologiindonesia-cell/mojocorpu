<?php

namespace Modules\Facilitator\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Facilitator extends Model
{
    protected $table = 'facilitators';

    protected $fillable = ['uuid', 'user_id', 'facilitator_type', 'institution', 'expertise', 'bio', 'cv_file', 'status'];

    protected $casts = [];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });

        static::created(function (Facilitator $facilitator): void {
            $role = $facilitator->facilitator_type === 'internal'
                ? 'fasilitator-internal'
                : 'fasilitator-eksternal';

            $facilitator->user?->assignRole($role);
        });

        static::deleted(function (Facilitator $facilitator): void {
            $facilitator->user?->removeRole('fasilitator-internal');
            $facilitator->user?->removeRole('fasilitator-eksternal');
        });
    }
}