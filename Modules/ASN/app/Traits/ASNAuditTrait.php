<?php

namespace Modules\ASN\Traits;

trait ASNAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'ASN '.$action;
    }
}