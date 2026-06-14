<?php

namespace Modules\Facilitator\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFacilitatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create facilitator') ?? false;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'exists:users,id', 'unique:facilitators,user_id'],
            'facilitator_type' => ['required', 'in:internal,external'],
            'institution' => ['nullable', 'string', 'max:255'],
            'expertise' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'cv_file' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:50'],
        ];
    }
}