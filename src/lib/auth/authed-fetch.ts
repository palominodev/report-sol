/**
 * fetch wrapper for client screens. When an /api call answers 401 (session
 * expired or account deactivated) the person is sent to /login?next=<current
 * path + query> and the returned promise never settles, so the caller never
 * sees the error body. Any other status and network errors behave like fetch.
 */
export interface AuthedFetchDeps {
  fetchFn?: typeof fetch;
  navigate?: (url: string) => void;
  currentLocation?: () => string;
}

// One redirect per page load, even with several parallel 401 responses.
let redirecting = false;

export function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  deps: AuthedFetchDeps = {},
): Promise<Response> {
  const fetchFn = deps.fetchFn ?? ((i, o) => fetch(i, o));
  const navigate = deps.navigate ?? ((url: string) => window.location.assign(url));
  const currentLocation =
    deps.currentLocation ?? (() => window.location.pathname + window.location.search);

  return fetchFn(input, init).then((response) => {
    if (response.status !== 401) return response;
    if (!redirecting) {
      redirecting = true;
      navigate('/login?next=' + encodeURIComponent(currentLocation()));
    }
    return new Promise<Response>(() => {});
  });
}
