<?php

namespace Modules\TrainingEvent\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTrainingEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update training event') ?? false;
    }

    public function rules(): array
    {
        return [
            'training_proposal_id' => ['nullable', 'exists:training_proposals,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'facilitator_ids' => ['nullable', 'array'],
            'facilitator_ids.*' => ['integer', 'exists:facilitators,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'quota' => ['required', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:draft,scheduled'],
            'is_paid' => ['nullable', 'boolean'],
            'price' => ['nullable', 'integer', 'min:0', 'max:100000000', 'required_if:is_paid,true'],
        ];
    }
}
