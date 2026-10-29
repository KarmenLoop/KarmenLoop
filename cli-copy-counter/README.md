# Koder CLI download-link copies

English | [简体中文](README.zh-CN.md)

A separate count for successful uses of the Koder CLI download-link copy button. The CLI website and the copy page linked from GitHub share this total. One person copying three times adds three copies.

The copied link is always the official [latest GitHub release](https://github.com/KarmenLoop/koder-cli/releases/latest). It opens the download page; the service does not mirror installers or run them.

## What counts

The browser records an event after the Clipboard API confirms the write. A new successful action gets a new event ID. Retries reuse that ID, so an interrupted response cannot add the same action twice. Reading statistics, loading the badge, opening a page or failing to copy does not add an event.

The count covers our buttons. GitHub's native code-block controls, manually selected text, unique people and completed downloads are outside it. This is browser-reported success; a public service cannot independently attest to the system clipboard or rule out forged nonbrowser requests. No historical copy total is invented.

Pending event IDs stay in browser storage until confirmed. If the network fails, the page retries while visible and when connectivity returns. If browser storage is unavailable, copying still works, but keep the page open until recording completes. Losing both the page and its unsaved queue can lose that report; the UI does not claim it was recorded.

## Run and deploy

Version **1.0.0** requires Node **22 or later**:

```sh
cd cli-copy-counter
npm ci
npm test
```

Deploy this folder as its own Netlify project, `karmenloop-cli-copies`, with the included configuration. `@netlify/database` provisions the independent PostgreSQL database and applies the migration. This service requires no GitHub token. Keep the existing profile/Traffic project and database separate.

Only the current published production deploy can write. Preview routes do not read the production database and reject copy events. The API allows the owned CLI website origins and its own service origin. Keep that exact list synchronized if the domain changes; do not use wildcard write origins.

Copy `public/copy-client.mjs`, `public/cli-copy.mjs` and `public/cli-copy.css` into the CLI website's `assets/` directory. Include the widget only on CLI introduction/download pages in both languages. The public GitHub README links to that page with `?from=github#copy-download-link`; its badge reads the same count. The entry hint is attribution, not an authenticated identity.

## API and maintenance

- `POST /copies`: bounded JSON containing only a random action UUID and `source` (`github` or `website`). Each new event inserts one receipt; duplicate IDs retain the original count. A conflicting source returns 409.
- `GET /stats.json`: read-only count, source totals and timestamps. Empty storage returns a real zero; unavailable storage returns 503.
- `GET /badge.svg?lang=en|zh-CN`: read-only badge suitable for a GitHub README.
- `GET /health`: availability route; does not add a copy.

The database retains random per-action IDs, source hints and server timestamps. It does not store visitor identities, IP addresses, device fingerprints or clipboard contents. Hosting infrastructure retains its normal logs. The statistics page checks every ten seconds while visible. Counts on GitHub badges may lag because GitHub proxies images.

Before releasing, run the tests and verify actual browser copying, the exact clipboard URL, repeated actions, retry deduplication, reads without writes, both languages and a narrow layout. Test writes against isolated storage first. Production acceptance copies are real events and must be identified in the receipt. Do not reset them through a public endpoint; no reset or arbitrary counter key is exposed.
