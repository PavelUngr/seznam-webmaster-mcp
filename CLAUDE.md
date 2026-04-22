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

**Verze 0.1.2 — veřejně publikovaná.** Balíček běží na npm, kód a releasy jsou na GitHubu.

- **npm:** [`@pavelungr/seznam-webmaster-mcp@0.1.2`](https://www.npmjs.com/package/@pavelungr/seznam-webmaster-mcp), tag `latest`
- **GitHub:** [`PavelUngr/seznam-webmaster-mcp`](https://github.com/PavelUngr/seznam-webmaster-mcp), default branch `main`, tagy `v0.1.0`, `v0.1.1`, `v0.1.2` s GitHub Releases
- **Instalace:** `npx @pavelungr/seznam-webmaster-mcp` (standard MCP spouštění přes stdio)
- **Kompatibilní MCP klienti:** Claude Desktop, Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor

Hotovo v kódu:
- 7 MCP nástrojů (status, documents, history, reindex, database-info, sites)
- HTTP klient s retry na 429 (500/1000/2000 ms) a timeout 30 s přes `AbortSignal`
- Parsing `SEZNAM_WM_SITES` + `SEZNAM_WM_LANG` s validací a varováním u duplicit
- Lokalizace cs (výchozí) + en, všechny chybové hlášky obsahují návod na řešení
- Striktní validace vstupů: YYYY-MM-DD jako reálné datum v kalendáři, `date_from ≤ date_to`, URL musí mít http(s) scheme
- Verze serveru se čte z `package.json` za běhu (žádný hardcoded string)
- README.md (sloučený CS+EN s anchor navigací), LICENSE (MIT), .gitignore, .npmignore
- docs/architecture.md, docs/conventions.md, docs/gotchas.md

## Roadmap / Naplánované změny

### v0.1.3 (schváleno, čeká na pár code review)

Drobné kvalitativní vylepšení. Čeká se na druhé code review, pak se nasadí v jednom releasu.

- **Retry pro HTTP 502/503** v `api.ts`. Stejný backoff jako 429 (500/1000/2000 ms, max 3 pokusy). Seznam občas hodí mikrovýpadek přes CDN/load balancer, retry to zachytí.
- **`console.error` místo `process.stderr.write`** v `config.ts` a `index.ts`. Funkčně stejné (oba jdou do stderr, nenarušují JSON-RPC na stdout), ale `console.error` je idiomatičtější, přidává newline automaticky.
- Další vstupy z druhého code review — přidají se sem, až dorazí.

### v0.2.0 nebo později

- **Unit testy** přes Vitest (nikoli Jest — Vitest je ESM-native a rychlejší, lépe sedí na náš stack). Pokrýt minimálně: parsing `SEZNAM_WM_SITES` v `config.ts`, fallback cs→key v `i18n.ts`, mapování HTTP status → `ApiErrorKind` v `api.ts`, `optionalDate` a `requireUrl` v `tools/`. Testy psát *před* jakoukoli větší refaktorizací.
- **Preventivní rate limiting** (token bucket pro 5 req/s, 100 req/min) v `ApiClient`. Zatím řešeno jen reaktivně přes 429 retry — dokud nejde o batch operace, vystačíme s tím. Pokud uživatelé budou dělat dávkové operace, doplnit.

## Rozhodnutí (co jsme záměrně neudělali a proč)

### Migrace na `McpServer` + Zod

**Rozhodnuto 2026-04-22: zůstáváme na low-level `Server` z `@modelcontextprotocol/sdk/server/index.js`.**

SDK ho označuje jako `@deprecated` ve prospěch `McpServer`, ale migrace není triviální kvůli našemu požadavku na lokalizované chybové hlášky:

- `McpServer` + Zod by validaci vstupů zjednodušilo (schémata se píšou jednou, TS typy se odvodí automaticky, `z.string().url()` nahradí `requireUrl`, apod.).
- **ALE**: Zod vyhazuje default chybové hlášky v angličtině (`"Invalid url"`, `"Required"`) a vyhazuje je *před* zavoláním handleru, takže náš i18n helper `t(lang, …)` se k nim nedostane.
- Pro zachování lokalizace by bylo potřeba buď `.refine()` s custom `message` na každém poli (vrátí zpět většinu boilerplate, který Zod měl odstranit), nebo globální `errorMap` čtoucí aktuální `SEZNAM_WM_LANG` (komplikace kvůli scopingu — `lang` je per-server, ne globální).
- Chybové hlášky s návodem na řešení jsou reálná feature projektu (v0.1.2 jsme je dolaďovali), nechceme je obětovat pro architektonický úklid.

**Co to znamená pro budoucí sessions**: když narazíš na deprecation marker u `Server` a budeš v pokušení migrovat, přečti si tohle a zvaž, jestli jsi ochoten vyřešit i18n preservation. Pokud ano, plán je: (1) nejdřív unit testy (v0.2.0), (2) pak migrace s custom `errorMap` čtoucí lang z closure per-handler, (3) důkladný smoke test všech chybových cest v obou jazycích.

## Changelog

**v0.1.2** — Bugfix release. (a) Všechny chybové hlášky přepsané tak, aby říkaly *co* se stalo *i co s tím dělat* — včetně odkazů do Seznam Webmasteru, kde řešit ověření klíče, změnu oprávnění atd. (b) Přísnější validace vstupů: datumy se ověřují proti kalendáři (odmítne `2026-02-31`), kontroluje se `date_from ≤ date_to`, URL musí být absolutní a se schématem `http(s)`. (c) Odstraněn zavádějící mapping HTTP 400 → „missing API key" (dead code — sami vždy posíláme `?key=`, takže skutečné „missing key" nikdy nenastane); 400 teď padá do generického handleru, který ukáže skutečný detail ze Seznamu. (d) MCP server advertisuje verzi čtenou z `package.json` za běhu (dřív hardcoded `0.1.0`).

**v0.1.1** — Sjednocení českého a anglického README do jednoho `README.md` (česky první, anglicky po skoku dole). `README.cs.md` ponechán jako krátký pointer. Žádné změny v kódu.

**v0.1.0** — První veřejná publikace. Kompletní sada 7 MCP nástrojů, timeout 30 s, 429 retry, cs/en lokalizace, dokumentace v češtině i angličtině.

## Release workflow (závazný standard)

Při **jakékoli změně**, která se má dostat na npm / GitHub (bugfix, nová funkce, úprava dokumentace), postupuj přesně takhle. Pořadí je důležité, každý krok má svůj důvod.

1. **Implementuj změnu a ověř, že je kompletní.** Build (`npm run build`) musí projít bez chyb, smoke-test (pokud existuje) musí projít, všechny zasažené nástroje musí dál fungovat.
2. **Commitni do gitu** s popisem, který říká *proč*, ne jen *co*. Konvence commit zpráv — viz [commit konvence](#commit-konvence) níže.
3. **Bumpni verzi balíčku** přes `npm version <patch|minor|major>`. Ten zároveň udělá commit (typu „0.1.2") a git tag (`v0.1.2`).
    - `patch` — bugfix, drobnost, oprava dokumentace (0.1.1 → 0.1.2)
    - `minor` — nová funkce nebo nástroj (0.1.x → 0.2.0)
    - `major` — breaking change (změna formátu env proměnných, odstranění nástroje) (0.x.x → 1.0.0)
4. **Pushni na GitHub:** `git push --follow-tags origin main`. Flag `--follow-tags` zajistí, že se s commitem pushne i tag.
5. **Publikuj na npm:** `npm publish --access public`. Flag `--access public` je u scoped balíčku vždy potřeba, jinak npm zkusí privátní publish.
6. **Vytvoř GitHub Release** k tomu tagu: `gh release create vX.Y.Z --latest --title "vX.Y.Z — stručný popis" --notes "..."`. Release notes stručně: co se změnilo, jestli je to breaking, jak udělat upgrade. Bez GitHub Release tag existuje, ale není vidět v sekci Releases — lidé o nové verzi nezví.
7. **Aktualizuj CLAUDE.md:**
    - sekci **Stav** na novou verzi (npm link, aktuální tag)
    - sekci **Changelog** přidat novou položku nahoru
    - pokud změna zavádí nové chování / konvenci / gotchu, aktualizuj i `docs/architecture.md`, `docs/conventions.md` nebo `docs/gotchas.md`
8. **Commitni CLAUDE.md změny** (může být samostatný commit „docs: bump CLAUDE.md to vX.Y.Z") a push. Bez tohoto kroku další session v Claude Code neuvidí, že jsi něco vydal.

Pravidlo #1: **všechny tři zdroje** (npm, GitHub, CLAUDE.md) musí mít stejný obraz stavu. Když se jeden rozejde, příští release workflow se zasekne na kontrole.

### Commit konvence

- `feat(tool-name): ...` — nová funkce
- `fix(file): ...` — bugfix
- `docs: ...` — jen dokumentace
- `refactor: ...` — vnitřní přesun bez změny chování
- `chore: ...` — build / CI / závislosti

### Předpoklady pro release (jednorázově nastaveno)

Tyto věci jsou nastaveny a fungují. Kontroluj jen při změně HW / nového počítače.

- **npm přihlášení** přes granular access token s „Bypass 2FA" v `~/.npmrc`. Expiracia tokenu — viz npmjs.com → Settings → Access Tokens.
- **GitHub auth** přes `gh` CLI (`gh auth status`) — používá se pro `gh release create`.
- **Scope `@pavelungr` na npm** je aktivní a public.

## Historie publikace (pro pochopení, proč je repo strukturované jak je)

- První publish 0.1.0 narazil na npm 2FA pro publish → vyřešeno granular access tokenem s „Bypass 2FA" (uložený v `~/.npmrc`, nikdy ne v gitu).
- Po prvním publish se balíček propagoval do `registry.npmjs.org` okamžitě, ale webová stránka na npmjs.com ~10 min prodlevu — neznepokojuj se, pokud hned po publish stránka hlásí 403 nebo 404.
- `main` větev byla původně prázdná (jen initial commit z GitHubu), veškerý vývoj probíhal na `dev`. Po prvním release byla `main` fast-forward mergnuta na `dev`, default view na GitHubu teď ukazuje celý kód. Do budoucna pracovat rovnou na `main` nebo merge `dev` → `main` před release.

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
