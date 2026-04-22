export const API_BASE = "https://reporter.seznam.cz/wm-api";

export interface WebUrl {
  count: number;
  urls: string[];
}

export interface WebDocuments {
  content: WebUrl;
  redirect: WebUrl;
  index: WebUrl;
  error: WebUrl;
}

export interface WebHistoryCounts {
  error: number;
  downloaded: number;
  redirected: number;
  indexed: number;
}

export interface WebHistory {
  date: string;
  counts: WebHistoryCounts;
}

export interface Web {
  documents: WebDocuments;
  history: WebHistory[];
}

export interface DocumentMeta {
  author: string;
  desc: string;
  keywords: string;
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
  responseHeaders: Array<{ name: string; value: string }>;
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
  | "missing_key"
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

const RATE_LIMIT_BACKOFFS_MS = [500, 1000, 2000];
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

async function readErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    if (text === "") return undefined;
    try {
      const parsed = JSON.parse(text) as Partial<ProblemResult>;
      const parts = [parsed.title, parsed.description].filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      );
      if (parts.length > 0) return parts.join(" — ");
    } catch {
      // not JSON, fall through
    }
    return text.slice(0, 500);
  } catch {
    return undefined;
  }
}

export class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
    const method = options.method ?? "GET";
    const maxRetries = options.retries ?? RATE_LIMIT_BACKOFFS_MS.length;

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
        return {
          ok: false,
          error: new ApiError({
            kind: "network",
            message: isTimeout
              ? `Request timed out after ${timeoutMs} ms`
              : e.message,
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

      if (res.status === 429 && attempt < maxRetries) {
        const delay = RATE_LIMIT_BACKOFFS_MS[attempt] ?? 2000;
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
    case 400:
      return "missing_key";
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
      return "generic";
  }
}
