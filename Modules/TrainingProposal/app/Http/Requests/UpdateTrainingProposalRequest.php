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
            'event'          => ['nullable', 'array'],
            'event.title'    => ['nullable', 'string', 'max:255'],
            'event.description' => ['nullable', 'string'],
            'event.location' => ['nullable', 'string', 'max:255'],
            'event.banner' => ['nullable', 'image', 'max:5120'],
            'event.banner_remove' => ['nullable', 'boolean'],
            'event.supporting_documents' => ['nullable', 'array'],
            'event.supporting_documents.*' => ['file', 'max:10240', 'mimes:pdf,xls,xlsx,jpg,jpeg,png,webp'],
            'event.remove_supporting_document_ids' => ['nullable', 'array'],
            'event.remove_supporting_document_ids.*' => ['integer', 'exists:training_event_supporting_documents,id'],
            'event.facilitator_ids' => ['required', 'array', 'min:1'],
            'event.facilitator_ids.*' => ['integer', 'exists:facilitators,id'],
            'event.target_all_opds' => ['nullable', 'boolean'],
            'event.target_opd_ids' => ['nullable', 'array'],
            'event.target_opd_ids.*' => ['integer', 'exists:opds,id'],
            'event.target_user_ids' => ['nullable', 'array'],
            'event.target_user_ids.*' => ['integer', 'exists:users,id'],
            'event.start_date' => ['nullable', 'date'],
            'event.end_date' => ['nullable', 'date', 'after_or_equal:event.start_date'],
            'event.quota' => ['nullable', 'integer', 'min:0'],
            'event.is_paid' => ['nullable', 'boolean'],
            'event.price' => ['nullable', 'integer', 'min:0', 'max:100000000', 'required_if:event.is_paid,true'],
        ];
    }
}
