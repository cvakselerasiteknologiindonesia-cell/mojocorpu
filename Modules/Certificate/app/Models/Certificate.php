<?php

namespace Modules\Certificate\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Certificate extends Model
{
    protected $table = 'certificates';

    protected $fillable = [
        'uuid',
        'user_id',
        'training_event_id',
        'learning_path_id',
        'certificate_template_id',
        'certificate_number',
        'verification_token',
        'file_path',
        'issued_at',
    ];

    protected $casts = ['issued_at' => 'datetime'];

    protected static function booted(): void
    {
        static::creating(function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
            $model->verification_token ??= Str::random(48);
        });
    }

    public function user()
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    public function event()
    {
        return $this->belongsTo(\Modules\TrainingEvent\Models\TrainingEvent::class, 'training_event_id');
    }

    public function learningPath()
    {
        return $this->belongsTo(\App\Models\LearningPath::class, 'learning_path_id');
    }

    public function template()
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }
}
