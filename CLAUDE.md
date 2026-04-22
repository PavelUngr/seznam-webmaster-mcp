# seznam-webmaster-mcp

MCP server pro Seznam Webmaster API. Umožňuje AI asistentům pracovat s daty
indexace, stavem webu a odesíláním URL k reindexaci přímo přes přirozený jazyk.

## Projekt

**Autor:** Pavel Ungr (jsem@pavelungr.cz)
**Repozitář:** github.com/pavelungr/seznam-webmaster-mcp (veřejný)
**Licence:** MIT
**Jazyk README:** češtiny i angličtina (dva oddělené soubory: README.md a README.cs.md)

## Cíl

Primárně nástroj pro vlastní potřebu — správa více klientských webů z jednoho
místa. Zároveň veřejně dostupný pro SEO komunitu. Každý web má vlastní API klíč,
konfigurace jde přes proměnné prostředí v konfiguračním souboru příslušného
klienta.

## Stav

**Verze 0.1.0 — implementováno.** Všech 7 MCP nástrojů funguje, server kompiluje
bez chyb, smoke-test prošel (cs i en lokalizace, error handling, tool listing).

Hotovo:
- 7 MCP nástrojů (status, documents, history, reindex, database-info, sites)
- HTTP klient s retry na 429 (500/1000/2000 ms) a timeout 30 s přes `AbortSignal`
- Parsing `SEZNAM_WM_SITES` + `SEZNAM_WM_LANG` s validací a varováním u duplicit
- Lokalizace cs (výchozí) + en
- README.md, README.cs.md, LICENSE (MIT), .gitignore, .npmignore
- docs/architecture.md, docs/conventions.md, docs/gotchas.md

Zbývá před první publikací:

1. **Ověřit scope `@pavelungr` na npm.** Před prvním `npm publish` spustit `npm access list packages @pavelungr` — pokud scope ještě neexistuje, založit ho na [npmjs.com](https://www.npmjs.com/) pod stejným účtem. Bez existujícího scope se publish nepovede.
2. **`git init` + první commit.** Po inicializaci repozitáře zkontrolovat `git status` — v indexu nesmí být `dist/` ani `node_modules/` (dík `.gitignore` by tam být neměly, ale pro jistotu ověřit). Push na `github.com/pavelungr/seznam-webmaster-mcp`.
3. **První publikace na npm: `npm publish --access public`.** Příznak `--access public` je u scoped balíčků povinný — bez něj npm defaultně zkouší privátní publish a u neplaceného účtu selže.
4. **Ověřit `npx` po publikaci.** Z čerstvého adresáře (nebo po `npx clear-npx-cache`) spustit `npx @pavelungr/seznam-webmaster-mcp` a zkontrolovat, že server nabootuje bez errorů.
5. **Unit testy** (config parsing, i18n fallback, api error mapping) — nepovinné pro v0.1.0, ale stojí za to před v0.2.0.

## Architektura

@docs/architecture.md

## Konvence

@docs/conventions.md

## Záludnosti

@docs/gotchas.md

---

## Technický stack

- **Jazyk:** TypeScript (Node.js)
- **MCP SDK:** @modelcontextprotocol/sdk
- **Distribuce:** npm balíček `@pavelungr/seznam-webmaster-mcp`, spouštění přes `npx @pavelungr/seznam-webmaster-mcp`
- **Konfigurace:** výhradně přes proměnné prostředí, žádné konfigurační soubory

## Konfigurace více webů

API klíče jsou předávány přes env proměnnou `SEZNAM_WM_SITES` jako JSON array:

```json
[
  {"domain": "example.cz", "apiKey": "abc123"},
  {"domain": "other.cz",   "apiKey": "xyz789"}
]
```

Tvar se nesmí měnit — na tomto formátu závisí dokumentace i parsing.

## Jazyk odpovědí

Výchozí jazyk odpovědí MCP nástrojů je **čeština**.
Lze změnit env proměnnou `SEZNAM_WM_LANG`:

```json
"env": {
  "SEZNAM_WM_SITES": "...",
  "SEZNAM_WM_LANG": "en"
}
```

Podporované hodnoty: `cs` (výchozí), `en`.
Jazyk se týká textových zpráv generovaných MCP serverem — nikoli obsahu
vráceného z API (ten je vždy tak, jak ho vrátí Seznam).

## Podporovaní klienti a jejich konfigurace

Plné uživatelské konfigurační příklady jsou v `README.md` / `README.cs.md`.
Zkrácený přehled pro rychlou orientaci:

- **Claude Desktop / Claude Code** — `claude_desktop_config.json` nebo projektové `.mcp.json`, blok `mcpServers.seznam-webmaster` s `command: npx`, `args: ["@pavelungr/seznam-webmaster-mcp"]`.
- **OpenAI Codex CLI** — `~/.codex/config.toml`, sekce `[mcp_servers.seznam-webmaster]`.
- **Gemini CLI** — `~/.gemini/settings.json`. Vyžaduje při prvním spuštění příznak `--consent`.
- **Cursor** — `.cursor/mcp.json` (per-project) nebo globální nastavení.

Env proměnné se předávají přes `env` blok v klientské konfiguraci:
- `SEZNAM_WM_SITES` (povinné pro API-volající nástroje)
- `SEZNAM_WM_LANG` (volitelné, výchozí `cs`)

---

## Seznam Webmaster API

**Nástroj (přihlášení):** https://reporter.seznam.cz/wm/
**Nápověda (veřejná):** https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/
**Swagger spec:** pouze za přihlášením v nástroji (sekce API → Popis a dokumentace),
načítá se z `https://reporter.seznam.cz/wm/web/dokumentace` jako `swagger.json`.
Spec je Swagger 2.0, verze API 0.1.

**Základní URL:** `https://reporter.seznam.cz/wm-api`

**Autentizace:** query parametr `?key={apiKey}` (povinný u každého volání kromě `/database-info`)

### Endpointy

#### GET /web
Vrátí úplné informace o webu (documents + history v jedné odpovědi).
Parametry: `key` (povinný)
Odpověď 200: model `Web` (`{documents: WebDocuments, history: WebHistory[]}`)

#### GET /web/documents
Vrátí počty stránek webu po kategoriích + náhodný vzorek max. 1 000 URL.
Parametry: `key` (povinný)
Kategorie: `content` (stažené), `redirect`, `index`, `error`
Odpověď 200: model `WebDocuments` (`{content, redirect, index, error}` — každá je `WebUrl`)

#### GET /web/documents-history
Vrátí vývoj počtu stránek po dnech.
Parametry: `key` (povinný), `date_from` (datum, nepovinný), `date_to` (datum, nepovinný)
Kategorie v odpovědi: `error`, `downloaded`, `redirected`, `indexed`
Odpověď 200: array `WebHistory[]` (`{date: string, counts: {error, downloaded, redirected, indexed}}`)
Pozor: názvy kategorií se liší od `/web/documents` (downloaded vs content, redirected vs redirect)

#### GET /web/document
Vrátí detail konkrétní URL.
Parametry: `key` (povinný), `url` (URL stránky, povinný)
Odpověď 200: model `Document` (viz schémata níže)
Stavový kód 403: přístup odepřen (navíc oproti ostatním endpointům)

#### POST /web/document/reindex
Zažádá o reindexaci konkrétní URL.
Parametry: `key` (povinný), `url` (URL stránky, povinný)
Vyžaduje práva zápisu (správce nebo role zápis) — read-only klíč nestačí.
Odpověď 200: prázdná (jen HTTP 200, žádné tělo)

#### GET /database-info
Vrátí informace o databázi (verze release).
Parametry: žádné (ani `key` není vyžadován)
Odpověď 200: `{release: string}`

### Společné stavové kódy (všechny endpointy kromě /database-info)

| Kód | Význam |
|---|---|
| 200 | OK |
| 204 | dotaz proběhl, data zatím nejsou dostupná |
| 400 | chybí parametr `key` |
| 401 | nesprávný API klíč |
| 404 | web / stránka nenalezena |
| 502 / 503 | služba je mimo provoz |

Kód 204 není chyba -- MCP server musí toto hlásit jako "data nejsou zatím dostupná",
ne jako selhání.

### Schémata modelů (pro TypeScript typy)

```typescript
// WebUrl -- vzorek URL pro jednu kategorii
interface WebUrl { count: number; urls: string[]; }

// WebDocuments -- počty a vzorky všech kategorií
interface WebDocuments {
  content: WebUrl;   // stažené stránky
  redirect: WebUrl;  // přesměrování
  index: WebUrl;     // v indexu
  error: WebUrl;     // chybové
}

// WebHistory -- jeden den historie
interface WebHistory {
  date: string;  // formát date (YYYY-MM-DD)
  counts: { error: number; downloaded: number; redirected: number; indexed: number; };
}

// Web -- kompletní přehled (GET /web)
interface Web { documents: WebDocuments; history: WebHistory[]; }

// Document -- detail konkrétní URL
interface Document {
  title: string;
  url: string;
  indexTimestamp: number;
  downloadTimestamp: number;
  isIndexed: boolean;
  isError: boolean;
  isRedirect: boolean;
  meta: { author: string; desc: string; keywords: string; };
  openGraphData: Array<{ name: string; content: string; }>;
  responseHeaders: Array<{ name: string; value: string; }>;
}

// ProblemResult -- chybová odpověď
interface ProblemResult { title: string; description: string; type: string; status: number; }
```

### Limity API

- nejvýše 5 dotazů za vteřinu
- nejvýše 100 dotazů za minutu
- `POST /web/document/reindex` lze volat nejvýše 500krát za den
- nová data se u webu přidaného do nástroje objeví do 24 hodin

**Dostupnost dat:** Seznam Webmaster je dlouhodobě v beta stavu. Data mohou
dočasně chybět nebo vykazovat náhlé propady — nejde o výpadek indexu,
jen o nedostupnost dat pro nástroj. Kód 204 je očekávané chování, ne chyba.


---

## Nástroje (MCP tools), které server vystavuje

Při přidávání nebo úpravě nástrojů dodržuj toto schéma:

```
tool_name(domain: string, ...): popis co dělá a co vrací
```

Implementované nástroje (v0.1.0):

| Nástroj | Endpoint | Argumenty | Soubor |
|---|---|---|---|
| `get_web_status` | GET /web | `domain` | `src/tools/status.ts` |
| `get_indexed_pages` | GET /web/documents | `domain` | `src/tools/documents.ts` |
| `get_index_history` | GET /web/documents-history | `domain`, `date_from?`, `date_to?` | `src/tools/history.ts` |
| `get_document_info` | GET /web/document | `domain`, `url` | `src/tools/documents.ts` |
| `reindex_url` | POST /web/document/reindex | `domain`, `url` | `src/tools/reindex.ts` |
| `get_database_info` | GET /database-info | — | `src/tools/status.ts` |
| `list_sites` | (lokální) | — | `src/tools/sites.ts` |

Všechny API-volající nástroje přijímají `domain` jako první povinný parametr
a dohledávají si API klíč z `AppConfig`. `get_database_info` a `list_sites`
fungují i bez nakonfigurované domény.

---

## Struktura projektu

```
seznam-webmaster-mcp/
├── CLAUDE.md
├── README.md           ← anglická verze (canonical)
├── README.cs.md        ← česká verze
├── LICENSE             ← MIT
├── .gitignore
├── .npmignore          ← brání src/, docs/, CLAUDE.md v npm balíčku
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        ← vstupní bod, registrace MCP serveru, stdio transport
│   ├── config.ts       ← parsing SEZNAM_WM_SITES + SEZNAM_WM_LANG, validace
│   ├── api.ts          ← HTTP klient pro Seznam Webmaster API (timeout, 204, 429 retry)
│   ├── i18n.ts         ← lokalizace cs/en pro zprávy serveru
│   └── tools/
│       ├── common.ts   ← sdílené helpery (ToolDefinition, resolveSite, apiErrorToResult)
│       ├── status.ts   ← get_web_status, get_database_info
│       ├── documents.ts ← get_indexed_pages, get_document_info
│       ├── history.ts  ← get_index_history
│       ├── reindex.ts  ← reindex_url
│       └── sites.ts    ← list_sites
├── dist/               ← výstup `tsc`, publikuje se (via `files` v package.json)
└── docs/
    ├── architecture.md
    ├── conventions.md
    └── gotchas.md
```

---

## Dokumentace

Po každém úkolu, který mění chování systému, aktualizuj příslušný soubor v `docs/`.
Zejména `docs/gotchas.md` pokud jsi narazil na neočekávané chování API, edge
case v parsování konfigurace nebo rozdíly mezi MCP klienty.

`docs/` je znalostní báze pro tato sezení — ne veřejná dokumentace.
Veřejná dokumentace (pro uživatele) patří do `README.md` a `README.cs.md`.

---

## Co nepatří do tohoto souboru

- Obsah README (instalace, ukázky použití, uživatelské konfigurační příklady) — patří do README.md / README.cs.md
- Changelog
- Ukázkové výstupy volání API
- Interní dokumentační detaily (architektura, konvence, záludnosti) — patří do docs/

## Build a vývojové příkazy

```bash
npm install         # instalace závislostí (pouze @modelcontextprotocol/sdk + dev deps)
npm run build       # tsc → dist/
npm start           # node dist/index.js (server mluví přes stdio)
```

Runtime Node >= 18. Žádné runtime závislosti mimo `@modelcontextprotocol/sdk`
(používáme nativní `fetch`).
