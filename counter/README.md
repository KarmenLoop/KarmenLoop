# KarmenLoop recorded GitHub views

English | [简体中文](README.zh-CN.md) · [Back to the profile](../README.md)

A self-hosted view of activity across KarmenLoop's repositories, paired with our transparent, flowing silver form. Open [live totals](https://karmenloop-profile.netlify.app/?lang=en) to see numbers update without refreshing. The GitHub README shows an image snapshot and links to the live page.

[Transparent GIF](https://karmenloop-profile.netlify.app/karmen-loop.gif) · [Static PNG](https://karmenloop-profile.netlify.app/karmen-loop.png)

## What the total includes

The total adds two sources, shown separately on the live page:

- **Repository page views:** GitHub's official Traffic data for the owner's accessible repositories. The collector saves daily records, replacing each repository/day when GitHub updates it. Repeated imports do not add the same window again. Saved days remain after they age out of GitHub's 14-day API window.
- **Profile-image requests:** the original counter, including its retained total and timestamps. Requests for the profile/account image continue to add to this record. Reading the live page, stats, previews, or health route does not add a view.

The sources can overlap. A repository visit can also load the counter image, so the combined number is **recorded views**, not unique visitors or a deduplicated page-view total. Earlier history that GitHub no longer provides cannot be reconstructed. Downloads followed by local or offline reading are outside GitHub's page-view data. Private repository names and individual traffic records are not exposed by public stats.

GitHub updates repository traffic about hourly. The hosted page checks for available data every ten seconds while visible; it shows the last repository-sync time. It does not animate a number upward without a new source value. GitHub sanitizes README HTML and proxies/caches images, so an already-open README image cannot run this live client. See [GitHub Traffic](https://docs.github.com/en/rest/metrics/traffic), [update timing](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository), and [image caching](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).

## Run locally

Version **1.2.0** requires Node **22 or later**:

```sh
cd counter
npm ci
npm test
npm start
```

Open `http://127.0.0.1:55942`. The local preview explicitly labels its sample totals and never reads or changes production storage. Rendering assets are committed and ready to use.

## Connect repository traffic

Use a separate Netlify project with the included `netlify.toml`. `@netlify/database` provisions PostgreSQL and applies the migrations. The added tables preserve the original profile counter. The scheduled function collects repository traffic at minute 17 each hour, in UTC, on the current published production deploy only. Preview deployments never connect to production storage or run the collector.

The collector needs a dedicated GitHub fine-grained token for the KarmenLoop account, with **Metadata: read** and **Administration: read**, which GitHub requires for Traffic. Select **All repositories**, including private and newly created repositories. Store it as `GITHUB_TRAFFIC_TOKEN` for this Netlify project's production functions only. Keep it out of Git, logs, browser code, and chat. Do not replace it with a broad account-write token. Account credentials must be configured by the owner before scheduled sync can operate. Renew the token before its expiry; an expired credential leaves the saved totals intact and marks sync stale.

Before the first cloud import, compare the token's full repository-ID set against a fresh inventory read with the owner's existing local access. The current verified inventory contains 39 repositories; matching the count alone is insufficient. Save the verified comma-separated IDs as `GITHUB_TRAFFIC_BASELINE_IDS` for production functions. Keep these IDs out of public files and stats. The collector refuses to save without this baseline.

Each accepted collection persists its tracked repository IDs. Later collections must include the baseline and every previously tracked ID; new repositories extend that set. A missing repository rejects the whole import. If a repository is deleted or transferred, an owner must reconcile the baseline and tracked set explicitly while retaining its historical daily records. A token cannot discover repositories hidden by its own scope, so keep All repositories enabled and compare coverage again after access changes.

If the hosting plan does not support function-only project variables, use Netlify's [deploy-specific secret variables](https://cli.netlify.com/commands/deploy/) for the production deploy. They apply only to deployed functions and are masked in the UI and API. Supply both keys through a private deployment tool; keep values out of shell history and logs. These values belong to that deploy and are not inherited by the next one, so every production redeploy must supply them again.

A collection must finish for every repository in its inventory before saving. HTTP failures, missing access, invalid data, and timeouts retain the last complete totals. Status becomes stale after a failed collection or three hours without a successful one. Before the first import, repository traffic is marked pending rather than fabricated as zero. Source corrections replace saved values, so a corrected total can decrease. Missing days are saved as zero within the fourteen UTC calendar days ending on the collection date. The preceding partial boundary day is only changed when GitHub explicitly supplies it; older history stays intact. Older concurrent collections cannot replace a newer accepted snapshot.

Public stats expose only aggregate totals, source timestamps, coverage, and freshness. They do not expose repository identities, IP addresses, browser identifiers, cookies, or visitor identities. Netlify and GitHub retain their normal infrastructure logs. Check hosting and database allowances before enabling the service.

## Routes and maintenance

- `/github.gif`: account image; adds a profile-image request and renders the combined total.
- `/profile.gif`: compatible original image; adds a request and renders the original image-request total.
- `/preview.gif`: read-only combined snapshot.
- `/stats.json` and `/health`: read-only data and availability.

Image options are `lang=en|zh-CN`, `theme=light|dark`, and `motion=animated|static`. English and Chinese use the same records. No public reset, import, or selectable counter key exists. Netlify can normalize HEAD checks to GET, so monitor `/stats.json`, `/health`, or `/preview.gif`, never either counting image.

Run `npm test` before deploying. Verify read-only polling does not change counts, repeat imports are idempotent, history survives redeploys, and both languages show the same source definitions. Exercise storage writes against an isolated database branch. An unavailable service retains the last browser observation or returns 503; it does not invent a zero. Keep preview deployments private. Follow [Netlify's scheduled-function guide](https://docs.netlify.com/build/functions/scheduled-functions/) to inspect the schedule and invoke an authorized test run.

The flowing form remains 640 × 640, with 120 frames at 50 ms each in a six-second loop. To rebuild, place the official [Inter variable font](https://github.com/rsms/inter) at `tmp/inter-variable.ttf`; set `COUNTER_CJK_FONT` if the system has no Chinese font. Run `npm run build:assets`, or `node scripts/build-assets.mjs --text-only` when changing only card text. The [Inter license](brand/inter-license.txt) is retained. GIF has one-bit transparency; the PNG retains full alpha. GIF cannot follow reduced-motion settings inside a README, so the static option remains available.
