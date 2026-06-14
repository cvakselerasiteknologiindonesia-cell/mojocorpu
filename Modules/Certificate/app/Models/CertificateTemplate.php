<?php

namespace Modules\Certificate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use App\Models\User;

class CertificateTemplate extends Model
{
    protected $table = 'certificate_templates';

    protected $fillable = [
        'uuid',
        'created_by',
        'name',
        'description',
        'paper_size',
        'orientation',
        'background_color',
        'accent_color',
        'text_color',
        'font_family',
        'logo_path',
        'background_image_path',
        'signature_name',
        'signature_title',
        'body_template',
        'description_text',
        'footer_text',
        'org_info',
        'layout',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'layout' => 'array',
        'org_info' => 'array',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
