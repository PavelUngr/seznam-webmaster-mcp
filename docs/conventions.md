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
- Nikdy nevypisujeme API klíč v žádné chybě ani logu.

## Pojmenování

- Nástroje: `snake_case` (MCP konvence).
- TS funkce a proměnné: `camelCase`.
- TS typy: `PascalCase`.

## Formátování

- 2 mezery odsazení.
- Středníky ano.
- Dvojité uvozovky ve zdrojáku; jednoduché jen když je to uvnitř dvojitých.
