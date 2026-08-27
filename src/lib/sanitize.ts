import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows basic formatting tags from the rich text editor.
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'span', 'br', 'p', 'div',
      'h1', 'h2', 'h3', 'h4', 'a', 'img', 'blockquote', 's', 'code', 'hr', 'pre', 'figure', 'figcaption', 'iframe', 'video'],
    ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'target', 'allow', 'allowfullscreen', 'autoplay', 'loop', 'muted', 'playsinline', 'controls'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style'],
  });
};

/**
 * Sanitize SVG content to prevent XSS via SVG injection.
 * Only allows safe SVG elements and attributes.
 */
export const sanitizeSvg = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [
      'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
      'ellipse', 'g', 'defs', 'clipPath', 'use', 'text', 'tspan',
    ],
    ALLOWED_ATTR: [
      'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width',
      'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'rx', 'ry',
      'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'class',
      'xmlns', 'opacity', 'fill-opacity', 'stroke-opacity', 'none',
      'clip-path', 'id', 'href',
    ],
    ALLOW_DATA_ATTR: false,
  });
};
