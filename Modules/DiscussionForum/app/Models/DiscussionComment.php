<?php

namespace Modules\DiscussionForum\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiscussionComment extends Model
{
    protected $table = 'discussion_comments';

    protected $fillable = ['thread_id', 'user_id', 'body'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(DiscussionThread::class, 'thread_id');
    }
}
