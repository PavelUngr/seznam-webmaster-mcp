# Konvence

## Kód

- **TypeScript strict**. `strict: true`, `noUncheckedIndexedAccess: true`.
- **ESM**, `"type": "module"` v `package.json`.
- **Bez runtime závislostí navíc** — pouze `@modelcontextprotocol/sdk`. Fetch je nativní v Node 18+.
- **Node >= 18** (kvůli globálnímu `fetch`).

## Export nástroje

Každý soubor v `src/tools/*.ts` exportuje factory funkci, která dostane `ToolDeps = { config, api }` a vrátí pole definic nástrojů:

```ts
export function buildStatusTools(deps: ToolDeps): ToolDefinition[] { ... }
```

Sdílené helpery (resolve domény → site, unwrap `ApiResult` → `ToolResult`, lokalizované chybové hlášky) jsou v `src/tools/common.ts`.

`ToolDefinition` má tvar:

```ts
{
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: {...}; required: string[] };
  handler: (args: unknown) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
}
```

## Chybové hlášky

- Veškeré texty na uživatele jdou přes `t(lang, key, params?)`.
- API chyby převádíme na `{ isError: true, content: [{ type: "text", text: ... }] }`.
- **Nikdy nevypisujeme API klíč** v žádné chybě ani logu. Tahle invarianta je nesena přes `redactApiKey()` v `src/api.ts`, která scrubuje `key=<value>` (query a JSON tvar). Volá se z `readErrorDetail` (chyby od API) a z catch bloku kolem `fetch()` (síťové chyby). Pokud přidáš nový kanál, kudy teče text od API ven (debug logging, telemetrie, novej response path), pust ho taky přes `redactApiKey`. Smoke test (`tests/smoke.mjs`) má dedikované asserty na všechny tvary, ve kterých klíč může uniknout.
- Tool name v error hlášce sanitujeme přes `sanitizeToolName()` v `src/index.ts` — povolené jsou `[a-zA-Z0-9_\-:]`, ostatní znaky se nahrazují `?`, délka se ořezává na 64. Brání ANSI escapes a podobným payloadům od buggy klienta.

## Pojmenování

- Nástroje: `snake_case` (MCP konvence).
- TS funkce a proměnné: `camelCase`.
- TS typy: `PascalCase`.

## Formátování

- 2 mezery odsazení.
- Středníky ano.
- Dvojité uvozovky ve zdrojáku; jednoduché jen když je to uvnitř dvojitých.

## Testy a CI

- `tests/smoke.mjs` — runable přes `npm run smoke` (uvnitř volá build, pak `node tests/smoke.mjs`). Pure-funkce + server boot + validace vstupů + že klíč neuteče do stderr. Když opravíš bug nebo přidáš nástroj, **doplň assert** sem.
- `.github/workflows/ci.yml` — build + smoke + `npm audit --omit=dev` na každém push do `main`/`dev` a každém PR, matrix Node 18/20/22. Pokud CI selže, opravit dřív, než pustíš release.
- Žádný formální testovací framework (Vitest, Jest). Plánovaný v0.2.0.

## Build

- `npm run build` = `npm run clean && tsc`. `clean` smaže celý `dist/` před `tsc`, aby v něm nezůstaly stale soubory po smazaných/přejmenovaných zdrojácích.
- `prepublishOnly` volá `npm run build` automaticky — `npm publish` vždy ship buildem z čistého stavu.
