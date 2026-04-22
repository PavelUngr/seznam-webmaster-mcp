# seznam-webmaster-mcp

MCP server for the [Seznam Webmaster API](https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/). Lets AI assistants (Claude, Codex, Gemini, Cursor) work with indexation data, site status, and reindex requests through natural language.

**Česká verze:** [README.cs.md](README.cs.md)

## What is Seznam Webmaster?

Seznam is the second-largest search engine in the Czech Republic. Seznam Webmaster is its equivalent of Google Search Console — it exposes indexation status, page counts, and reindex requests for verified sites. If you do SEO for the Czech market, this is one of the two tools you live in.

## What this server does

If you manage multiple client sites in Seznam Webmaster, you know the drill: ten tabs, copy-paste API keys, click your way to numbers. This server replaces that with natural-language access: ask your AI assistant "how many pages of example.cz are indexed?" or "submit /services/seo for reindex" and it calls the API for you.

Primarily built for personal use — managing multiple sites from one place — and released publicly for the Czech SEO community.

## Tools exposed

Seven tools the assistant can call:

- **get_web_status** — complete overview of a site (page counts per category plus indexation history)
- **get_indexed_pages** — per-category page counts (content, redirect, indexed, error) with a sample of up to 1000 URLs per category
- **get_index_history** — per-day page counts, optionally within a date range
- **get_document_info** — details about a specific URL (title, meta, OpenGraph, response headers, index timestamps)
- **reindex_url** — submit a URL for reindexation (requires a write-enabled key, 500/day limit)
- **get_database_info** — Seznam Webmaster database release version
- **list_sites** — list configured domains (API keys are never exposed)

## Requirements

- **Node.js 18 or newer** (the server uses native `fetch`)
- **A Seznam API key** per site you want to manage

### Getting an API key

1. Log in at [https://reporter.seznam.cz/wm/](https://reporter.seznam.cz/wm/)
2. Select a verified site
3. Go to the **API** section → **Access keys** (Přístupové klíče)
4. Generate a new key. `reindex_url` needs a **write-enabled** key; everything else works with **read-only**.

## Configuration

API keys and response language are passed through environment variables.

### SEZNAM_WM_SITES

A JSON array of `{domain, apiKey}` objects:

```json
[
  {"domain": "example.cz", "apiKey": "abc123"},
  {"domain": "other.cz",   "apiKey": "xyz789"}
]
```

Inside an MCP client configuration it's a string — the JSON must be escaped. See examples below.

### SEZNAM_WM_LANG

Language of server-generated messages. Supported values: `cs` (default) and `en`. Only affects messages from this server, not content returned by the Seznam API (which is always as Seznam returns it).

## Client setup

### Claude Desktop and Claude Code

Add to `claude_desktop_config.json` (or a project-scoped `.mcp.json`):

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "en"
      }
    }
  }
}
```

### OpenAI Codex CLI

In `~/.codex/config.toml`:

```toml
[mcp_servers.seznam-webmaster]
command = "npx"
args    = ["@pavelungr/seznam-webmaster-mcp"]

[mcp_servers.seznam-webmaster.env]
SEZNAM_WM_SITES = '[{"domain":"example.cz","apiKey":"abc123"}]'
SEZNAM_WM_LANG = "en"
```

### Gemini CLI

In `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "en"
      }
    }
  }
}
```

Gemini CLI requires the `--consent` flag on first run to approve external MCP servers.

### Cursor

In `.cursor/mcp.json` (project-local) or the global Cursor settings:

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]"
      }
    }
  }
}
```

## Usage examples

Once configured, just ask your assistant:

- "What's the status of example.cz?"
- "How many pages of example.cz are indexed, and how many have errors?"
- "Show me the indexation trend for the last 30 days."
- "What does Seznam know about https://example.cz/contact?"
- "Submit https://example.cz/new-article for reindex."
- "Which domains are configured?"

The server returns the API data; the assistant interprets it.

## Limits and known behavior

**Seznam API limits:**
- up to 5 requests per second and 100 per minute
- `reindex_url` is capped at 500 calls per day per key
- data for newly added sites may take up to 24 hours to appear

**How the server handles these:**
- On rate-limit responses (HTTP 429) the server backs off and retries automatically — 500 ms, 1 s, 2 s, up to three attempts.
- HTTP 204 is not an error. Seznam returns it when a request is accepted but no data is available yet (typical for freshly added sites). The server reports this as "data not yet available".
- On HTTP 403 from reindex, the server explains that the key likely lacks write permission.
- API keys never leave the server. They do not appear in any response, log, or error message.

**Beta status:** Seznam Webmaster has been in long-running beta. Data occasionally shows drops or gaps. That reflects the tool's data availability, not the underlying search index.

## Development

### Build from source

```bash
git clone https://github.com/pavelungr/seznam-webmaster-mcp.git
cd seznam-webmaster-mcp
npm install
npm run build
```

### Run a local build

```bash
SEZNAM_WM_SITES='[{"domain":"example.cz","apiKey":"test"}]' \
node dist/index.js
```

The server speaks MCP over stdio — you won't interact with it directly in a terminal, only through an MCP client.

### Project layout

```
src/
  index.ts       — entry point, MCP server wiring
  config.ts      — parses SEZNAM_WM_SITES and SEZNAM_WM_LANG
  api.ts         — HTTP client for the Seznam Webmaster API
  i18n.ts        — Czech and English messages
  tools/         — individual MCP tool handlers
docs/            — internal knowledge base (architecture, conventions, gotchas)
```

## License

MIT — see [LICENSE](LICENSE).

## Author

Pavel Ungr ([pavelungr.cz](https://www.pavelungr.cz), [jsem@pavelungr.cz](mailto:jsem@pavelungr.cz))

Pull requests and issues welcome at [GitHub](https://github.com/pavelungr/seznam-webmaster-mcp/issues).
