import { t } from "../i18n.js";
import type { WebHistory } from "../api.js";
import {
  type ToolDeps,
  type ToolDefinition,
  domainSchema,
  noDataResult,
  requireString,
  resolveSite,
  textResult,
  unwrap,
} from "./common.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(
  args: Record<string, unknown>,
  name: string,
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  const v = args[name];
  if (v === undefined || v === null || v === "") {
    return { ok: true, value: undefined };
  }
  if (typeof v !== "string" || !DATE_RE.test(v)) {
    return { ok: false, error: name };
  }
  return { ok: true, value: v };
}

export function buildHistoryTools(deps: ToolDeps): ToolDefinition[] {
  const lang = deps.config.lang;

  const getIndexHistory: ToolDefinition = {
    name: "get_index_history",
    description:
      "Get per-day page counts history for a configured site. Categories returned by the API are named: error, downloaded (= content), redirected (= redirect), indexed (= index). Calls GET /web/documents-history.",
    inputSchema: {
      type: "object",
      properties: {
        domain: domainSchema,
        date_from: {
          type: "string",
          description: "Optional start date in YYYY-MM-DD format.",
        },
        date_to: {
          type: "string",
          description: "Optional end date in YYYY-MM-DD format.",
        },
      },
      required: ["domain"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const domainArg = requireString(args, "domain");
      if (!domainArg.ok) {
        return textResult(t(lang, "missing_param", { name: domainArg.error }), true);
      }
      const dFrom = optionalDate(args, "date_from");
      if (!dFrom.ok) {
        return textResult(
          t(lang, "invalid_date_format", { name: dFrom.error }),
          true,
        );
      }
      const dTo = optionalDate(args, "date_to");
      if (!dTo.ok) {
        return textResult(
          t(lang, "invalid_date_format", { name: dTo.error }),
          true,
        );
      }
      const resolved = resolveSite(deps, domainArg.value);
      if (!resolved.ok) return resolved.result;

      const res = await deps.api.getDocumentsHistory(
        resolved.site.apiKey,
        dFrom.value,
        dTo.value,
      );
      const unwrapped = unwrap<WebHistory[]>(deps, res, domainArg.value);
      if (!unwrapped.ok) return unwrapped.result;
      if ("noData" in unwrapped) return noDataResult(deps, domainArg.value);

      const header = t(lang, "history_header", { domain: domainArg.value });
      const body = JSON.stringify(unwrapped.data, null, 2);
      return textResult(`${header}\n\n${body}`);
    },
  };

  return [getIndexHistory];
}
