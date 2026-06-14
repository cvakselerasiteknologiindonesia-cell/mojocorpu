<?php

namespace Modules\DiscussionForum\Traits;

trait DiscussionForumAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'DiscussionForum '.$action;
    }
}