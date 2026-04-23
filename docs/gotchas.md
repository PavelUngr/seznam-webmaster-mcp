# Záludnosti

Seznam věcí, které jsou nečekané, špatně dokumentované nebo snadno přehlédnutelné.

## Seznam Webmaster API

- **HTTP 204 není chyba.** Seznam vrací 204, když se dotaz provedl, ale data zatím nejsou k dispozici (web přidaný do nástroje může mít data dostupná až za 24 hodin). Nástroj musí toto hlásit jako neutrální zprávu „data zatím nejsou dostupná”, ne jako selhání.
- **Kategorie v `/web/documents-history` se jmenují jinak než v `/web/documents`.** V `/web/documents` jsou `content, redirect, index, error`; v `/web/documents-history` jsou `downloaded, redirected, indexed, error`. Při zobrazení uživateli mapujeme na jednotný český popisek, ale v raw JSON necháváme tak, jak přišly od Seznamu.
- **`POST /web/document/reindex` vyžaduje klíč s právem zápisu.** Read-only klíč vrátí HTTP 403. Zprávu o 403 je potřeba odlišit od 401 (chybný klíč), jinak uživatel tápe.
- **`/database-info` nepotřebuje `key`.** Jako jediný endpoint. Tj. `list_sites` + `get_database_info` lze volat i bez nakonfigurované domény.
- **Rate limity: 5/s a 100/min.** Při 429 je třeba počkat a zopakovat. Spec je nedefinuje explicitně, takže používáme jednoduchý exponenciální backoff (500 ms, 1 s, 2 s, max 3 pokusy).
- **Reindex: 500/den.** Server neví, kolikrát bylo volání již použito — až Seznam vrátí chybu a tu předáme uživateli. Neimplementujeme vlastní čítač.

## Parsování konfigurace

- `SEZNAM_WM_SITES` musí být validní JSON array. Pokud chybí nebo je prázdné pole, server se spustí, ale `list_sites` vrátí prázdno a volání s doménou vrátí chybu „doména není nakonfigurována”. Výjimkou je `get_database_info`, který funguje i tak.
- Domény normalizujeme: trim, lowercase. Parametr `domain` od klienta porovnáváme po stejné normalizaci.
- Duplicitní domény v poli: bereme první a varujeme na stderr.

## MCP klienti

- **Gemini CLI** vyžaduje při prvním spuštění příznak `--consent`. Toto patří do README, ne do kódu.
- **Claude Code** a **Cursor** zatím bez zvláštností.

## MCP SDK @1.29

- Low-level `Server` z `@modelcontextprotocol/sdk/server/index.js` je označen jako `@deprecated` ve prospěch `McpServer`. Přesto jsme ho zvolili, protože naše nástroje mají minimální schema a `McpServer` by přinesl jen syntax sugar nad stejnými handlery. Pokud SDK ten low-level API skutečně odstraní, přepíšeme na `McpServer`.
- Návratový typ `setRequestHandler(CallToolRequestSchema, …)` je union, který zahrnuje task-based variantu. TypeScript se pokoušel matchovat proti větvi s polem `task`, které nám chybí. Řešení: explicitní kast na `CallToolResult` uvnitř handleru.

## Abort / timeout detekce

Node 18+ `fetch` vyhazuje při timeoutu (`AbortSignal.timeout`) `DOMException` s `name === "TimeoutError"` nebo `"AbortError"`. V některých verzích Node navíc `err.code === "ABORT_ERR"`. V `api.ts:request` kontrolujeme všechny tři — při přidání nového runtime znovu ověřit, jestli tahle detekce sedí.

## HTTP 400 neznamená vždy „missing key"

Dokumentace Seznam API říká, že `400` znamená chybějící parametr `key`. Naše implementace ale *vždy* posílá `?key=` (validace `SiteConfig.apiKey` při načtení configu garantuje non-empty), takže „skutečné missing-key 400" od nás nikdy nemůže přijít. Pokud 400 přesto přijde, je to něco jiného — proxy, malformovaný dotaz, změna API. Proto mapping `400 → missing_key` byl v `api.ts` odstraněn; 400 padá do `generic` a uživatel uvidí reálný detail od Seznamu.

## Uvozovky v českých stringových literálech v TS

Nepoužívat české uvozovky `„…"` uvnitř JS stringu ohraničeného `"…"` — pravá uvozovka `"` (U+201D) je vizuálně jiná než ASCII `"`, ale TypeScript/Node parser i tak občas kousne na kombinaci (typicky přes JSON minifier nebo po kopírování přes editor, který normalizuje). Bezpečné varianty: použít jednoduché ASCII uvozovky `"..."` s escapem `\"` uvnitř, nebo přepsat formulaci bez uvozovek. Toto zachytil build `src/i18n.ts(29,86): error TS1127: Invalid character` při vývoji v0.1.2.

## Validace vstupů vs. Seznam API

Co validujeme **lokálně** (vrací jasnou chybu bez volání API):
- Datumy v `get_index_history`: formát YYYY-MM-DD + reálné datum v kalendáři + `date_from ≤ date_to`
- URL v `get_document_info` a `reindex_url`: musí být validní absolutní URL se scheme `http(s)`
- Doména: musí být v `SEZNAM_WM_SITES` — `normalizeDomain` stripuje scheme, path a port, aby LLM-shaped vstupy jako `https://example.cz/` matchly konfigurovanému `example.cz`. Úmyslně nestripujeme `www.` (to by přepsalo uživatelovo rozhodnutí v configu).

Co nevalidujeme (necháme odmítnout Seznam API):
- Zda doména v `SEZNAM_WM_SITES` opravdu patří ověřenému webu v Seznam Webmasteru (to ví jen Seznam)
- Zda URL v `get_document_info` / `reindex_url` Seznam crawloval (404 to vyřídí)
- Zda klíč má write oprávnění pro `reindex_url` (403 to vyřídí)

Princip: validovat jen to, co lze ověřit bez síťové latence. Zbytek necháme na API a převedeme chybu na srozumitelnou hlášku.

## Únik API klíče přes upstream error body

Autentizace běží přes query parametr `?key=...`. Když upstream (Cloudflare challenge page, reverzní proxy, load balancer) vrátí HTML/text, který reflektuje request URL zpátky do těla, náš `readErrorDetail` by dostal `?key=abc123...` a ukázal ho klientovi přes `api_error_generic`. Odtud by se klíč dostal do chatu nebo do logu uživatele.

**Řešení od v0.1.3:** `redactApiKey()` v `src/api.ts` skrubuje všechny instance `key=<value>` (query-style) i `"key":"<value>"` (JSON-style) na `REDACTED`, než detail opustí server. Pokud přidáš nový kanál, kterým teče text od API ven (např. debug logging), pusti ho taky přes `redactApiKey`.

Toto je neveřejné pravidlo, ale veřejně slíbené v README a v `docs/conventions.md` („API keys never leave the server"). Kdyby někdy začalo prosakovat, porušujeme vlastní kontrakt.

## API payload Seznam Webmaster je širší než Swagger spec

Swagger spec, z něhož jsou odvozeny TS modely `Web`, `WebDocuments`, `WebHistoryCounts`, `DocumentInfo`, je zjevně starší/neúplný. Třetí audit (23. 4. 2026) ověřil, že živé API vrací navíc:

- `WebDocuments.doc_count` (celkový počet stránek napříč kategoriemi)
- `WebHistoryCounts.content` (alias pro `downloaded`) a `WebHistoryCounts.doc_count`
- `Web.webserver` (identifikace webového serveru)
- `DocumentInfo.responseHeaders[].content` (alias pro `value` — někdy místo něj)

Tyhle pole máme od v0.1.3 jako `optional` v typech (`WebDocuments.doc_count?: number` atd.), plus nový `ResponseHeader` interface pro `value`/`content` dualitu. Dnes to neškodí, protože server všude dumpuje raw JSON přes `JSON.stringify`. Pokud se v budoucnu přidají formattery, selektory nebo testy opřené o typy, mohlo by se to objevit jako regrese. Typy jsou *best effort*, ne kontrakt — API drift je očekávané chování.

## Context-aware 403

Ne každé 403 od Seznam API znamená totéž. Pro `reindex_url` je typický důvod chybějící write oprávnění klíče. Pro read endpointy může jít o omezení přístupu nebo neověřený web. Proto `apiErrorToResult` přijímá od v0.1.3 optional `context: { operation: "reindex" | "read" }` a mapuje na `api_403_reindex` (reindex-specifická rada) nebo `api_403_generic` (neutrální zpráva o oprávněních). Reindex nástroj si kontext explicitně nastavuje; ostatní nástroje dostanou generický default.
