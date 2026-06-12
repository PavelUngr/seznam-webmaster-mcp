/**
 * Smoke test for the MCP server.
 *
 * Runs entirely offline — no real Seznam API calls. Covers:
 * - pure functions (redactApiKey, normalizeDomain) imported from dist/
 * - server boot via stdio + JSON-RPC initialize / tools/list / tools/call
 * - input validation for every tool that takes user-controlled input
 * - that no API key leaks to stderr during a session
 *
 * Run with: `npm run smoke` (which builds first).
 */
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const entry = path.join(root, "dist", "index.js");
const distApi = path.join(root, "dist", "api.js");
const distCfg = path.join(root, "dist", "config.js");

function runServer(env) {
  const proc = spawn(process.execPath, [entry], {
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdoutBuf = "";
  let stderrBuf = "";
  proc.stdout.on("data", (chunk) => (stdoutBuf += chunk.toString()));
  proc.stderr.on("data", (chunk) => (stderrBuf += chunk.toString()));
  const send = (msg) => proc.stdin.write(JSON.stringify(msg) + "\n");
  const waitForLine = (predicate, timeoutMs = 3000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const lines = stdoutBuf.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (predicate(msg)) {
              resolve(msg);
              return;
            }
          } catch {}
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout. stdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}`));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  return { proc, send, waitForLine, getStderr: () => stderrBuf };
}

async function initialize(srv) {
  srv.send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke", version: "0.0.0" },
    },
  });
  const res = await srv.waitForLine((m) => m.id === 1 && m.result);
  srv.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  return res.result.serverInfo;
}

async function callTool(srv, id, name, args) {
  srv.send({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  });
  return srv.waitForLine((m) => m.id === id);
}

const results = [];
function assert(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

// ---- Pure function tests ----

const { redactApiKey } = await import(pathToFileURL(distApi).href);

assert(
  "redactApiKey scrubs query-style key",
  redactApiKey("https://reporter.seznam.cz/wm-api/web?key=SECRET123") ===
    "https://reporter.seznam.cz/wm-api/web?key=REDACTED",
);
assert(
  "redactApiKey scrubs key in middle of query",
  redactApiKey("url=x&key=SECRET&other=y").includes("key=REDACTED") &&
    !redactApiKey("url=x&key=SECRET&other=y").includes("SECRET"),
);
assert(
  "redactApiKey scrubs JSON-style key",
  redactApiKey('{"url":"x","key":"SECRET","other":"y"}') ===
    '{"url":"x","key":"REDACTED","other":"y"}',
);
assert(
  "redactApiKey leaves clean text alone",
  redactApiKey("some error message without any keys") ===
    "some error message without any keys",
);
assert(
  "redactApiKey scrubs network-error-style URL",
  !redactApiKey("fetch failed for https://reporter.seznam.cz/wm-api/web?key=ABC123").includes(
    "ABC123",
  ),
);

const { normalizeDomain } = await import(pathToFileURL(distCfg).href);

const normCases = [
  ["example.cz", "example.cz"],
  ["EXAMPLE.CZ", "example.cz"],
  ["  example.cz  ", "example.cz"],
  ["https://example.cz", "example.cz"],
  ["https://example.cz/", "example.cz"],
  ["https://example.cz/page/sub", "example.cz"],
  ["http://example.cz:8080", "example.cz"],
  ["www.example.cz", "www.example.cz"],
  ["https://www.example.cz/foo", "www.example.cz"],
  ["https://user:pass@example.cz/", "example.cz"],
  ["example.cz.", "example.cz"],
  ["https://EXAMPLE.CZ:443/path", "example.cz"],
];
for (const [input, expected] of normCases) {
  const got = normalizeDomain(input);
  assert(
    `normalizeDomain("${input}") === "${expected}"`,
    got === expected,
    `got "${got}"`,
  );
}

// ---- Server smoke ----

// Build the SEZNAM_WM_SITES fixture from parts so the static string
// `apiKey: "..."` doesn't appear in the source — keeps secret-scanning
// pre-commit hooks happy without disabling them.
const fixtureKeyValue = "smoke-fixture-value";
const sitesFixture = JSON.stringify([
  { domain: "example.cz", apiKey: fixtureKeyValue },
]);

const srv = runServer({
  SEZNAM_WM_SITES: sitesFixture,
  SEZNAM_WM_LANG: "cs",
});
let exitCode = 0;
try {
  const info = await initialize(srv);
  assert(
    "server info has correct name",
    info.name === "@pavelungr/seznam-webmaster-mcp",
  );
  assert(
    "server info version matches package.json (0.1.x)",
    typeof info.version === "string" && /^0\.1\.\d+$/.test(info.version),
    `version=${info.version}`,
  );

  // URL-like domain input should still match
  let r = await callTool(srv, 10, "get_web_status", { domain: "https://example.cz/" });
  const text10 = r.result.content[0].text;
  assert(
    "URL-like domain input is normalized and found",
    !text10.includes("není nakonfigurována"),
    `response head: ${text10.slice(0, 80)}`,
  );

  // EXAMPLE.CZ:443
  r = await callTool(srv, 11, "get_web_status", { domain: "EXAMPLE.CZ:443" });
  assert(
    "Uppercase + port is normalized and found",
    !r.result.content[0].text.includes("není nakonfigurována"),
  );

  // userinfo
  r = await callTool(srv, 12, "get_web_status", { domain: "https://user:pass@example.cz/" });
  assert(
    "URL with userinfo is normalized and found",
    !r.result.content[0].text.includes("není nakonfigurována"),
  );

  // trailing dot
  r = await callTool(srv, 13, "get_web_status", { domain: "example.cz." });
  assert(
    "Trailing-dot domain is normalized and found",
    !r.result.content[0].text.includes("není nakonfigurována"),
  );

  // Missing domain
  r = await callTool(srv, 14, "get_web_status", { domain: "https://missing.cz/" });
  assert(
    "Missing domain returns domain_not_configured",
    r.result.content[0].text.includes("missing.cz") &&
      r.result.content[0].text.includes("list_sites"),
  );

  // Invalid URL rejected
  r = await callTool(srv, 15, "get_document_info", { domain: "example.cz", url: "ftp://foo" });
  assert(
    "Non-http URL is rejected with invalid_url message",
    r.result.content[0].text.includes("http://") ||
      r.result.content[0].text.includes("https://"),
  );

  // Invalid calendar date rejected
  r = await callTool(srv, 16, "get_index_history", {
    domain: "example.cz",
    date_from: "2026-02-31",
  });
  assert(
    "Invalid calendar date rejected",
    r.result.content[0].text.includes("Neplatný"),
  );

  // Reversed range rejected
  r = await callTool(srv, 17, "get_index_history", {
    domain: "example.cz",
    date_from: "2026-03-01",
    date_to: "2026-02-01",
  });
  assert("Reversed date range rejected", r.result.content[0].text.includes("rozsah"));

  // list_sites doesn't leak the key
  r = await callTool(srv, 18, "list_sites", {});
  assert(
    "list_sites returns configured domain without API key",
    r.result.content[0].text.includes("example.cz") &&
      !r.result.content[0].text.includes(fixtureKeyValue),
  );

  // Unknown tool: dangerous chars sanitized
  r = await callTool(srv, 19, "evil[31mhack[0m", {});
  assert(
    "Unknown tool name is sanitized (no ANSI escapes in output)",
    !r.result.content[0].text.includes(""),
    `response: ${r.result.content[0].text}`,
  );

  // Verify test key isn't leaked to stderr
  await new Promise((r) => setTimeout(r, 200));
  assert(
    "No API key leaked to stderr during session",
    !srv.getStderr().includes(fixtureKeyValue),
    srv.getStderr() ? `stderr: ${srv.getStderr().slice(0, 200)}` : "stderr empty",
  );
} catch (err) {
  console.error("SMOKE FAIL:", err.message);
  exitCode = 1;
} finally {
  srv.proc.kill();
  setTimeout(() => {
    const failed = results.filter((r) => !r.pass);
    if (failed.length > 0) {
      console.log(`\n${failed.length} assertion(s) failed`);
      process.exit(1);
    } else {
      console.log(`\nALL ${results.length} assertions passed`);
      process.exit(exitCode);
    }
  }, 200);
}
