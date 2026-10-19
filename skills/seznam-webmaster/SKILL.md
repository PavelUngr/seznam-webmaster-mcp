---
name: seznam-webmaster
description: Guides an AI agent through Seznam Webmaster data with the seznam-webmaster-mcp tools, covering index and crawl statistics, single URL inspection and safe reindex requests. Use when the user asks whether pages are indexed in Seznam, about Seznam Webmaster, Seznam crawl errors, index history, or reindexing a URL for Seznam search.
license: MIT
---

# Seznam Webmaster

Seznam.cz is the second-largest search engine in the Czech Republic and Seznam Webmaster is its equivalent of Google Search Console. This skill explains how to use the `seznam-webmaster-mcp` tools correctly and how to interpret what they return.

## Prerequisites

- The MCP server `@pavelungr/seznam-webmaster-mcp` must be configured in the client. If its tools are not available, tell the user to install it (https://github.com/PavelUngr/seznam-webmaster-mcp). Depending on the client, tool names may carry a prefix with the server name.
- Every website has its **own API key** and the key decides which website the data belongs to. There is no account-wide key and no way to list all sites of an account. The agent only sees the domains the user configured, so a site that is missing from `list_sites` needs its key added to the server configuration.
- Never ask the user to paste an API key into the chat and never print one. Keys live in the client configuration and no tool returns them.

## Tools

| Tool | Use it for |
|---|---|
| `list_sites` | Lists the configured domains. Call it first when the user did not name a domain or when you are unsure which domains exist. |
| `get_web_status` | One-call overview: counts per category plus the daily history. |
| `get_indexed_pages` | Counts per category plus a random sample of up to 1000 URLs per category. |
| `get_index_history` | Daily counts. Optional `date_from` and `date_to` in `YYYY-MM-DD`, `date_from` must not be later than `date_to`. |
| `get_document_info` | Details of one URL: title, meta tags, Open Graph data, response headers, flags `isIndexed`, `isError`, `isRedirect`, and timestamps. |
| `reindex_url` | Requests reindexing of one URL. Needs a key with write access. |
| `get_database_info` | Release marker of Seznam's database (looks like a timestamp). Needs no key and no domain. |

Notes on the `domain` argument, which is the first argument of every tool except `list_sites` and `get_database_info`:
- Use the configured domain. A scheme, path, port or trailing dot is stripped, so `https://example.cz/` matches `example.cz`.
- `www.` is not stripped. `www.example.cz` and `example.cz` are different entries.
- `url` arguments must be absolute `http` or `https` URLs and must belong to the site the key belongs to.

## Reading the numbers

Categories in `get_indexed_pages` and `get_web_status`:
- `doc_count`: pages the robot knows exist (count only, no URL sample)
- `content`: pages the robot fetched and knows the content of
- `index`: pages in the index
- `redirect`: pages that redirect
- `error`: pages with errors

Categories in `get_index_history`:
- `doc_count`, `content`, `redirected`, `indexed`, `error`
- `downloaded`: deprecated by Seznam. It currently carries the same value as `doc_count` (pages discovered by the robot). **It is not the number of fetched pages**, that is `content`.
- The names differ between the two views: `redirected` and `indexed` in the history, `redirect` and `index` elsewhere.

How to interpret:
- A URL sample is random and capped at 1000. Present it as a sample, never as the complete list of problem pages.
- Many pages that are fetched but not indexed are normal (duplicates, URL parameters, thin pages). Compare the counts, then look at example URLs before calling it a problem.
- Seznam Webmaster has been in beta for a long time. Data can have gaps or sudden dips that reflect data availability, not the real index. Never report a drop from a single day. Check at least two weeks with `get_index_history` and confirm with `get_document_info` on a few URLs before alarming anyone.
- Timestamps from `get_document_info` are plain numbers. Check whether they are seconds or milliseconds before converting them to dates.

## Empty and error responses

- **Data not yet available (HTTP 204).** This is not an error. Newly added sites can take up to 24 hours. Tell the user and suggest trying later, do not retry in a loop.
- **401.** The key is wrong for that domain. The user checks the key in Seznam Webmaster under API.
- **403.** For `get_document_info` and `reindex_url` the URL most likely belongs to a different site than `domain`, or the key lacks permission. Reindexing needs write access (administrator or write role).
- **404.** The site or the page was not found.
- **429, 502, 503.** The server already retries these with a short backoff. If it still fails, wait a minute. 502 and 503 mean an outage on Seznam's side.
- Limits: 5 requests per second, 100 per minute, 500 reindex requests per day. Send requests one after another.

## Reindexing safely

- Request reindexing only for pages that changed or where a problem was fixed. Confirm the exact list of URLs with the user first.
- Never loop over hundreds of URLs unless the user explicitly asked for it. Keep count against the 500 per day limit and say how many you used.
- A successful response only means the request was accepted, not that the page is indexed. Report it as requested. To follow up later, call `get_document_info` and compare `isIndexed` and the timestamps.

## Recipe: indexation audit

1. Call `list_sites` if the domain is unknown.
2. Call `get_web_status`, or `get_indexed_pages` together with `get_index_history`.
3. Look at 14 to 30 days of history. Separate steady trends from one-day jumps.
4. Take 3 to 5 sample URLs from the `error` category and inspect them with `get_document_info` to find the cause.
5. Report with concrete numbers and dates, mark what is a fact and what is your interpretation, name example URLs, order recommendations by priority and state the limits (samples, beta data).

## Conventions

- Answer in the language of the user and format numbers the way that language does.
- If the user asks for something these tools cannot do (listing all sites of the account, ranking or keyword data, anything outside indexation data), say so instead of improvising.
