<?php

namespace Modules\Notification\Traits;

trait NotificationAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'Notification '.$action;
    }
}