export type ClientMeta = {
  userAgent: string | null;
  timezone: string | null;
  locale: string | null;
  routeOrOrigin: string | null;
};

export function getClientMeta(routeOrOrigin?: string): ClientMeta {
  if (typeof window === 'undefined') {
    return {
      userAgent: null,
      timezone: null,
      locale: null,
      routeOrOrigin: routeOrOrigin ?? null,
    };
  }

  return {
    userAgent: window.navigator.userAgent ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    locale: window.navigator.language ?? null,
    routeOrOrigin: routeOrOrigin ?? window.location.pathname,
  };
}

