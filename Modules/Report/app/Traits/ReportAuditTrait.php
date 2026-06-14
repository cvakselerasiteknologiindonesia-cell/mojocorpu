<?php

namespace Modules\Report\Traits;

trait ReportAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'Report '.$action;
    }
}