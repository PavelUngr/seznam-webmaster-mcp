import type { AppConfig, SiteConfig } from "../config.js";
import { findSite } from "../config.js";
import type { ApiClient, ApiError, ApiResult } from "../api.js";
import { t } from "../i18n.js";

export interface ToolDeps {
  config: AppConfig;
  api: ApiClient;
}

export interface ToolTextContent {
  type: "text";
  text: string;
}

export interface ToolResult {
  content: ToolTextContent[];
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export function textResult(text: string, isError = false): ToolResult {
  return { content: [{ type: "text", text }], isError };
}

export function requireString(
  args: Record<string, unknown>,
  name: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const v = args[name];
  if (typeof v !== "string" || v.trim() === "") {
    return { ok: false, error: name };
  }
  return { ok: true, value: v.trim() };
}

export function resolveSite(
  deps: ToolDeps,
  domain: string,
): { ok: true; site: SiteConfig } | { ok: false; result: ToolResult } {
  const site = findSite(deps.config, domain);
  if (!site) {
    return {
      ok: false,
      result: textResult(
        t(deps.config.lang, "domain_not_configured", { domain }),
        true,
      ),
    };
  }
  return { ok: true, site };
}

export function apiErrorToResult(
  deps: ToolDeps,
  error: ApiError,
  domain: string | undefined,
): ToolResult {
  const lang = deps.config.lang;
  switch (error.kind) {
    case "missing_key":
      return textResult(t(lang, "api_400_missing_key"), true);
    case "bad_key":
      return textResult(
        t(lang, "api_401_bad_key", { domain: domain ?? "" }),
        true,
      );
    case "forbidden":
      return textResult(t(lang, "api_403_forbidden"), true);
    case "not_found":
      return textResult(t(lang, "api_404_not_found"), true);
    case "rate_limited":
      return textResult(t(lang, "api_429_rate_limited"), true);
    case "service_unavailable":
      return textResult(
        t(lang, "api_5xx_unavailable", { status: error.status ?? 0 }),
        true,
      );
    case "network":
      return textResult(
        t(lang, "api_network_error", { message: error.message }),
        true,
      );
    case "invalid_json":
      return textResult(
        t(lang, "api_invalid_json", { message: error.message }),
        true,
      );
    default:
      return textResult(
        t(lang, "api_error_generic", {
          status: error.status ?? 0,
          statusText: error.statusText ?? "",
          detail: error.detail ?? "",
        }),
        true,
      );
  }
}

export function noDataResult(deps: ToolDeps, domain: string): ToolResult {
  return textResult(
    t(deps.config.lang, "no_data_yet", { domain }),
    false,
  );
}

export function unwrap<T>(
  deps: ToolDeps,
  result: ApiResult<T>,
  domain: string | undefined,
): { ok: true; data: T } | { ok: true; noData: true } | { ok: false; result: ToolResult } {
  if (result.ok) {
    if ("noData" in result) {
      return { ok: true, noData: true };
    }
    return { ok: true, data: result.data };
  }
  return { ok: false, result: apiErrorToResult(deps, result.error, domain) };
}

export const domainSchema = {
  type: "string",
  description:
    "Domain of the configured site (e.g. example.cz). Must match one of the entries in SEZNAM_WM_SITES.",
} as const;
