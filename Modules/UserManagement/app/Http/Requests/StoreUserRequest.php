<?php

namespace Modules\UserManagement\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create user') ?? false;
    }

    public function rules(): array
    {
        return [
            'sso_user_id' => ['nullable', 'string', 'max:100', 'unique:users,sso_user_id'],
            'nip' => ['nullable', 'string', 'max:32', 'unique:users,nip'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', Password::defaults()],
            'opd_id' => ['nullable', 'integer'],
            'opd_name' => ['nullable', 'string', 'max:255'],
            'organization_unit_id' => ['nullable', 'integer'],
            'organization_unit_name' => ['nullable', 'string', 'max:255'],
            'position_name' => ['nullable', 'string', 'max:255'],
            'employee_status' => ['nullable', 'string', 'max:50'],
            'user_type' => ['required', Rule::in(['asn', 'external', 'super_admin'])],
            'photo_url' => ['nullable', 'url', 'max:255'],
            'is_active' => ['boolean'],
            'roles' => ['array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ];
    }
}