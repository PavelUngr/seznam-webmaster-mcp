# seznam-webmaster-mcp

MCP server pro [Seznam Webmaster API](https://o-seznam.cz/napoveda/vyhledavani/seznam-webmaster/). Umožňuje AI asistentům (Claude, Codex, Gemini, Cursor) pracovat s daty indexace, stavem webu a odesíláním URL k reindexaci přes přirozený jazyk.

**English version:** [README.md](README.md)

## K čemu to je

Pokud spravujete více klientských webů v Seznam Webmasteru, otevíráte deset záložek, kopírujete klíče, klikáte se k číslům. Tenhle server to změní: zeptáte se Claude „kolik stránek má fenek.cz v indexu?" nebo „pošli k reindexaci /sluzby/seo", a AI asistent zavolá Seznam API za vás.

Nástroj je primárně vyrobený pro vlastní potřebu — správu více webů z jednoho místa —, ale je veřejně dostupný pro celou SEO komunitu.

## Co umí

Sedm nástrojů, které AI asistent může volat:

- **get_web_status** — úplný přehled o webu (počty stránek po kategoriích plus historie indexace)
- **get_indexed_pages** — počty stažených, přesměrovaných, zaindexovaných a chybových stránek, včetně vzorku URL
- **get_index_history** — vývoj počtu stránek po dnech, volitelně v rozsahu dat
- **get_document_info** — detail konkrétní URL (title, meta, OpenGraph, hlavičky, timestamp indexace)
- **reindex_url** — požadavek na reindexaci URL (vyžaduje klíč s právem zápisu, limit 500 za den)
- **get_database_info** — verze databáze Seznam Webmaster
- **list_sites** — seznam nakonfigurovaných domén (API klíče nikdy nevypíše)

## Předpoklady

- **Node.js 18 a novější** (server potřebuje nativní `fetch`)
- **API klíč** ze Seznam Webmasteru pro každý web, který chcete spravovat

### Jak získat API klíč

1. Přihlaste se do [https://reporter.seznam.cz/wm/](https://reporter.seznam.cz/wm/)
2. Vyberte web ze seznamu
3. Přejděte do sekce **API** → **Přístupové klíče**
4. Vygenerujte nový klíč. Pro `reindex_url` potřebujete klíč s oprávněním **zápis**, pro ostatní stačí **čtení**.

## Konfigurace

API klíče a jazyk odpovědí se předávají přes proměnné prostředí.

### Proměnná SEZNAM_WM_SITES

JSON pole objektů ve tvaru `{domain, apiKey}`:

```json
[
  {"domain": "example.cz", "apiKey": "abc123"},
  {"domain": "other.cz",   "apiKey": "xyz789"}
]
```

V konfiguraci MCP klienta se předává jako řetězec — JSON musí být escapovaný. Viz příklady níže.

### Proměnná SEZNAM_WM_LANG

Jazyk textových zpráv serveru. Podporované hodnoty: `cs` (výchozí) a `en`. Týká se jen zpráv generovaných tímto serverem, nikoli obsahu z API.

## Nastavení v klientech

### Claude Desktop a Claude Code

Přidejte do konfigurace (`claude_desktop_config.json`, případně projektové `.mcp.json`):

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "cs"
      }
    }
  }
}
```

### OpenAI Codex CLI

V `~/.codex/config.toml`:

```toml
[mcp_servers.seznam-webmaster]
command = "npx"
args    = ["@pavelungr/seznam-webmaster-mcp"]

[mcp_servers.seznam-webmaster.env]
SEZNAM_WM_SITES = '[{"domain":"example.cz","apiKey":"abc123"}]'
SEZNAM_WM_LANG = "cs"
```

### Gemini CLI

V `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "seznam-webmaster": {
      "command": "npx",
      "args": ["@pavelungr/seznam-webmaster-mcp"],
      "env": {
        "SEZNAM_WM_SITES": "[{\"domain\":\"example.cz\",\"apiKey\":\"abc123\"}]",
        "SEZNAM_WM_LANG": "cs"
      }
    }
  }
}
```

Gemini CLI vyžaduje při prvním spuštění příznak `--consent` pro odsouhlasení spuštění externího MCP serveru.

### Cursor

V `.cursor/mcp.json` (lokálně pro projekt) nebo v globálním nastavení Cursoru:

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

## Ukázky použití

Po nastavení stačí napsat asistentovi něco v tomto duchu:

- „Jaký je stav webu example.cz?"
- „Kolik stránek má example.cz v indexu a kolik chybových?"
- „Ukaž mi vývoj indexace za posledních 30 dní."
- „Co Seznam ví o stránce https://example.cz/kontakt?"
- „Pošli URL https://example.cz/novinka k reindexaci."
- „Které domény jsou nakonfigurované?"

Server vrátí strukturovanou odpověď z API, asistent ji interpretuje.

## Limity a známé chování

**Limity Seznam API:**
- nejvýše 5 dotazů za vteřinu a 100 dotazů za minutu
- `reindex_url` lze volat nejvýše 500krát za den na jeden klíč
- nová data se u nově přidaného webu objeví do 24 hodin

**Co na to server reaguje:**
- Při překročení rate limitu (HTTP 429) server automaticky čeká a opakuje pokus — 500 ms, 1 s, 2 s, max tři pokusy.
- HTTP 204 není chyba. Seznam ho vrací, když je dotaz přijat, ale data ještě neexistují (typicky u čerstvě přidaného webu). Server to hlásí jako „data zatím nejsou k dispozici".
- Při HTTP 403 u reindexu server vysvětlí, že klíč pravděpodobně nemá právo zápisu.
- API klíče nikdy neopouštějí server — nevypisují se do žádné odpovědi ani chybové hlášky.

**Beta stav nástroje:** Seznam Webmaster je dlouhodobě v beta provozu. Data občas vykazují propady nebo chybí. Jde o nedostupnost dat pro nástroj, ne o výpadek vlastního indexu.

## Vývoj

### Lokální build

```bash
git clone https://github.com/pavelungr/seznam-webmaster-mcp.git
cd seznam-webmaster-mcp
npm install
npm run build
```

### Spuštění z lokálního buildu

```bash
SEZNAM_WM_SITES='[{"domain":"example.cz","apiKey":"test"}]' \
node dist/index.js
```

Server komunikuje přes stdio — ručně ho budete testovat jen přes MCP klienta, ne v terminálu.

### Struktura projektu

```
src/
  index.ts       — vstupní bod, registrace MCP serveru
  config.ts      — parsing SEZNAM_WM_SITES a SEZNAM_WM_LANG
  api.ts         — HTTP klient pro Seznam Webmaster API
  i18n.ts        — české a anglické zprávy
  tools/         — jednotlivé MCP nástroje
docs/            — interní znalostní báze (architektura, konvence, záludnosti)
```

## Licence

MIT — viz [LICENSE](LICENSE).

## Autor

Pavel Ungr ([pavelungr.cz](https://www.pavelungr.cz), [jsem@pavelungr.cz](mailto:jsem@pavelungr.cz))

Pull requesty a issues vítány na [GitHubu](https://github.com/pavelungr/seznam-webmaster-mcp/issues).
