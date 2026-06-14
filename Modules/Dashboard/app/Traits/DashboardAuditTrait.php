<?php

namespace Modules\Dashboard\Traits;

trait DashboardAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'Dashboard '.$action;
    }
}