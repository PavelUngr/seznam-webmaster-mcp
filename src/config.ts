export interface SiteConfig {
  domain: string;
  apiKey: string;
}

export type Lang = "cs" | "en";

export interface AppConfig {
  sites: SiteConfig[];
  lang: Lang;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function parseSites(raw: string | undefined): SiteConfig[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(
      `SEZNAM_WM_SITES is not valid JSON: ${(err as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ConfigError(
      "SEZNAM_WM_SITES must be a JSON array of {domain, apiKey} objects.",
    );
  }

  const seen = new Set<string>();
  const sites: SiteConfig[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (
      entry === null ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      throw new ConfigError(
        `SEZNAM_WM_SITES[${i}] must be an object with "domain" and "apiKey".`,
      );
    }
    const obj = entry as Record<string, unknown>;
    const domainRaw = obj["domain"];
    const apiKeyRaw = obj["apiKey"];
    if (typeof domainRaw !== "string" || domainRaw.trim() === "") {
      throw new ConfigError(
        `SEZNAM_WM_SITES[${i}].domain must be a non-empty string.`,
      );
    }
    if (typeof apiKeyRaw !== "string" || apiKeyRaw.trim() === "") {
      throw new ConfigError(
        `SEZNAM_WM_SITES[${i}].apiKey must be a non-empty string.`,
      );
    }
    const domain = normalizeDomain(domainRaw);
    if (seen.has(domain)) {
      process.stderr.write(
        `[seznam-webmaster-mcp] warning: duplicate domain "${domain}" in SEZNAM_WM_SITES — keeping the first occurrence.\n`,
      );
      continue;
    }
    seen.add(domain);
    sites.push({ domain, apiKey: apiKeyRaw.trim() });
  }

  return sites;
}

function parseLang(raw: string | undefined): Lang {
  if (raw === undefined || raw.trim() === "") {
    return "cs";
  }
  const value = raw.trim().toLowerCase();
  if (value === "cs" || value === "en") {
    return value;
  }
  throw new ConfigError(
    `SEZNAM_WM_LANG must be "cs" or "en" (got "${raw}").`,
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const sites = parseSites(env["SEZNAM_WM_SITES"]);
  const lang = parseLang(env["SEZNAM_WM_LANG"]);
  return { sites, lang };
}

export function findSite(
  config: AppConfig,
  domain: string,
): SiteConfig | undefined {
  const target = normalizeDomain(domain);
  return config.sites.find((s) => s.domain === target);
}
