<?php

namespace Modules\LMS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLearningMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create lms material') ?? false;
    }

    public function rules(): array
    {
        return [
            'title'             => ['required', 'string', 'max:255'],
            'material_type'     => ['required', 'in:document,video,link'],
            'training_event_id' => ['nullable', 'exists:training_events,id'],
            'external_url'      => ['nullable', 'url', 'max:2048'],
            'file'              => ['nullable', 'file', 'mimes:pdf,mp4,mov,avi,ppt,pptx,doc,docx,jpg,jpeg,png,webp', 'max:102400'],
            'is_published'      => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (!$this->hasFile('file') && !$this->filled('external_url')) {
                $v->errors()->add('external_url', 'Harap unggah file atau masukkan URL eksternal.');
            }
        });
    }
}
