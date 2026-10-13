<?php

namespace Modules\KMS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKmsAssetRequest extends FormRequest
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
            'source_urls'    => ['nullable', 'array'],
            'source_urls.*'  => ['nullable', 'url', 'max:255'],
            'source_existing_paths' => ['nullable', 'array'],
            'source_existing_paths.*' => ['nullable', 'string', 'max:255'],
            'source_existing_names' => ['nullable', 'array'],
            'source_existing_names.*' => ['nullable', 'string', 'max:255'],
            'source_files'   => ['nullable', 'array'],
            'source_files.*' => ['file', 'mimes:pdf,mp4,mov,ppt,pptx,doc,docx,jpg,jpeg,png,gif,webp', 'max:51200'],
            'visibility'     => ['nullable', 'in:internal,public'],
            'internal_scope' => ['nullable', 'in:all,selected'],
            'opd_ids'        => ['nullable', 'array'],
            'opd_ids.*'      => ['integer', 'exists:opds,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($this->input('visibility', 'internal') === 'internal'
                && $this->input('internal_scope', 'all') === 'selected'
                && count(array_filter((array) $this->input('opd_ids', []))) === 0) {
                $v->errors()->add('opd_ids', 'Pilih minimal satu OPD untuk visibilitas internal terbatas.');
            }
        });
    }
}
