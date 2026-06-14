<?php

namespace Modules\LMS\Traits;

trait LMSAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'LMS '.$action;
    }
}