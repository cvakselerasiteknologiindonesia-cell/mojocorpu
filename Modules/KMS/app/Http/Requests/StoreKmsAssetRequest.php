<?php

namespace Modules\KMS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreKmsAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyPermission(['create kms asset', 'upload kms assets']) ?? false;
    }

    public function rules(): array
    {
        return [
            'category_ids'   => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:kms_categories,id'],
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'file'           => ['nullable', 'file', 'mimes:pdf,mp4,mov,ppt,pptx,doc,docx,jpg,jpeg,png,gif,webp', 'max:51200'],
            'file_path'      => ['nullable', 'string', 'max:255'],
            'visibility'     => ['nullable', 'string', 'max:50'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (!$this->hasFile('file') && !$this->filled('file_path')) {
                $v->errors()->add('file_path', 'Harap unggah file atau masukkan URL dokumen.');
            }
        });
    }
}
