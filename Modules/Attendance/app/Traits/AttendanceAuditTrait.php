<?php

namespace Modules\Attendance\Traits;

trait AttendanceAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'Attendance '.$action;
    }
}