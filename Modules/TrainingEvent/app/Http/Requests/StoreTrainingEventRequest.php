<?php

namespace Modules\TrainingEvent\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create training event') ?? false;
    }

    public function rules(): array
    {
        return [
            'training_proposal_id' => ['nullable', 'exists:training_proposals,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'facilitator_ids'   => ['nullable', 'array'],
            'facilitator_ids.*' => ['integer', 'exists:facilitators,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'quota' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:draft,scheduled'],
        ];
    }
}