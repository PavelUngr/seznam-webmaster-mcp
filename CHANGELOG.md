# Changelog

Všechny významné změny v `@pavelungr/seznam-webmaster-mcp` jsou zde. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/) a projekt drží [Semver](https://semver.org/lang/cs/).

## [0.1.4] — 2026-04-23

### Security
- **Redakce API klíče i v error message z `fetch()`.** Síťové chyby (DNS, TLS, timeout) mohou v některých Node runtime obsahovat request URL v `e.message`. Ta URL nese `?key=...`. `redactApiKey()` se teď aplikuje i tam, ne jen na `readErrorDetail`. Uzavírá zbylou cestu k leaku, který v0.1.3 opravil jen z poloviny.
- **Sanitizace tool name v chybových hláškách.** `unknown_tool` i `internal_error` propouštějí jen `[a-zA-Z0-9_\-:]`, ostatní znaky se nahradí `?`, délka se ořezává na 64 znaků. Brání ANSI escape sequences a podobným payloadům od buggy/maliciousního MCP klienta.

### Reliability
- **`tsc` čistí `dist/` před každým buildem** (`npm run clean && tsc`). Dříve mohly v `dist/` zůstat zkompilované soubory pro již smazané/přejmenované zdrojáky a `prepublishOnly` by je zabalil do tarballu. Tichý risk shippingu stale kódu.
- **`normalizeDomain` umí userinfo a trailing dot.** Vstup `https://user:pass@example.cz/` ani `example.cz.` (FQDN forma) dřív nematchnul configuraci a tools selhaly s `domain_not_configured`. Teď oba vrátí `example.cz`.

### Tooling
- **Smoke test v repu** (`tests/smoke.mjs`) + `npm run smoke` script. 30 assertů — pure funkce (redakce, normalizace), server boot, validace vstupů, kontrola, že klíč neuteče do stderr.
- **GitHub Actions CI** (`.github/workflows/ci.yml`). Build + smoke test + `npm audit` na každém push do `main`/`dev` a každém PR, matrix Node 18/20/22.
- **CHANGELOG.md** osamostatněný (původně v CLAUDE.md). Sleduje Keep a Changelog formát.

## [0.1.3] — 2026-04-22

### Security
- **Redakce `key=` z upstream error bodu** přes nové `redactApiKey()` v `src/api.ts`. Cloudflare challenge pages a podobné proxy mohly echonout request URL (`?key=...`) zpět v HTML/JSON a klient by viděl API klíč v chybové hlášce. Skrubujeme query-style i JSON-style varianty.

### Robustness
- **Context-aware HTTP 403.** `apiErrorToResult` přijímá `{ operation: "reindex" | "read" }`. Reindex dostane radu o write klíči (`api_403_reindex`), read endpointy neutrální zprávu (`api_403_generic`). Dřív všechny 403 radily generovat write klíč.
- **`normalizeDomain` stripuje scheme/path/port.** LLM vstupy `https://example.cz/`, `EXAMPLE.CZ:443` matchnou konfigurované `example.cz`. `www.` záměrně nestripujeme.
- **Rozšířené TypeScript modely** podle reálného API: `WebDocuments.doc_count`, `WebHistoryCounts.content`/`doc_count`, `Web.webserver`, nový `ResponseHeader` interface (`value` / `content` duality). Swagger spec byl neúplný.
- **Retry pro 502/503** vedle 429. Stejný backoff (500/1000/2000 ms, max 3 pokusy).

### Quality
- **Lokalizace interních chyb.** Top-level catch v tool handleru loguje plný detail do stderr, klient dostane lokalizovaný `internal_error` s odkazem na GitHub issues. Konec leaku `err.message`.
- **`console.error`** místo `process.stderr.write` v `config.ts` a `index.ts`.
- **Lokalizovaná hláška `(no data)`** v `get_database_info` (klíč `no_data_simple`).

### Maintenance
- **Pin MCP SDK na `^1.29.0`** (z `^1.0.4`). Odpovídá verzi, kterou reálně testujeme.
- **Odstraněny nepoužité i18n klíče** `category_*`.

## [0.1.2] — 2026-04-22

### Fixed
- **Chybové hlášky obsahují konkrétní návod**, jak problém řešit. Včetně odkazů do Seznam Webmasteru (ověření klíče, změna oprávnění atd.).
- **Striktní validace vstupů.** Datumy se ověřují proti kalendáři (odmítne `2026-02-31`), kontroluje se `date_from ≤ date_to`. URL musí být absolutní a se schématem `http(s)`.
- **HTTP 400 mapping odstraněn.** Dřív se mapovalo univerzálně na „missing API key", což byl dead code (sami vždy posíláme `?key=`). Teď padá do generického handleru s reálným detailem ze Seznamu.
- **Verze serveru čtena z `package.json` za běhu.** Dřív hardcoded `0.1.0` i ve v0.1.1 balíčku.

## [0.1.1] — 2026-04-22

### Changed
- **Sjednocení českého a anglického README** do jednoho `README.md`. Česká verze první (pro GitHub default view), anglická po skoku dole. `README.cs.md` ponechán jako krátký pointer.

## [0.1.0] — 2026-04-22

### Added
- První veřejná publikace.
- 7 MCP nástrojů: `get_web_status`, `get_indexed_pages`, `get_index_history`, `get_document_info`, `reindex_url`, `get_database_info`, `list_sites`.
- HTTP klient s retry na 429 (500/1000/2000 ms) a timeout 30 s.
- Parsing `SEZNAM_WM_SITES` + `SEZNAM_WM_LANG` s validací a varováním u duplicit.
- Lokalizace cs (výchozí) + en.
- Podpora Claude Desktop, Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor.

[0.1.4]: https://github.com/pavelungr/seznam-webmaster-mcp/releases/tag/v0.1.4
[0.1.3]: https://github.com/pavelungr/seznam-webmaster-mcp/releases/tag/v0.1.3
[0.1.2]: https://github.com/pavelungr/seznam-webmaster-mcp/releases/tag/v0.1.2
[0.1.1]: https://github.com/pavelungr/seznam-webmaster-mcp/releases/tag/v0.1.1
[0.1.0]: https://github.com/pavelungr/seznam-webmaster-mcp/releases/tag/v0.1.0
