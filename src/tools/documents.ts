import { t } from "../i18n.js";
import type { DocumentInfo, WebDocuments } from "../api.js";
import {
  type ToolDeps,
  type ToolDefinition,
  domainSchema,
  noDataResult,
  requireString,
  requireUrl,
  resolveSite,
  textResult,
  unwrap,
} from "./common.js";

export function buildDocumentsTools(deps: ToolDeps): ToolDefinition[] {
  const lang = deps.config.lang;

  const getIndexedPages: ToolDefinition = {
    name: "get_indexed_pages",
    description:
      "Get per-category page counts for a configured site (content/redirect/index/error) plus a random sample of up to 1000 URLs per category. Calls GET /web/documents.",
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

      const res = await deps.api.getDocuments(resolved.site.apiKey);
      const unwrapped = unwrap<WebDocuments>(deps, res, domainArg.value);
      if (!unwrapped.ok) return unwrapped.result;
      if ("noData" in unwrapped) return noDataResult(deps, domainArg.value);

      const header = t(lang, "documents_header", { domain: domainArg.value });
      const body = JSON.stringify(unwrapped.data, null, 2);
      return textResult(`${header}\n\n${body}`);
    },
  };

  const getDocumentInfo: ToolDefinition = {
    name: "get_document_info",
    description:
      "Get details about a specific URL (title, meta, OpenGraph, response headers, index/error/redirect flags, timestamps). Calls GET /web/document.",
    inputSchema: {
      type: "object",
      properties: {
        domain: domainSchema,
        url: {
          type: "string",
          description: "Absolute URL of the page to inspect.",
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

      const res = await deps.api.getDocument(resolved.site.apiKey, urlArg.value);
      const unwrapped = unwrap<DocumentInfo>(deps, res, domainArg.value);
      if (!unwrapped.ok) return unwrapped.result;
      if ("noData" in unwrapped) return noDataResult(deps, domainArg.value);

      const header = t(lang, "document_detail_header", { url: urlArg.value });
      const body = JSON.stringify(unwrapped.data, null, 2);
      return textResult(`${header}\n\n${body}`);
    },
  };

  return [getIndexedPages, getDocumentInfo];
}
