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

### Claude Desktop / Claude Code

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

### OpenAI Codex CLI

Konfigurace v `~/.codex/config.toml`:

```toml
[mcp_servers.seznam-webmaster]
command = "npx"
args    = ["@pavelungr/seznam-webmaster-mcp"]

[mcp_servers.seznam-webmaster.env]
SEZNAM_WM_SITES = '[{"domain":"example.cz","apiKey":"abc123"}]'
```

### Gemini CLI

Konfigurace v `~/.gemini/settings.json`:

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

**Pozor:** Gemini CLI vyžaduje při prvním spuštění příznak `--consent`. Toto je
zmíněno v README — nezapomenout doplnit.

### Cursor

Konfigurace v `.cursor/mcp.json` (lokálně pro projekt) nebo v globálním
nastavení Cursoru.

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

Plánované nástroje (upřesnit v docs/architecture.md):

- `get_web_status` — informace o webu (`GET /web`)
- `get_indexed_pages` — počty a vzorky webových stránek (`GET /web/documents`)
- `get_index_history` — historie počtu stránek (`GET /web/documents-history`)
- `get_document_info` — detail konkrétní URL (`GET /web/document`)
- `reindex_url` — reindexace stránky (`POST /web/document/reindex`, limit 500/den)
- `get_database_info` — informace o databázi (`GET /database-info`)
- `list_sites` — výpis nakonfigurovaných webů (bez API klíčů)

---

## Struktura projektu

```
seznam-webmaster-mcp/
├── CLAUDE.md
├── README.md           ← anglická verze
├── README.cs.md        ← česká verze
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        ← vstupní bod, registrace MCP serveru
│   ├── config.ts       ← parsing SEZNAM_WM_SITES, validace
│   ├── api.ts          ← HTTP klient pro Seznam Webmaster API
│   └── tools/
│       ├── status.ts
│       ├── documents.ts
│       ├── history.ts
│       └── reindex.ts
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

- Obsah README (ten jde do README.md / README.cs.md)
- Changelog
- Ukázkové výstupy volání API
- Instalační návod (patří do README)
