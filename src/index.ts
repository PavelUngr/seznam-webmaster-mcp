#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import { ApiClient } from "./api.js";
import { ConfigError, loadConfig } from "./config.js";
import { t } from "./i18n.js";
import { buildDocumentsTools } from "./tools/documents.js";
import { buildHistoryTools } from "./tools/history.js";
import { buildReindexTools } from "./tools/reindex.js";
import { buildSitesTools } from "./tools/sites.js";
import { buildStatusTools } from "./tools/status.js";
import type { ToolDefinition, ToolDeps } from "./tools/common.js";

function readPackageMeta(): { name: string; version: string } {
  // package.json is at the root; dist/index.js is in dist/, so ../package.json
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = join(here, "..", "package.json");
  const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    name?: unknown;
    version?: unknown;
  };
  const name = typeof parsed.name === "string" ? parsed.name : "seznam-webmaster-mcp";
  const version = typeof parsed.version === "string" ? parsed.version : "0.0.0";
  return { name, version };
}

function collectTools(deps: ToolDeps): ToolDefinition[] {
  return [
    ...buildStatusTools(deps),
    ...buildDocumentsTools(deps),
    ...buildHistoryTools(deps),
    ...buildReindexTools(deps),
    ...buildSitesTools(deps),
  ];
}

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`[seznam-webmaster-mcp] configuration error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const api = new ApiClient();
  const deps: ToolDeps = { config, api };
  const tools = collectTools(deps);
  const toolMap = new Map<string, ToolDefinition>(
    tools.map((tool) => [tool.name, tool]),
  );

  const pkg = readPackageMeta();
  const server = new Server(
    {
      name: pkg.name,
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const tool = toolMap.get(name);
    if (!tool) {
      const result: CallToolResult = {
        content: [
          { type: "text", text: t(config.lang, "unknown_tool", { name }) },
        ],
        isError: true,
      };
      return result;
    }
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    try {
      const result = (await tool.handler(args)) as CallToolResult;
      return result;
    } catch (err) {
      // Log the full detail (incl. stack) to stderr for operator diagnostics,
      // but return only a localized generic message to the MCP client. Raw
      // err.message can leak implementation paths, library names, or future
      // internal structures and doesn't help the end user anyway.
      const detail =
        err instanceof Error ? (err.stack ?? err.message) : String(err);
      console.error(`[seznam-webmaster-mcp] tool "${name}" threw: ${detail}`);
      const result: CallToolResult = {
        content: [
          {
            type: "text",
            text: t(config.lang, "internal_error", { tool: name }),
          },
        ],
        isError: true,
      };
      return result;
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[seznam-webmaster-mcp] fatal: ${message}`);
  process.exit(1);
});
