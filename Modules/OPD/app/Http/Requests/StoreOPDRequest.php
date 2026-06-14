<?php

namespace Modules\OPD\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOPDRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create opd') ?? false;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:100', 'unique:opds,code'],
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
        ];
    }
}