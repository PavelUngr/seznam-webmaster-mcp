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
  api_400_missing_key:
    "Seznam API hlásí, že chybí API klíč (HTTP 400). Zkontroluj konfiguraci SEZNAM_WM_SITES.",
  api_401_bad_key:
    "API klíč pro doménu \"{domain}\" je nesprávný (HTTP 401). Ověř klíč v nástroji https://reporter.seznam.cz/wm/.",
  api_403_forbidden:
    "Pro tuto akci nemáš dostatečná oprávnění (HTTP 403). Reindexace vyžaduje klíč s právem zápisu — read-only klíč nestačí.",
  api_404_not_found:
    "Seznam API vrátil 404 — web nebo stránka nenalezena. Zkontroluj doménu / URL.",
  api_429_rate_limited:
    "Překročen limit dotazů na Seznam API (HTTP 429) i po opakovaných pokusech. Zkus to za chvíli znovu.",
  api_5xx_unavailable:
    "Seznam Webmaster API je dočasně nedostupné (HTTP {status}). Zkus to později.",
  api_error_generic:
    "Chyba při volání Seznam API: HTTP {status} {statusText}. Detail: {detail}",
  api_network_error:
    "Chyba sítě při volání Seznam API: {message}",
  api_invalid_json:
    "Seznam API vrátil nevalidní JSON: {message}",
  reindex_ok:
    "Požadavek na reindexaci URL \"{url}\" byl úspěšně odeslán. Zařazení do indexu může nějakou dobu trvat. Denní limit: 500 požadavků na klíč.",
  missing_param: "Chybí povinný parametr \"{name}\".",
  invalid_date_format:
    "Neplatný formát parametru \"{name}\" — očekává se YYYY-MM-DD.",
  unknown_tool: "Neznámý nástroj: {name}",
  web_status_header: "Stav webu {domain}:",
  documents_header: "Počty stránek pro {domain}:",
  document_detail_header: "Detail stránky {url}:",
  history_header: "Historie indexace pro {domain}:",
  database_info_header: "Informace o databázi Seznam Webmaster:",
  category_content: "stažené",
  category_redirect: "přesměrování",
  category_index: "v indexu",
  category_error: "chybové",
  category_downloaded: "stažené",
  category_redirected: "přesměrování",
  category_indexed: "v indexu",
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
  api_400_missing_key:
    "Seznam API reports a missing API key (HTTP 400). Check your SEZNAM_WM_SITES configuration.",
  api_401_bad_key:
    "API key for domain \"{domain}\" is invalid (HTTP 401). Verify the key at https://reporter.seznam.cz/wm/.",
  api_403_forbidden:
    "You don't have sufficient permissions for this action (HTTP 403). Reindex requires a write-enabled key — a read-only key is not enough.",
  api_404_not_found:
    "Seznam API returned 404 — site or page not found. Check the domain / URL.",
  api_429_rate_limited:
    "Seznam API rate limit exceeded (HTTP 429) even after retries. Please try again shortly.",
  api_5xx_unavailable:
    "Seznam Webmaster API is temporarily unavailable (HTTP {status}). Please try again later.",
  api_error_generic:
    "Seznam API error: HTTP {status} {statusText}. Detail: {detail}",
  api_network_error:
    "Network error calling Seznam API: {message}",
  api_invalid_json:
    "Seznam API returned invalid JSON: {message}",
  reindex_ok:
    "Reindex request for URL \"{url}\" was submitted successfully. Indexing may take some time. Daily limit: 500 requests per key.",
  missing_param: "Missing required parameter \"{name}\".",
  invalid_date_format:
    "Invalid format for parameter \"{name}\" — expected YYYY-MM-DD.",
  unknown_tool: "Unknown tool: {name}",
  web_status_header: "Site status for {domain}:",
  documents_header: "Page counts for {domain}:",
  document_detail_header: "Page detail for {url}:",
  history_header: "Indexation history for {domain}:",
  database_info_header: "Seznam Webmaster database info:",
  category_content: "downloaded",
  category_redirect: "redirect",
  category_index: "indexed",
  category_error: "error",
  category_downloaded: "downloaded",
  category_redirected: "redirect",
  category_indexed: "indexed",
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
