# Architektura

Znalostní báze pro implementaci seznam-webmaster-mcp. Není veřejnou dokumentací.

## Rozvržení kódu

- `src/index.ts` — vstupní bod MCP serveru. Registruje všechny nástroje a startuje MCP server přes stdio transport.
- `src/config.ts` — parsuje env proměnné `SEZNAM_WM_SITES` a `SEZNAM_WM_LANG`. Exportuje `loadConfig()`, typy `SiteConfig`, `AppConfig`.
- `src/api.ts` — HTTP klient pro `https://reporter.seznam.cz/wm-api`. Řeší autentizaci přes query parametr, rate limiting (429), 204 bez dat, 403 u reindexu.
- `src/i18n.ts` — lokalizace textových zpráv (cs, en). `t(lang, key, params?)`.
- `src/tools/` — každý MCP nástroj jako samostatný soubor. Exportuje `{ name, description, inputSchema, handler }`.
  - `status.ts` — `get_web_status` + `get_database_info`.
  - `documents.ts` — `get_indexed_pages` + `get_document_info`.
  - `history.ts` — `get_index_history`.
  - `reindex.ts` — `reindex_url`.
  - `sites.ts` — `list_sites` (čistě lokální, neposílá nic na API).

## Datový tok nástroje

1. Uživatel zavolá nástroj s `domain` jako povinným prvním parametrem.
2. Handler nástroje si z `AppConfig` vybere `SiteConfig` podle domény.
3. Pokud doména není nakonfigurována, vrátí lokalizovanou chybu.
4. Zavolá odpovídající metodu v `api.ts` s API klíčem.
5. API klient vrátí buď parsovaný objekt, nebo strukturovanou chybu (enum `ApiErrorKind`).
6. Handler naformátuje odpověď do `content` pole MCP (text, jeden blok).

## Proč tak

- **Doména, ne klíč** — uživatel mluví o „webu”, nikoli o API klíči. Klíč je interní detail, který nesmí opustit server.
- **Jeden soubor na endpoint/skupinu** — endpointů je málo, držíme je pohromadě podle logického celku.
- **Centrální API klient** — rate limiting a 204/429 retry musí být na jednom místě, jinak se to rozdrolí napříč nástroji.
- **i18n mapa, ne šablony** — texty jsou krátké a málo; ploché JSON mapy cs/en stačí, knihovna navíc nic nepřináší.

## Sdílený state

Žádný. Každý nástroj je čistý handler nad `AppConfig` a `ApiClient`. API klient zatím nedrží frontu — rate limiting řeší až reaktivně při 429 (exponenciální backoff 500 ms / 1 s / 2 s, max 3 pokusy). Pokud se v provozu ukáže, že je nutné preventivní throttlovani (5 req/s, 100 req/min), přidá se do `ApiClient` token bucket; zatím čekáme, jestli to bude reálně potřeba.

Každý HTTP požadavek má timeout 30 s (`AbortSignal.timeout(30_000)`). Při překročení timeoutu vrací `ApiError` s kind `network` a zprávou „Request timed out after 30000 ms".

## Nástroj → endpoint → status

| Nástroj | HTTP endpoint | Povinné argumenty |
|---|---|---|
| `get_web_status` | GET /web | domain |
| `get_indexed_pages` | GET /web/documents | domain |
| `get_index_history` | GET /web/documents-history | domain (+ date_from, date_to volitelně) |
| `get_document_info` | GET /web/document | domain, url |
| `reindex_url` | POST /web/document/reindex | domain, url |
| `get_database_info` | GET /database-info | — |
| `list_sites` | (lokální) | — |

## Použitá verze MCP SDK

`@modelcontextprotocol/sdk@1.29.x`. Používáme nízkoúrovňový `Server` (nikoli `McpServer`), protože chceme jednoduchou registraci `setRequestHandler(ListToolsRequestSchema | CallToolRequestSchema, …)` bez zbytečné abstrakce. Odpověď z handleru kastujeme na `CallToolResult`, protože TypeScript při unifikaci s task-variantou `ServerResult` nedokázal zvolit správnou větev.

## Build

- `npm run build` → `tsc` → `dist/`.
- `dist/index.js` má zachovaný shebang `#!/usr/bin/env node` a je v `package.json` uveden jako `bin`.
- Runtime: Node >= 18 (globální `fetch`).
- Žádné runtime závislosti mimo `@modelcontextprotocol/sdk`.
