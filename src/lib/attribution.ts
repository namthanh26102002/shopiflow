// Traffic source + device detection for analytics (no personal data collected).

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  device_type: string;
}

export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
};

/** Human-readable source of the visit, derived from utm params or the referring host. */
export const getReferrerLabel = (): string | null => {
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (host === window.location.hostname) return null;
    return host;
  } catch {
    return null;
  }
};

export const getAttribution = (): Attribution => {
  const params = new URLSearchParams(window.location.search);
  const clean = (v: string | null) => {
    const t = v?.trim();
    return t ? t.slice(0, 120) : null;
  };
  return {
    utm_source: clean(params.get('utm_source')),
    utm_medium: clean(params.get('utm_medium')),
    utm_campaign: clean(params.get('utm_campaign')),
    referrer: getReferrerLabel(),
    device_type: getDeviceType(),
  };
};

/** Best single label for where a session came from. */
export const sourceLabel = (a: {
  utm_source?: string | null;
  referrer?: string | null;
}): string => a.utm_source || a.referrer || 'Direct';
