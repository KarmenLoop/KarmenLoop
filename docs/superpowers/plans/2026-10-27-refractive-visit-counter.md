# Refractive Profile Counter Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. The owner authorized implementation and publication; execute in this session.

**Goal:** Publish a self-hosted counter and a transparent animated GIF of the supplied KARMEN LOOP refractive form.

**Architecture:** Render the existing native loop geometry into indexed frames at build time. A small pure JavaScript renderer adds the current count and encodes a transparent GIF. A separate Netlify service stores one aggregate record using an atomic database upsert.

**Tech Stack:** Node 22, gifenc, a build-time canvas renderer, PostgreSQL on Netlify, Node's test runner.

**Spec:** [Approved design](../specs/2026-10-27-refractive-visit-counter-design.md)

## Global Constraints

- Transparent animated GIF, with a separate standalone loop and a static option.
- Preserve the supplied dark silver form and the website's native geometry.
- Both languages use the same record; previews and HEAD requests do not increment it.
- Store aggregate count and timestamps only; do not invent history or claim unique visitors.
- Preserve existing profile content, other repositories, and website deployments.
- Do not purchase a paid plan; keep secrets outside Git.

## Review Focus

- Concurrent first requests must create one record and retain every increment.
- Unknown or malformed image parameters must not create arbitrary counter records.
- Storage errors must not silently reset the count or return a successful fake value.
- Every GIF frame must retain transparent outer pixels and an open center.
- Preview deployments must not write to the production counter.

### Task 1: Transparent loop and GIF renderer

**Files:** `counter/brand/loop.mjs`, `counter/scripts/build-assets.mjs`, `counter/src/render.mjs`, `counter/assets/`, `counter/test/render.test.mjs`.

**Interfaces:** Produces `renderCard({count,startedAt,lang,theme,animated}) -> Buffer`, plus standalone loop assets. Assets contain indexed frame planes and a small text atlas; no native graphics dependency is needed at request time.

- [ ] Write tests for GIF format, changing frames, dimensions, alpha, and large counts; run them and observe the missing renderer failure.
- [ ] Port the native geometry and material, sample a periodic motion field, and build 60 indexed frames. Generate a 512 px standalone GIF and a compact card loop.
- [ ] Implement count/date text compositing and animated/static encoders; reject invalid counts and options.
- [ ] Run `node --test counter/test/render.test.mjs`; inspect GIF on light and dark backgrounds in the browser.
- [ ] Commit the renderer and original assets.

### Task 2: Durable image endpoint

**Files:** `counter/src/store.mjs`, `counter/src/handler.mjs`, `counter/netlify/functions/counter.mjs`, `counter/netlify/database/migrations/`, `counter/test/handler.test.mjs`, `counter/netlify.toml`.

**Interfaces:** `store.read() -> aggregate|null`; `store.increment() -> aggregate`; `createHandler({store,render,production}) -> (Request -> Response)`. Aggregate contains decimal `count`, ISO `startedAt`, and ISO `updatedAt`.

- [ ] Write tests for GET, HEAD, read-only preview, shared languages, invalid input, failed storage, and preview-deployment isolation. Observe the missing handler failure.
- [ ] Implement fixed routes with allowlisted language/theme/motion values, no-cache image responses, safe error responses, and no public reset route.
- [ ] Add one aggregate table and an atomic `INSERT ... ON CONFLICT ... DO UPDATE SET count = count + 1 RETURNING ...` operation; use one fixed record identity.
- [ ] Run `node --test counter/test/*.test.mjs`; run a real concurrent database test on isolated preview data, followed by persistence checks.
- [ ] Commit endpoint and tests.

### Task 3: Publish and verify profile integration

**Files:** Both READMEs, `counter/README.md`, `counter/README.zh-CN.md`, `counter/public/`, acceptance report under `docs/`.

**Interfaces:** Published `/profile.gif`, `/preview.gif`, `/stats.json`, and standalone assets; the README picture chooses a light/dark foreground while retaining one count.

- [ ] Deploy a separate service; confirm target identity before publishing and verify GIF headers, stored increments, read-only routes, concurrent updates, and persistence after redeploy.
- [ ] Add equivalent language-specific profile sections and a static-image link. Include the image-request estimate and cache limitation.
- [ ] Run documentation checks and inspect the rendered GitHub profile, its actual Camo image, and language navigation. Record direct and proxied results separately.
- [ ] Obtain a fresh whole-branch review, fix substantive findings, create and attach the PR, merge after checks, and verify the live profile again.
