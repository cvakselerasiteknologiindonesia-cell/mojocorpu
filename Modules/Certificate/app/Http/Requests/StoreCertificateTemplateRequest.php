<?php

namespace Modules\Certificate\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCertificateTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['super-admin', 'fasilitator-internal', 'fasilitator-eksternal'])
            && ($this->user()?->can('create certificate') ?? false);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'paper_size' => ['required', Rule::in(['a4', 'letter'])],
            'orientation' => ['required', Rule::in(['landscape', 'portrait'])],
            'background_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'text_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'font_family' => ['required', 'string', 'max:80'],
            'logo_path' => ['nullable', 'string', 'max:500'],
            'background_image_path' => ['nullable', 'string', 'max:500'],
            'signature_name' => ['nullable', 'string', 'max:255'],
            'signature_title' => ['nullable', 'string', 'max:255'],
            'body_template' => ['required', 'string'],
            'description_text' => ['nullable', 'string'],
            'footer_text' => ['nullable', 'string', 'max:255'],
            'org_info' => ['nullable', 'array'],
            'org_info.*' => ['string', 'max:255'],
            'layout' => ['nullable', 'array'],
            'layout.canvas_elements' => ['nullable', 'array'],
            'layout.margin' => ['nullable', 'integer', 'min:0', 'max:120'],
            'layout.title' => ['nullable', 'string', 'max:255'],
            'layout.subtitle' => ['nullable', 'string', 'max:255'],
            'layout.recipient_label' => ['nullable', 'string', 'max:255'],
            'layout.show_logo' => ['nullable', 'boolean'],
            'layout.show_signature' => ['nullable', 'boolean'],
            'layout.border_style' => ['nullable', Rule::in(['single', 'double', 'none', 'ornate'])],
            'layout.overlay_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'layout.overlay_opacity' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'layout.text_align' => ['nullable', Rule::in(['left', 'center', 'right'])],
            'layout.text_shadow' => ['nullable', 'boolean'],
            'layout.header_layout' => ['nullable', Rule::in(['center', 'split'])],
            'layout.title_font' => ['nullable', 'string', 'max:100'],
            'layout.subtitle_font' => ['nullable', 'string', 'max:100'],
            'layout.recipient_font' => ['nullable', 'string', 'max:100'],
            'layout.recipient_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'layout.show_scores' => ['nullable', 'boolean'],
            'layout.scores' => ['nullable', 'array'],
            'layout.scores.*.label' => ['string', 'max:255'],
            'layout.scores.*.score' => ['numeric'],
            'layout.scores.*.max' => ['numeric'],
            'layout.show_location_date' => ['nullable', 'boolean'],
            'layout.location' => ['nullable', 'string', 'max:100'],
            'layout.issued_city' => ['nullable', 'string', 'max:100'],
            'is_default' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
