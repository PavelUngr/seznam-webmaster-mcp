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

**Na npm je 0.1.3, kód na `main` je 0.1.4, která se na npm nikdy nedostala.** Publikace 0.1.4 (2026-06-12) selhala na vypršeném npm tokenu (401). Tag `v0.1.4` na GitHubu existuje, GitHub Release k němu ne. Opravy z 0.1.4 vyjdou v 0.1.5 přes Trusted Publishing (viz Roadmap).

- **npm:** [`@pavelungr/seznam-webmaster-mcp@0.1.3`](https://www.npmjs.com/package/@pavelungr/seznam-webmaster-mcp), tag `latest`
- **GitHub:** [`PavelUngr/seznam-webmaster-mcp`](https://github.com/PavelUngr/seznam-webmaster-mcp), default branch `main`, tagy `v0.1.0` až `v0.1.4`, GitHub Releases `v0.1.0` až `v0.1.3`
- **CI:** GitHub Actions workflow `.github/workflows/ci.yml` — build + smoke test + `npm audit` na Node 18/20/22 při každém push do `main`/`dev` a každém PR
- **Instalace:** `npx @pavelungr/seznam-webmaster-mcp` (standard MCP spouštění přes stdio)
- **Kompatibilní MCP klienti:** Claude Desktop, Claude Code, OpenAI Codex CLI, Gemini CLI, Cursor

Hotovo v kódu:
- 7 MCP nástrojů (status, documents, history, reindex, database-info, sites)
- HTTP klient s retry na 429/502/503 (500/1000/2000 ms) a timeout 30 s přes `AbortSignal`
- Parsing `SEZNAM_WM_SITES` + `SEZNAM_WM_LANG` s validací a varováním u duplicit
- Robustní `normalizeDomain` — strip scheme, userinfo, path, port, trailing dot (zachovat `www.`)
- Lokalizace cs (výchozí) + en, všechny chybové hlášky obsahují návod na řešení
- Context-aware HTTP 403 (reindex vs. read)
- Striktní validace vstupů: YYYY-MM-DD jako reálné datum v kalendáři, `date_from ≤ date_to`, URL musí mít http(s) scheme
- **Redakce API klíče** přes `redactApiKey` ze všech kanálů, kudy by mohl odejít (`readErrorDetail`, fetch error message)
- Sanitizace tool name v error hlášce — chrání před ANSI escape sequences a podobnými payloady
- Lokalizovaná chybová hláška pro interní výjimky (stack jen do stderr, klient dostane generic)
- TS modely rozšířené o pole přítomná v reálném API (ale ne ve Swagger spec): `doc_count`, `content` v history, `webserver`, `ResponseHeader.content`
- Verze serveru se čte z `package.json` za běhu (žádný hardcoded string)
- Build čistí `dist/` před `tsc` (žádný shipping stale souborů)
- README.md (sloučený CS+EN s anchor navigací), LICENSE (MIT), .gitignore, .npmignore
- CHANGELOG.md (Keep a Changelog formát)
- docs/architecture.md, docs/conventions.md, docs/gotchas.md
- tests/smoke.mjs (30 assertů, runable přes `npm run smoke`)
- .github/workflows/ci.yml (build + smoke + audit na Node 18/20/22)

## Roadmap / Naplánované změny

### v0.1.5 — ve vydávání od 2026-10-07

Vydání obsahuje všechny opravy z 0.1.4 (ta na npm nikdy nebyla) a navíc:

- **Publikace přes npm Trusted Publishing (OIDC z GitHub Actions) se staged publishing** místo tokenu v `~/.npmrc`. Důvody a nastavení jsou v sekcích Rozhodnutí a Předpoklady pro release.
  - workflow `.github/workflows/publish.yml` (pushnutý dřív, 2026-10-07, protože formulář npm vyžaduje existující soubor)
  - `repository.url` (a `homepage`, `bugs`) v `package.json` opravit z `pavelungr` na `PavelUngr`. Trusted Publishing vyžaduje přesnou shodu včetně velikosti písmen.
  - **Termín:** npm chce konfiguraci Trusted Publisheru ověřit první publikací **do 2026-10-09 19:46 UTC**, jinak je potřeba ji založit znovu.
  - Po prvním úspěšném vydání přepnout na npm Publishing access na „Require two-factor authentication and disallow tokens" a zrušit starý (už vypršelý) token.
  - **Proč 0.1.5, ne 0.1.4:** tag `v0.1.4` ukazuje na commit bez publikačního workflow a se špatnou velikostí písmen v `repository.url`. Pushnutý tag nepřesouváme, 0.1.4 zůstane jen jako git tag (zaznamenáno v CHANGELOG.md).
- **Opravit výklad `downloaded` v kódu.** Popis nástroje `get_index_history` v `src/tools/history.ts` tvrdí „downloaded (= content)" a komentář u `WebHistoryCounts.content` v `src/api.ts` „same as downloaded". Obojí je špatně (viz sekce API níže). Popis nástroje čte AI asistent, takže chybný výklad se propisuje do jeho odpovědí.

### v0.2.0 nebo později

- **Unit testy** přes Vitest (nikoli Jest — Vitest je ESM-native a rychlejší, lépe sedí na náš stack). Přidat i `test` a `lint` script do `package.json`. Pokrýt minimálně: parsing `SEZNAM_WM_SITES` v `config.ts`, fallback cs→key v `i18n.ts`, mapování HTTP status → `ApiErrorKind` v `api.ts`, `optionalDate` / `requireUrl` / `normalizeDomain` v `tools/` a `config/`. Testy psát *před* jakoukoli větší refaktorizací.
- **Preventivní rate limiting** (token bucket pro 5 req/s, 100 req/min) v `ApiClient`. Zatím řešeno jen reaktivně přes 429 retry — pro dávkové operace (např. LLM, který ze smyčky volá `reindex_url` pro stovky URL) by preventivní throttling byl lepší.

## Rozhodnutí (co jsme záměrně neudělali a proč)

### Migrace na `McpServer` + Zod

**Rozhodnuto 2026-04-22: zůstáváme na low-level `Server` z `@modelcontextprotocol/sdk/server/index.js`.**

SDK ho označuje jako `@deprecated` ve prospěch `McpServer`, ale migrace není triviální kvůli našemu požadavku na lokalizované chybové hlášky:

- `McpServer` + Zod by validaci vstupů zjednodušilo (schémata se píšou jednou, TS typy se odvodí automaticky, `z.string().url()` nahradí `requireUrl`, apod.).
- **ALE**: Zod vyhazuje default chybové hlášky v angličtině (`"Invalid url"`, `"Required"`) a vyhazuje je *před* zavoláním handleru, takže náš i18n helper `t(lang, …)` se k nim nedostane.
- Pro zachování lokalizace by bylo potřeba buď `.refine()` s custom `message` na každém poli (vrátí zpět většinu boilerplate, který Zod měl odstranit), nebo globální `errorMap` čtoucí aktuální `SEZNAM_WM_LANG` (komplikace kvůli scopingu — `lang` je per-server, ne globální).
- Chybové hlášky s návodem na řešení jsou reálná feature projektu (v0.1.2 jsme je dolaďovali), nechceme je obětovat pro architektonický úklid.

**Co to znamená pro budoucí sessions**: když narazíš na deprecation marker u `Server` a budeš v pokušení migrovat, přečti si tohle a zvaž, jestli jsi ochoten vyřešit i18n preservation. Pokud ano, plán je: (1) nejdřív unit testy (v0.2.0), (2) pak migrace s custom `errorMap` čtoucí lang z closure per-handler, (3) důkladný smoke test všech chybových cest v obou jazycích.

### Publikace přes Trusted Publishing se schvalováním (staged)

**Rozhodnuto 2026-10-07.** Na npm se publikuje jen z workflow `publish.yml` přes OIDC, bez jakéhokoli tokenu, a workflow smí pouze `npm stage publish`. Verze tedy čeká ve frontě, dokud ji uživatel na npmjs.com neschválí (Approve + 2FA).

- Proč Trusted Publishing: granular token s „Bypass 2FA" vypršel podruhé za necelé dva měsíce a kvůli tomu se bezpečnostní opravy z 0.1.4 čtyři měsíce nedostaly na npm. Bez tokenu nic nevyprší a nic nejde ukrást z `~/.npmrc`.
- Proč staged a ne přímý `npm publish`: npm přímou publikaci u Trusted Publisheru výslovně označuje „Not recommended". Se staged nic nejde ven bez 2FA uživatele, ani kdyby někdo ovládl GitHub účet nebo workflow. Balíček běží uživatelům na počítači a pracuje s jejich API klíči, takže ochrana dodavatelského řetězce má váhu. Cena je jedno schválení na webu u každého vydání.
- Přechod na přímou publikaci by znamenal zaškrtnout „Allow npm publish" u Trusted Publisheru na npm a ve workflow změnit `npm stage publish` na `npm publish`.

### Kontext pro HTTP 403 zůstává ruční

**Rozhodnuto 2026-04-23.** Rozlišení 403 pro reindex a čtecí endpointy se předává ručně parametrem `{ operation: "reindex" }` z `reindex.ts`, ne automaticky z `ApiClient`. Zapisovací endpoint je jediný a obecný mechanismus by byl zbytečně složitý. Pokud přibude další zapisovací endpoint, přesunout informaci o zápisu do `ApiClient` (typicky do `RequestOptions`), aby se na kontext nedalo zapomenout.

### TypeScript modely API s explicitními volitelnými poli

**Rozhodnuto 2026-04-23.** Pole, která živé API vrací navíc proti swaggeru (`doc_count`, `content` v historii, `webserver`, `ResponseHeader.content`), jsou v typech jako explicitní volitelná pole, ne jako obecný indexer `[key: string]: unknown`. Explicitní pole zároveň slouží jako dokumentace toho, co jsme v API reálně viděli. Server payload stejně předává klientovi beze změny přes `JSON.stringify`, takže na typy se za běhu nic nespoléhá.

## Changelog

Podrobný changelog s každou verzí je v samostatném souboru [CHANGELOG.md](CHANGELOG.md) (formát Keep a Changelog). Tady už ho nevedeme — Stav výše drží aktuální verzi a CHANGELOG.md drží historii. Při releasu novou položku do CHANGELOG.md, ne sem.

## Release workflow (závazný standard)

Při **jakékoli změně**, která se má dostat na npm / GitHub (bugfix, nová funkce, úprava dokumentace), postupuj přesně takhle. Pořadí je důležité, každý krok má svůj důvod.

1. **Implementuj změnu a ověř, že je kompletní.** Build a smoke test (`npm run smoke`) musí projít, všechny zasažené nástroje musí dál fungovat.
2. **Aktualizuj `CHANGELOG.md`** — novou položku nahoru ve formátu Keep a Changelog (sekce `### Security` / `### Fixed` / `### Added` / `### Changed` / `### Removed` podle toho, co se mění) a porovnávací odkazy na konci. Musí být v commitu před bumpem verze, aby byla součástí taggovaného commitu.
3. **Commitni do gitu** s popisem, který říká *proč*, ne jen *co*. Konvence commit zpráv — viz [commit konvence](#commit-konvence) níže.
4. **Bumpni verzi balíčku** přes `npm version <patch|minor|major>`. Ten zároveň udělá commit (typu „0.1.2") a git tag (`v0.1.2`).
    - `patch` — bugfix, drobnost, oprava dokumentace (0.1.1 → 0.1.2)
    - `minor` — nová funkce nebo nástroj (0.1.x → 0.2.0)
    - `major` — breaking change (změna formátu env proměnných, odstranění nástroje) (0.x.x → 1.0.0)
5. **Pushni na GitHub:** `git push --follow-tags origin main`. Flag `--follow-tags` zajistí, že se s commitem pushne i tag. Push sám nic nepublikuje, jen spustí CI (`ci.yml`). Počkej, až CI projde.
6. **Vytvoř GitHub Release** k tagu: `gh release create vX.Y.Z --latest --title "vX.Y.Z — stručný popis" --notes "..."`. Release notes stručně: co se změnilo, jestli je to breaking, jak udělat upgrade. Publikováním release se spustí `publish.yml`: zkontroluje shodu tagu s `package.json`, buildne, projde smoke test a přes Trusted Publishing (OIDC) zavolá `npm stage publish`. Lokálně se `npm publish` nikdy nespouští.
7. **Ověř běh workflow** (`gh run list --workflow publish.yml`) a z jeho logu vytáhni informace o připravené verzi.
8. **Požádej uživatele o schválení.** Verze čeká ve frontě na npm, dokud ji uživatel na npmjs.com neschválí (Approve + 2FA). Claude to udělat nemůže, schválení vyžaduje interaktivní 2FA. Po schválení ověř `npm view @pavelungr/seznam-webmaster-mcp version`.
9. **Aktualizuj CLAUDE.md:**
    - sekci **Stav** na novou verzi (npm link, aktuální tag)
    - pokud změna zavádí nové chování / konvenci / gotchu, aktualizuj i `docs/architecture.md`, `docs/conventions.md` nebo `docs/gotchas.md`
    - **NE** přidávej do CLAUDE.md changelog — to patří do `CHANGELOG.md`. CLAUDE.md drží jen aktuální stav.
10. **Commitni docs změny** jako samostatný commit „docs: bump to vX.Y.Z" a push. Bez tohoto kroku další session v Claude Code neuvidí, že jsi něco vydal.

Pravidlo #1: **všechny tři zdroje** (npm, GitHub, CLAUDE.md) musí mít stejný obraz stavu. Když se jeden rozejde, příští release workflow se zasekne na kontrole.

### Commit konvence

- `feat(tool-name): ...` — nová funkce
- `fix(file): ...` — bugfix
- `docs: ...` — jen dokumentace
- `refactor: ...` — vnitřní přesun bez změny chování
- `chore: ...` — build / CI / závislosti

### Předpoklady pro release (jednorázově nastaveno)

Tyto věci jsou nastaveny a fungují. Kontroluj jen při změně HW / nového počítače.

- **npm Trusted Publisher** (od 2026-10-07), nastavený na npmjs.com → balíček → Settings → Trusted Publisher: GitHub Actions, `PavelUngr` / `seznam-webmaster-mcp` / `publish.yml`, bez environmentu, povolené jen `npm stage publish`. Vlastník, repozitář a workflow nejdou upravit, jen smazat a založit znovu. Žádný npm token se nepoužívá. Token v `~/.npmrc` je vypršelý a k vydání ho nepotřebujeme.
- **GitHub auth** přes `gh` CLI (`gh auth status`) — používá se pro `gh release create` a kontrolu běhů workflow.
- **Scope `@pavelungr` na npm** je aktivní a public.

## Historie publikace (pro pochopení, proč je repo strukturované jak je)

- První publish 0.1.0 narazil na npm 2FA pro publish → vyřešeno granular access tokenem s „Bypass 2FA" (uložený v `~/.npmrc`, nikdy ne v gitu).
- Po prvním publish se balíček propagoval do `registry.npmjs.org` okamžitě, ale webová stránka na npmjs.com ~10 min prodlevu — neznepokojuj se, pokud hned po publish stránka hlásí 403 nebo 404.
- `main` větev byla původně prázdná (jen initial commit z GitHubu), veškerý vývoj probíhal na `dev`. Po prvním release byla `main` fast-forward mergnuta na `dev`, default view na GitHubu teď ukazuje celý kód. Do budoucna pracovat rovnou na `main` nebo merge `dev` → `main` před release.
- 2026-06-12 publikace 0.1.4 selhala na vypršeném tokenu (401) a do října nikdo nepublikoval. 0.1.4 proto existuje jen jako git tag. 2026-10-07 přechod na Trusted Publishing se staged publishing a vydání 0.1.5.

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
**Swagger spec:** veřejně dostupný bez přihlášení (ověřeno 2026-10-07), ve dvou variantách:
- `https://reporter.seznam.cz/wm/swagger.json` — verze, kterou načítá dokumentace v přihlášeném rozhraní (API → Popis a dokumentace)
- `https://reporter.seznam.cz/wm-api/swagger.json` — verze generovaná přímo službou, má novější popisy (viz níže). Uvádí `basePath: /wm-api/wm-api`, to je artefakt generátoru; volá se `/wm-api/...`.

Obě jsou Swagger 2.0, verze API 0.1, se stejnými endpointy a modely. Snímek novější varianty je v [docs/swagger.json](docs/swagger.json) — při podezření na změnu API ho porovnej s aktuální verzí.

**Základní URL:** `https://reporter.seznam.cz/wm-api`

**Autentizace:** query parametr `?key={apiKey}` (povinný u každého volání kromě `/database-info`). Jediný sdílený parametr ve specifikaci; **žádný endpoint nemá parametr pro výběr webu a žádný endpoint nevypisuje weby účtu**.

**Rozsah klíče: jeden klíč = jeden web (ověřeno 2026-10-07).** Každý web v Seznam Webmasteru má vlastní API klíč a klíč sám určuje, o který web jde. Proto endpointy nemají parametr pro výběr webu a proto konfigurace `SEZNAM_WM_SITES` páruje doménu s klíčem. Klíč pro celý účet neexistuje a nástroj, který by jedním klíčem viděl všechny weby účtu, nad tímto API postavit nejde. Domněnka, že je klíč jeden na účet, se při testu nepotvrdila. Zápis tu zůstává, aby se otázka znovu neotevírala.

Test reálným klíčem jednoho webu 2026-10-07 (jen čtecí volání):
- `/web`, `/web/documents`, `/web/documents-history` vrátily data jen webu, ke kterému klíč patří (všech 1 579 ukázkových URL z jeho domény).
- `/web/document` pro URL jiného webu téhož uživatele vrátil **403**.
- `/web` vrací navíc pole `webserver` s identifikátorem webu ve tvaru obrácené domény a portu (např. `cz.tsmkurzy.!443`). Z něj jde spolehlivě zjistit, ke kterému webu klíč patří.
- Živá data potvrzují význam kategorií historie: `downloaded` (2 654) = `doc_count` (2 654) ≠ `content` (1 936).

### Endpointy

#### GET /web
Vrátí úplné informace o webu (documents + history v jedné odpovědi).
Parametry: `key` (povinný)
Odpověď 200: model `Web` (`{documents: WebDocuments, history: WebHistory[]}`)

#### GET /web/documents
Vrátí počty stránek webu po kategoriích + náhodný vzorek max. 1 000 URL.
Parametry: `key` (povinný)
Kategorie: `content` (stažené), `redirect`, `index`, `error`; novější popis přidává `doc_count` (počet stránek, o jejichž existenci robot ví)
Odpověď 200: model `WebDocuments` (`{content, redirect, index, error}` — každá je `WebUrl`; `doc_count` v modelu swaggeru chybí, živé API ho vrací)

#### GET /web/documents-history
Vrátí vývoj počtu stránek po dnech.
Parametry: `key` (povinný), `date_from` (datum, nepovinný), `date_to` (datum, nepovinný)
Kategorie v odpovědi (podle novějšího popisu služby, 2026-10-07):
- `doc_count` — počet stránek, o jejichž existenci robot ví
- `content` — počet stránek, které robot stahuje a zná jejich obsah
- `downloaded` — počet stránek objevených robotem; **zastaralé, nahrazeno `doc_count`**
- `redirected`, `indexed`, `error`

Odpověď 200: array `WebHistory[]` (model ve swaggeru uvádí jen `error, downloaded, redirected, indexed`)

Pozor: názvy kategorií se liší od `/web/documents` (`redirected` vs `redirect`, `indexed` vs `index`). **`downloaded` NENÍ jiný název pro `content`** — odpovídá `doc_count`. Do v0.1.4 jsme to v kódu i docs tvrdili chybně (oprava viz Roadmap).

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

Podle swaggeru „ověřováno pro každého uživatele a pro každý web":

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
