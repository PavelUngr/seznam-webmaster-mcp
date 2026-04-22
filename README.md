# seznam-webmaster-mcp

MCP server pro [Seznam Webmaster API](https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/). Umožňuje AI asistentům (Claude, Codex, Gemini, Cursor) pracovat s daty indexace, stavem webu a odesíláním URL k reindexaci přes přirozený jazyk.

**[English version below ↓](#english-version)**

## K čemu to je

Pokud spravujete více klientských webů v Seznam Webmasteru, otevíráte deset záložek, kopírujete klíče, klikáte se k číslům. Tenhle server to změní: zeptáte se Claude „kolik stránek má fenek.cz v indexu?" nebo „pošli k reindexaci /sluzby/seo", a AI asistent zavolá Seznam API za vás.

Nástroj je primárně vyrobený pro vlastní potřebu — správu více webů z jednoho místa —, ale je veřejně dostupný pro celou SEO komunitu.

## Co umí

Sedm nástrojů, které AI asistent může volat:

- **get_web_status** — úplný přehled o webu (počty stránek po kategoriích plus historie indexace)
- **get_indexed_pages** — počty stažených, přesměrovaných, zaindexovaných a chybových stránek, včetně vzorku URL
- **get_index_history** — vývoj počtu stránek po dnech, volitelně v rozsahu dat
- **get_document_info** — detail konkrétní URL (title, meta, OpenGraph, hlavičky, timestamp indexace)
- **reindex_url** — požadavek na reindexaci URL (vyžaduje klíč s právem zápisu, limit 500 za den)
- **get_database_info** — verze databáze Seznam Webmaster
- **list_sites** — seznam nakonfigurovaných domén (API klíče nikdy nevypíše)

## Předpoklady

- **Node.js 18 a novější** (server potřebuje nativní `fetch`)
- **API klíč** ze Seznam Webmasteru pro každý web, který chcete spravovat

### Jak získat API klíč

1. Přihlaste se do [https://reporter.seznam.cz/wm/](https://reporter.seznam.cz/wm/)
2. Vyberte web ze seznamu
3. Přejděte do sekce **API** → **Přístupové klíče**
4. Vygenerujte nový klíč. Pro `reindex_url` potřebujete klíč s oprávněním **zápis**, pro ostatní stačí **čtení**.

## Konfigurace

API klíče a jazyk odpovědí se předávají přes proměnné prostředí.

### Proměnná SEZNAM_WM_SITES

JSON pole objektů ve tvaru `{domain, apiKey}`:

```json
[
  {"domain": "example.cz", "apiKey": "abc123"},
  {"domain": "other.cz",   "apiKey": "xyz789"}
]
```

V konfiguraci MCP klienta se předává jako řetězec — JSON musí být escapovaný. Viz příklady níže.

### Proměnná SEZNAM_WM_LANG

Jazyk textových zpráv serveru. Podporované hodnoty: `cs` (výchozí) a `en`. Týká se jen zpráv generovaných tímto serverem, nikoli obsahu z API.

## Nastavení v klientech

### Claude Desktop a Claude Code

Přidejte do konfigurace (`claude_desktop_config.json`, případně projektové `.mcp.json`):

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "cs"
      }
    }
  }
}
```

### OpenAI Codex CLI

V `~/.codex/config.toml`:

```toml
[mcp_servers.seznam-webmaster]
command = "npx"
args    = ["@pavelungr/seznam-webmaster-mcp"]

[mcp_servers.seznam-webmaster.env]
SEZNAM_WM_SITES = '[{"domain":"example.cz","apiKey":"abc123"}]'
SEZNAM_WM_LANG = "cs"
```

### Gemini CLI

V `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "cs"
      }
    }
  }
}
```

Gemini CLI vyžaduje při prvním spuštění příznak `--consent` pro odsouhlasení spuštění externího MCP serveru.

### Cursor

V `.cursor/mcp.json` (lokálně pro projekt) nebo v globálním nastavení Cursoru:

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

## Ukázky použití

Po nastavení stačí napsat asistentovi něco v tomto duchu:

- „Jaký je stav webu example.cz?"
- „Kolik stránek má example.cz v indexu a kolik chybových?"
- „Ukaž mi vývoj indexace za posledních 30 dní."
- „Co Seznam ví o stránce https://example.cz/kontakt?"
- „Pošli URL https://example.cz/novinka k reindexaci."
- „Které domény jsou nakonfigurované?"

Server vrátí strukturovanou odpověď z API, asistent ji interpretuje.

## Limity a známé chování

**Limity Seznam API:**
- nejvýše 5 dotazů za vteřinu a 100 dotazů za minutu
- `reindex_url` lze volat nejvýše 500krát za den na jeden klíč
- nová data se u nově přidaného webu objeví do 24 hodin

**Co na to server reaguje:**
- Při překročení rate limitu (HTTP 429) server automaticky čeká a opakuje pokus — 500 ms, 1 s, 2 s, max tři pokusy.
- HTTP 204 není chyba. Seznam ho vrací, když je dotaz přijat, ale data ještě neexistují (typicky u čerstvě přidaného webu). Server to hlásí jako „data zatím nejsou k dispozici".
- Při HTTP 403 u reindexu server vysvětlí, že klíč pravděpodobně nemá právo zápisu.
- API klíče nikdy neopouštějí server — nevypisují se do žádné odpovědi ani chybové hlášky.

**Beta stav nástroje:** Seznam Webmaster je dlouhodobě v beta provozu. Data občas vykazují propady nebo chybí. Jde o nedostupnost dat pro nástroj, ne o výpadek vlastního indexu.

## Vývoj

### Lokální build

```bash
git clone https://github.com/pavelungr/seznam-webmaster-mcp.git
cd seznam-webmaster-mcp
npm install
npm run build
```

### Spuštění z lokálního buildu

```bash
SEZNAM_WM_SITES='[{"domain":"example.cz","apiKey":"test"}]' \
node dist/index.js
```

Server komunikuje přes stdio — ručně ho budete testovat jen přes MCP klienta, ne v terminálu.

### Struktura projektu

```
src/
  index.ts       — vstupní bod, registrace MCP serveru
  config.ts      — parsing SEZNAM_WM_SITES a SEZNAM_WM_LANG
  api.ts         — HTTP klient pro Seznam Webmaster API
  i18n.ts        — české a anglické zprávy
  tools/         — jednotlivé MCP nástroje
docs/            — interní znalostní báze (architektura, konvence, záludnosti)
```

## Licence

MIT — viz [LICENSE](LICENSE).

## Autor

Pavel Ungr ([pavelungr.cz](https://www.pavelungr.cz), [jsem@pavelungr.cz](mailto:jsem@pavelungr.cz))

Pull requesty a issues vítány na [GitHubu](https://github.com/pavelungr/seznam-webmaster-mcp/issues).

---

# English version

MCP server for the [Seznam Webmaster API](https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/). Lets AI assistants (Claude, Codex, Gemini, Cursor) work with indexation data, site status, and reindex requests through natural language.

**[↑ Skok na českou verzi](#seznam-webmaster-mcp)**

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
