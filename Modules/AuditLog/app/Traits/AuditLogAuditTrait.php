<?php

namespace Modules\AuditLog\Traits;

trait AuditLogAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'AuditLog '.$action;
    }
}