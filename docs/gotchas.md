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
