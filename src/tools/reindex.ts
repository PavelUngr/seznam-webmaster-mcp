import { t } from "../i18n.js";
import {
  type ToolDeps,
  type ToolDefinition,
  apiErrorToResult,
  domainSchema,
  requireString,
  requireUrl,
  resolveSite,
  textResult,
} from "./common.js";

export function buildReindexTools(deps: ToolDeps): ToolDefinition[] {
  const lang = deps.config.lang;

  const reindexUrl: ToolDefinition = {
    name: "reindex_url",
    description:
      "Submit a reindex request for a specific URL. Calls POST /web/document/reindex. Requires a write-enabled API key (read-only keys return HTTP 403). Daily limit: 500 requests per key.",
    inputSchema: {
      type: "object",
      properties: {
        domain: domainSchema,
        url: {
          type: "string",
          description: "Absolute URL to submit for reindexation.",
        },
      },
      required: ["domain", "url"],
      additionalProperties: false,
    },
    handler: async (args) => {
      const domainArg = requireString(args, "domain");
      if (!domainArg.ok) {
        return textResult(t(lang, "missing_param", { name: domainArg.error }), true);
      }
      const urlArg = requireUrl(args, "url");
      if (!urlArg.ok) {
        const key = urlArg.kind === "missing" ? "missing_param" : "invalid_url";
        return textResult(t(lang, key, { name: urlArg.error }), true);
      }
      const resolved = resolveSite(deps, domainArg.value);
      if (!resolved.ok) return resolved.result;

      const res = await deps.api.reindexDocument(resolved.site.apiKey, urlArg.value);
      if (!res.ok) return apiErrorToResult(deps, res.error, domainArg.value);

      return textResult(t(lang, "reindex_ok", { url: urlArg.value }));
    },
  };

  return [reindexUrl];
}
