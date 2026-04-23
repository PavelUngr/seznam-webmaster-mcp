import type { Lang } from "./config.js";

type MessageFn = (params?: Record<string, string | number>) => string;
type Messages = Record<string, string | MessageFn>;

function fill(
  template: string,
  params: Record<string, string | number> | undefined,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = params[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

const cs: Messages = {
  domain_not_configured:
    "Doména \"{domain}\" není nakonfigurována v SEZNAM_WM_SITES. Použij nástroj list_sites pro výpis dostupných domén.",
  no_sites_configured:
    "V SEZNAM_WM_SITES není nakonfigurován žádný web. Přidej alespoň jeden záznam {domain, apiKey}.",
  sites_header: "Nakonfigurované weby ({count}):",
  sites_entry: "- {domain}",
  no_data_yet:
    "Data pro doménu \"{domain}\" zatím nejsou k dispozici. U nově přidaných webů mohou data naběhnout až za 24 hodin (HTTP 204).",
  api_401_bad_key:
    "API klíč pro doménu \"{domain}\" je nesprávný (HTTP 401). Co s tím: přihlas se do https://reporter.seznam.cz/wm/, vyber web, jdi do sekce API → Přístupové klíče a ověř, že klíč v SEZNAM_WM_SITES odpovídá. Pokud byl klíč smazán nebo vypršel, vygeneruj nový.",
  api_403_reindex:
    "Přístup odepřen (HTTP 403). Pro reindexaci potřebuješ klíč s oprávněním zápis — read-only klíč stačí pro čtení, ale ne pro POST /web/document/reindex. Co s tím: v https://reporter.seznam.cz/wm/ → API → Přístupové klíče vygeneruj nový klíč s právem zápisu a nahraď ho v SEZNAM_WM_SITES.",
  api_403_generic:
    "Přístup odepřen (HTTP 403). Seznam API odmítl požadavek kvůli oprávněním. Co s tím: ověř v https://reporter.seznam.cz/wm/ → API → Přístupové klíče, že klíč v SEZNAM_WM_SITES patří k této doméně a má dostatečná práva. Pokud jde o chybějící ověření webu, dokončí ho v Seznam Webmasteru.",
  api_404_not_found:
    "Seznam API nenašel požadovaný web nebo stránku (HTTP 404). Co s tím: ověř, že doména je v Seznam Webmasteru ověřená (https://reporter.seznam.cz/wm/) a že URL je přesně ta, kterou Seznam crawloval — pomůže ji zkopírovat z detailu stránky v nástroji, ne psát ručně.",
  api_429_rate_limited:
    "Překročen limit dotazů na Seznam API (HTTP 429) i po opakovaných pokusech. Limit je 5 dotazů/s a 100 dotazů/min na klíč. Co s tím: počkej cca minutu a zkus znovu. Pokud děláš dávkové operace, rozlož je do delšího časového okna.",
  api_5xx_unavailable:
    "Seznam Webmaster API je dočasně nedostupné (HTTP {status}). To je na straně Seznamu, ne tvé konfigurace. Co s tím: zkus za 1–5 minut znovu. Pokud problém trvá déle, mrkni na https://o-seznam.cz, zda není hlášen výpadek.",
  api_error_generic:
    "Seznam API odmítl požadavek (HTTP {status} {statusText}). Detail: {detail}. Co s tím: zkontroluj vstupní parametry (doména, URL, datumy). Pokud je požadavek vypadá správně, může jít o dočasnou chybu Seznamu — zkus to znovu.",
  api_network_error:
    "Chyba sítě při volání Seznam API: {message}. Co s tím: zkontroluj připojení k internetu a že reporter.seznam.cz je z tvojí sítě dostupný (třeba přes prohlížeč). Pokud jsi za firewallem nebo VPN, ověř, že HTTPS na reporter.seznam.cz není blokovaný.",
  api_invalid_json:
    "Seznam API vrátil odpověď, která není platný JSON: {message}. To je dočasná chyba na straně Seznamu. Co s tím: zkus dotaz za chvíli znovu. Pokud problém trvá, nahlas ho na https://o-seznam.cz/napoveda.",
  reindex_ok:
    "Požadavek na reindexaci URL \"{url}\" byl úspěšně odeslán. Zařazení do indexu může nějakou dobu trvat. Denní limit: 500 požadavků na klíč.",
  missing_param: "Chybí povinný parametr \"{name}\".",
  invalid_date_format:
    "Neplatný formát parametru \"{name}\" — očekává se YYYY-MM-DD a skutečné datum v kalendáři.",
  invalid_date_range:
    "Neplatný rozsah dat: date_from ({from}) musí být dříve nebo stejně jako date_to ({to}).",
  invalid_url:
    "Parametr \"{name}\" není platná absolutní URL. Očekává se adresa začínající http:// nebo https://, např. https://example.cz/stranka.",
  internal_error:
    "Vnitřní chyba MCP serveru při zpracování nástroje \"{tool}\". Detaily byly zapsány na stderr. Co s tím: zkus operaci znovu. Pokud problém přetrvává, nahlas issue na https://github.com/pavelungr/seznam-webmaster-mcp/issues s popisem, co jsi dělal, a časem chyby.",
  no_data_simple: "(data nejsou k dispozici)",
  unknown_tool: "Neznámý nástroj: {name}",
  web_status_header: "Stav webu {domain}:",
  documents_header: "Počty stránek pro {domain}:",
  document_detail_header: "Detail stránky {url}:",
  history_header: "Historie indexace pro {domain}:",
  database_info_header: "Informace o databázi Seznam Webmaster:",
};

const en: Messages = {
  domain_not_configured:
    "Domain \"{domain}\" is not configured in SEZNAM_WM_SITES. Use the list_sites tool to see available domains.",
  no_sites_configured:
    "No sites are configured in SEZNAM_WM_SITES. Add at least one {domain, apiKey} entry.",
  sites_header: "Configured sites ({count}):",
  sites_entry: "- {domain}",
  no_data_yet:
    "Data for domain \"{domain}\" is not available yet. Newly added sites can take up to 24 hours for data to appear (HTTP 204).",
  api_401_bad_key:
    "API key for domain \"{domain}\" is invalid (HTTP 401). How to fix: log in at https://reporter.seznam.cz/wm/, select the site, go to API → Access keys (Přístupové klíče) and verify the key in SEZNAM_WM_SITES matches. If the key was revoked or expired, generate a new one.",
  api_403_reindex:
    "Access denied (HTTP 403). Reindexing requires a key with write permission — a read-only key works for reads but not for POST /web/document/reindex. How to fix: in https://reporter.seznam.cz/wm/ → API → Access keys, generate a new key with write permission and replace it in SEZNAM_WM_SITES.",
  api_403_generic:
    "Access denied (HTTP 403). Seznam API rejected the request due to permissions. How to fix: verify in https://reporter.seznam.cz/wm/ → API → Access keys that the key in SEZNAM_WM_SITES belongs to this domain and has sufficient permissions. If the site verification is incomplete, finish it in Seznam Webmaster.",
  api_404_not_found:
    "Seznam API could not find the requested site or page (HTTP 404). How to fix: verify the domain is verified in Seznam Webmaster (https://reporter.seznam.cz/wm/) and that the URL matches exactly what Seznam crawled — it helps to copy the URL from the page detail in the tool rather than typing it manually.",
  api_429_rate_limited:
    "Seznam API rate limit exceeded (HTTP 429) even after retries. The limit is 5 requests/s and 100 requests/min per key. How to fix: wait about a minute and try again. For batch operations, spread them out over time.",
  api_5xx_unavailable:
    "Seznam Webmaster API is temporarily unavailable (HTTP {status}). This is on Seznam's side, not your configuration. How to fix: try again in 1–5 minutes. If the problem persists, check https://o-seznam.cz for outage reports.",
  api_error_generic:
    "Seznam API rejected the request (HTTP {status} {statusText}). Detail: {detail}. How to fix: check your input parameters (domain, URL, dates). If the request looks correct, this may be a temporary issue on Seznam's side — try again.",
  api_network_error:
    "Network error calling Seznam API: {message}. How to fix: check your internet connection and that reporter.seznam.cz is reachable from your network (try it in a browser). If you're behind a firewall or VPN, verify HTTPS to reporter.seznam.cz is not blocked.",
  api_invalid_json:
    "Seznam API returned a response that isn't valid JSON: {message}. This is a temporary issue on Seznam's side. How to fix: retry the request shortly. If the problem persists, report it via https://o-seznam.cz/napoveda.",
  reindex_ok:
    "Reindex request for URL \"{url}\" was submitted successfully. Indexing may take some time. Daily limit: 500 requests per key.",
  missing_param: "Missing required parameter \"{name}\".",
  invalid_date_format:
    "Invalid format for parameter \"{name}\" — expected YYYY-MM-DD and a real calendar date.",
  invalid_date_range:
    "Invalid date range: date_from ({from}) must be earlier than or equal to date_to ({to}).",
  invalid_url:
    "Parameter \"{name}\" is not a valid absolute URL. Expected an http:// or https:// address, e.g. https://example.cz/page.",
  internal_error:
    "Internal error in the MCP server while handling tool \"{tool}\". Details were written to stderr. How to fix: retry the operation. If the issue persists, report it at https://github.com/pavelungr/seznam-webmaster-mcp/issues with a description of what you were doing and the time the error occurred.",
  no_data_simple: "(no data available)",
  unknown_tool: "Unknown tool: {name}",
  web_status_header: "Site status for {domain}:",
  documents_header: "Page counts for {domain}:",
  document_detail_header: "Page detail for {url}:",
  history_header: "Indexation history for {domain}:",
  database_info_header: "Seznam Webmaster database info:",
};

const dictionaries: Record<Lang, Messages> = { cs, en };

export function t(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = dictionaries[lang];
  const entry = dict[key] ?? cs[key];
  if (entry === undefined) {
    return key;
  }
  const template = typeof entry === "function" ? entry(params) : entry;
  return fill(template, params);
}
