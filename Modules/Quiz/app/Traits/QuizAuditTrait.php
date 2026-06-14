<?php

namespace Modules\Quiz\Traits;

trait QuizAuditTrait
{
    protected function auditDescription(string $action): string
    {
        return 'Quiz '.$action;
    }
}