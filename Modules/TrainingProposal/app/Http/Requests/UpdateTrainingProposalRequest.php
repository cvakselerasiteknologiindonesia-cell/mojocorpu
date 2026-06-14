<?php

namespace Modules\TrainingProposal\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingProposalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create training proposal') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'status'         => ['nullable', 'in:draft,submitted'],
        ];
    }
}
