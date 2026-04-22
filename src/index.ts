#!/usr/bin/env node
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
      process.stderr.write(
        `[seznam-webmaster-mcp] configuration error: ${err.message}\n`,
      );
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

  const server = new Server(
    {
      name: "@pavelungr/seznam-webmaster-mcp",
      version: "0.1.0",
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
      const message = err instanceof Error ? err.message : String(err);
      const result: CallToolResult = {
        content: [
          {
            type: "text",
            text: `[${name}] internal error: ${message}`,
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
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(`[seznam-webmaster-mcp] fatal: ${message}\n`);
  process.exit(1);
});
