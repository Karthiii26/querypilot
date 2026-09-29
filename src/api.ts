/**
 * API client abstraction for QueryPilot.
 * Prepends VITE_API_URL to relative endpoints when configured,
 * ensuring seamless operation in both standalone static site deployment and local development.
 */

const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) {
    console.warn(
      '[QueryPilot] VITE_API_URL is not set. ' +
      'API requests will use relative paths, which only works when frontend is served by the backend. ' +
      'If deploying as a Render Static Site, set VITE_API_URL=https://querypilot-8fzz.onrender.com in your Static Site environment variables.'
    );
    return '';
  }
  return url.replace(/\/+$/, '');
};

export const API_BASE_URL = getBaseUrl();

/**
 * Resolves an API path (e.g. '/api/health') to its full URL target.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Centralized fetch helper for API requests.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const url = getApiUrl(path);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}
