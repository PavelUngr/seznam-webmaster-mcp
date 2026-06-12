export const API_BASE = "https://reporter.seznam.cz/wm-api";

export interface WebUrl {
  count: number;
  urls: string[];
}

// Note on type completeness: Seznam Webmaster API's live payload is wider
// than the published Swagger spec. We keep the spec fields as required and
// document the extra fields observed in the wild as optional. Future drift
// is expected — see docs/gotchas.md for the rationale.

export interface WebDocuments {
  content: WebUrl;
  redirect: WebUrl;
  index: WebUrl;
  error: WebUrl;
  /** Live API: total document count across all categories. Not in Swagger spec. */
  doc_count?: number;
}

export interface WebHistoryCounts {
  error: number;
  downloaded: number;
  redirected: number;
  indexed: number;
  /** Live API: same as downloaded (label alias). Not in Swagger spec. */
  content?: number;
  /** Live API: total document count for the day. Not in Swagger spec. */
  doc_count?: number;
}

export interface WebHistory {
  date: string;
  counts: WebHistoryCounts;
}

export interface Web {
  documents: WebDocuments;
  history: WebHistory[];
  /** Live API: reported web server identifier (e.g. nginx). Not in Swagger spec. */
  webserver?: string;
}

export interface DocumentMeta {
  author: string;
  desc: string;
  keywords: string;
}

export interface ResponseHeader {
  name: string;
  /** Swagger spec: header value as `value`. */
  value?: string;
  /** Live API sometimes uses `content` instead of (or alongside) `value`. */
  content?: string;
}

export interface DocumentInfo {
  title: string;
  url: string;
  indexTimestamp: number;
  downloadTimestamp: number;
  isIndexed: boolean;
  isError: boolean;
  isRedirect: boolean;
  meta: DocumentMeta;
  openGraphData: Array<{ name: string; content: string }>;
  responseHeaders: ResponseHeader[];
}

export interface DatabaseInfo {
  release: string;
}

export interface ProblemResult {
  title: string;
  description: string;
  type: string;
  status: number;
}

export type ApiErrorKind =
  | "bad_key"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "service_unavailable"
  | "network"
  | "invalid_json"
  | "generic";

export interface ApiErrorShape {
  kind: ApiErrorKind;
  status?: number;
  statusText?: string;
  detail?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly statusText?: string;
  readonly detail?: string;

  constructor(shape: ApiErrorShape) {
    super(shape.message ?? shape.detail ?? shape.kind);
    this.name = "ApiError";
    this.kind = shape.kind;
    this.status = shape.status;
    this.statusText = shape.statusText;
    this.detail = shape.detail;
  }
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: true; noData: true }
  | { ok: false; error: ApiError };

interface RequestOptions {
  method?: "GET" | "POST";
  apiKey?: string;
  query?: Record<string, string | undefined>;
  retries?: number;
  timeoutMs?: number;
}

const RETRY_BACKOFFS_MS = [500, 1000, 2000];
const RETRYABLE_STATUSES = new Set<number>([429, 502, 503]);
const DEFAULT_TIMEOUT_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(
  path: string,
  query: Record<string, string | undefined> | undefined,
  apiKey: string | undefined,
): string {
  const url = new URL(API_BASE + path);
  if (apiKey !== undefined) {
    url.searchParams.set("key", apiKey);
  }
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, v);
      }
    }
  }
  return url.toString();
}

/**
 * Scrub anything that looks like an API key from a detail string before it
 * reaches the MCP client. Upstream proxies (Cloudflare challenge pages etc.)
 * can echo the request URL back in their HTML body, and that URL contains
 * `?key=...` from our authentication. We must never leak that.
 *
 * Redacts:
 * - `key=<value>` in query-style strings (stops at `&`, whitespace, quote, angle bracket, or end)
 * - `"key":"<value>"` in JSON-like structures
 */
export function redactApiKey(input: string): string {
  if (!input) return input;
  return input
    .replace(/([?&])key=[^&\s"'<>]+/gi, "$1key=REDACTED")
    .replace(/"key"\s*:\s*"[^"]*"/gi, '"key":"REDACTED"');
}

async function readErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (text === "") return undefined;
    try {
      const parsed = JSON.parse(text) as Partial<ProblemResult>;
      const parts = [parsed.title, parsed.description].filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      );
      if (parts.length > 0) return redactApiKey(parts.join(" — "));
    } catch {
      // not JSON, fall through
    }
    return redactApiKey(text.slice(0, 500));
  } catch {
    return undefined;
  }
}

export class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const method = options.method ?? "GET";
    const maxRetries = options.retries ?? RETRY_BACKOFFS_MS.length;

    let attempt = 0;
    while (true) {
      const url = buildUrl(path, options.query, options.apiKey);

      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const e = err as Error;
        const isTimeout =
          e.name === "TimeoutError" ||
          e.name === "AbortError" ||
          (e as { code?: string }).code === "ABORT_ERR";
        // fetch() error messages from Node can include the request URL
        // (DNS failures, TLS errors). The URL contains ?key=... so we must
        // redact before propagating, same as readErrorDetail does.
        const rawMessage = isTimeout
          ? `Request timed out after ${timeoutMs} ms`
          : e.message;
        return {
          ok: false,
          error: new ApiError({
            kind: "network",
            message: redactApiKey(rawMessage),
          }),
        };
      }

      if (res.status === 200) {
        if (method === "POST") {
          // reindex: empty body, just success
          return { ok: true, data: undefined as unknown as T };
        }
        const text = await res.text();
        if (text.trim() === "") {
          return { ok: true, noData: true };
        }
        try {
          return { ok: true, data: JSON.parse(text) as T };
        } catch (err) {
          return {
            ok: false,
            error: new ApiError({
              kind: "invalid_json",
              message: (err as Error).message,
            }),
          };
        }
      }

      if (res.status === 204) {
        return { ok: true, noData: true };
      }

      // Retry on transient failures: rate limit (429) and upstream outages
      // (502 Bad Gateway, 503 Service Unavailable). Seznam's docs classify
      // 5xx as "služba je mimo provoz" but many occurrences are short CDN
      // or load-balancer glitches that resolve within seconds.
      if (RETRYABLE_STATUSES.has(res.status) && attempt < maxRetries) {
        const delay = RETRY_BACKOFFS_MS[attempt] ?? 2000;
        attempt += 1;
        await sleep(delay);
        continue;
      }

      const detail = await readErrorDetail(res);
      const shape: ApiErrorShape = {
        kind: mapStatusToKind(res.status),
        status: res.status,
        statusText: res.statusText,
        detail,
      };
      return { ok: false, error: new ApiError(shape) };
    }
  }

  getWeb(apiKey: string): Promise<ApiResult<Web>> {
    return this.request<Web>("/web", { apiKey });
  }

  getDocuments(apiKey: string): Promise<ApiResult<WebDocuments>> {
    return this.request<WebDocuments>("/web/documents", { apiKey });
  }

  getDocumentsHistory(
    apiKey: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<ApiResult<WebHistory[]>> {
    return this.request<WebHistory[]>("/web/documents-history", {
      apiKey,
      query: { date_from: dateFrom, date_to: dateTo },
    });
  }

  getDocument(apiKey: string, url: string): Promise<ApiResult<DocumentInfo>> {
    return this.request<DocumentInfo>("/web/document", {
      apiKey,
      query: { url },
    });
  }

  reindexDocument(apiKey: string, url: string): Promise<ApiResult<void>> {
    return this.request<void>("/web/document/reindex", {
      method: "POST",
      apiKey,
      query: { url },
    });
  }

  getDatabaseInfo(): Promise<ApiResult<DatabaseInfo>> {
    return this.request<DatabaseInfo>("/database-info");
  }
}

function mapStatusToKind(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return "bad_key";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 429:
      return "rate_limited";
    case 502:
    case 503:
      return "service_unavailable";
    default:
      // 400 and any other status code falls through to generic, so the
      // user sees the actual detail from Seznam instead of a hardcoded
      // "missing API key" message that would be wrong — the client
      // always sends ?key= (validated at config load), so a real
      // "missing key" 400 can't happen from our side.
      return "generic";
  }
}
