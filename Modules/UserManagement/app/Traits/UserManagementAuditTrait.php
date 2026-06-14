<?php

namespace Modules\UserManagement\Traits;

trait UserManagementAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'UserManagement '.$action;
    }
}