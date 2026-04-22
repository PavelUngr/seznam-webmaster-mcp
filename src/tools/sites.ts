import { t } from "../i18n.js";
import {
  type ToolDeps,
  type ToolDefinition,
  textResult,
} from "./common.js";

export function buildSitesTools(deps: ToolDeps): ToolDefinition[] {
  const lang = deps.config.lang;

  const listSites: ToolDefinition = {
    name: "list_sites",
    description:
      "List all sites configured via SEZNAM_WM_SITES. Only domain names are returned — API keys are never exposed.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: async () => {
      const sites = deps.config.sites;
      if (sites.length === 0) {
        return textResult(t(lang, "no_sites_configured"), false);
      }
      const header = t(lang, "sites_header", { count: sites.length });
      const lines = sites.map((s) => t(lang, "sites_entry", { domain: s.domain }));
      return textResult(`${header}\n${lines.join("\n")}`);
    },
  };

  return [listSites];
}
