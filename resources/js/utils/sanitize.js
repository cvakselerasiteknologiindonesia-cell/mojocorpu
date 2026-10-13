import DOMPurify from 'dompurify';

/**
 * Sanitize untrusted HTML before rendering with dangerouslySetInnerHTML.
 * Strips script tags, event handlers, and other XSS vectors while preserving
 * safe formatting tags produced by the Tiptap rich-text editor.
 *
 * Usage:
 *   <div dangerouslySetInnerHTML={{ __html: safe(content) }} />
 */
export function safe(html) {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        // Allow common rich-text formatting tags
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'img', 'figure', 'figcaption',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span', 'hr',
            // YouTube embed iframe (controlled set)
            'iframe',
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id',
            'width', 'height', 'style',
            // iframe: only YouTube embeds
            'allowfullscreen', 'frameborder',
        ],
        // Only allow safe URL schemes
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+\-.]+(?:[^a-z+\-.]:|(?:(?!javascript:)[^?#]*(?:[?#]|$))))/i,
        // Block iframes pointing to non-YouTube origins
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
        WHOLE_DOCUMENT: false,
        RETURN_DOM: false,
    });
}
