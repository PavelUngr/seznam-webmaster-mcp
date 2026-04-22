import { t } from "../i18n.js";
import type { Web } from "../api.js";
import {
  type ToolDeps,
  type ToolDefinition,
  apiErrorToResult,
  domainSchema,
  noDataResult,
  requireString,
  resolveSite,
  textResult,
  unwrap,
} from "./common.js";

export function buildStatusTools(deps: ToolDeps): ToolDefinition[] {
  const lang = deps.config.lang;

  const getWebStatus: ToolDefinition = {
    name: "get_web_status",
    description:
      "Get a complete overview of a configured site (page counts per category and the full indexation history). Calls GET /web on Seznam Webmaster API.",
    inputSchema: {
      type: "object",
      properties: { domain: domainSchema },
      required: ["domain"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const domainArg = requireString(args, "domain");
      if (!domainArg.ok) {
        return textResult(t(lang, "missing_param", { name: domainArg.error }), true);
      }
      const resolved = resolveSite(deps, domainArg.value);
      if (!resolved.ok) return resolved.result;

      const res = await deps.api.getWeb(resolved.site.apiKey);
      const unwrapped = unwrap<Web>(deps, res, domainArg.value);
      if (!unwrapped.ok) return unwrapped.result;
      if ("noData" in unwrapped) return noDataResult(deps, domainArg.value);

      const header = t(lang, "web_status_header", { domain: domainArg.value });
      const body = JSON.stringify(unwrapped.data, null, 2);
      return textResult(`${header}\n\n${body}`);
    },
  };

  const getDatabaseInfo: ToolDefinition = {
    name: "get_database_info",
    description:
      "Get the Seznam Webmaster database release info. Calls GET /database-info. Does not require an API key.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const res = await deps.api.getDatabaseInfo();
      if (!res.ok) return apiErrorToResult(deps, res.error, undefined);
      if ("noData" in res) {
        return textResult(
          `${t(lang, "database_info_header")}\n\n(no data)`,
        );
      }
      const header = t(lang, "database_info_header");
      const body = JSON.stringify(res.data, null, 2);
      return textResult(`${header}\n\n${body}`);
    },
  };

  return [getWebStatus, getDatabaseInfo];
}
