# KarmenLoop profile counter

English | [简体中文](README.zh-CN.md) · [Back to the profile](../README.md)

A self-hosted profile image with KARMEN LOOP's original refractive form. The background and the opening through the loop are transparent. The animation runs for six seconds and repeats; the number stays still.

[Preview and downloads](https://karmenloop-profile.netlify.app) · [Transparent GIF](https://karmenloop-profile.netlify.app/karmen-loop.gif) · [Static PNG](https://karmenloop-profile.netlify.app/karmen-loop.png)

## What the number means

The total counts production image requests accepted by this service. It starts with the first request; no earlier traffic was imported. English and Chinese images, and both foreground colors, share one record. The service saves only the total and its start/update timestamps. It does not save IP addresses, browser identifiers, cookies, or visitor identities. Netlify may retain its normal infrastructure logs.

GitHub fetches README images through its Camo proxy and may cache them. A page opening may reuse a cached image, and automated requests may reach the service. Netlify also converts HEAD checks to GET before the application sees them, so those checks can count as image requests. Treat this as an estimate of profile views, not a count of unique people or users online. Use `/health`, `/stats.json`, or `/preview.gif` for monitoring. See [GitHub's image proxy documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).

GIF supports one transparent color rather than partial alpha, so its edges can look slightly different on light and dark backgrounds. The standalone PNG retains full alpha. GIF cannot follow a system's reduced-motion setting inside a README; use the static-view link when you prefer no animation.

## Run locally

Version **1.0.0** requires Node **22 or later**. From this repository:

```sh
cd counter
npm ci
npm test
npm start
```

Open `http://127.0.0.1:55942`. Local preview uses a clearly labeled sample count and never connects to production storage. The committed rendering assets are ready to use; rebuilding them is optional.

## Host your own copy

Create a separate Netlify project from this folder and keep the included `netlify.toml`. The `@netlify/database` dependency provisions PostgreSQL; deployment applies the committed migration. Confirm your existing plan's limits before deploying. Do not put database URLs or account tokens in Git.

The production function uses Netlify's request context to enable counting only on a production deploy. Draft deployments are read-only and use their own database branch. Keep preview deployments private. Make the production image reachable without login so GitHub can fetch it. The static assets and image requests use your hosting account's normal bandwidth and function/database allowance.

The fixed routes are `/profile.gif` (counting), `/preview.gif` (read-only), `/stats.json` (read-only), and `/health`. Image options are `lang=en|zh-CN`, `theme=light|dark`, and `motion=animated|static`. There is no reset endpoint or selectable counter key.

## Maintain it

Run `npm test` before deploying. Verify `/stats.json` before and after using `/preview.gif`, including HEAD requests to that preview route: the total must not change. Do not use HEAD on `/profile.gif` for monitoring: the hosting proxy converts it to GET. Exercise concurrent writes against an isolated database branch, never by sending bulk requests to the production image. Confirm persistence after deploying again. Update both profile languages together.

To rebuild artwork, place the official [Inter variable font](https://github.com/rsms/inter) at `tmp/inter-variable.ttf`, provide a Chinese font through `COUNTER_CJK_FONT` when the system has none, then run `npm run build:assets`. The build uses the site's native geometry and material with smooth offline shading. It produces the GIF, PNG, indexed animation, and text atlas. Font files and account credentials are not shipped with the renderer. The Inter license is retained in [brand/inter-license.txt](brand/inter-license.txt).

If storage fails, the image endpoint returns HTTP 503 and does not invent a zero or reset the record. Restore database access and retry. Roll back the application deploy without deleting or replacing the aggregate table. To remove the profile image, remove the picture block and its static-view link from both READMEs; preserve stored history unless the owner explicitly requests deletion.
