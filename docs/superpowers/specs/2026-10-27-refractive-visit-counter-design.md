# Refractive profile counter

English | [简体中文](2026-10-27-refractive-visit-counter-design.zh-CN.md)

Status: proposed design. No counter service has been deployed.

## Purpose and scope

Add an original animated visit card to the KarmenLoop GitHub profile. The owner selected self-hosting and asked for the refractive object used on karmenloop.com. Both profile languages will display the same total. Preserve the existing profile content and leave other repositories and website deployments unchanged.

## Appearance

Use the website's three-lobed, deforming loop as the visual reference: warm gray metal, soft studio reflections, restrained movement, and a charcoal surface. Keep the count still and easy to read. The proposed card is 680 × 180, with the KARMEN LOOP name, a large count, a short label, and the refractive object to the right. It scales down within the README width.

English copy: **Profile views**, **Since {launch date}**, and **Estimated from image requests**. Chinese copy: **主页访问**, **自 {上线日期} 起**, and **按图片请求估算**. Use each language's normal date format. Do not claim a visitor identity, unique-person total, or live online status.

The proposed image format is a self-contained SVG with native animation, no scripts, no remote fonts, and a readable static first frame. Respect reduced-motion preferences. Verify animation through GitHub's actual image proxy; if it does not play there, use an animated GIF with an equivalent static option. The animation conveys the brand rather than server health.

## Approaches

An existing public counter offers fast setup and limited colors, but gives us less control over the image and data. A self-hosted renderer supports the original refractive form, our own copy, and durable storage. The owner chose self-hosting. No third-party theme artwork will be reused.

## Counting and storage

Count successful GET requests to the production image endpoint. HEAD, preview renders, health checks, test requests, and statistics reads do not increment it. Preview data is separate. English and Chinese endpoints share one record.

Start at zero on the first production image request and save that date. Do not seed a historical total. GitHub proxies and caches README images, so this is an estimate of profile views, not an exact visitor measurement. Return cache-control headers that request revalidation without promising that every profile opening reaches our service.

Store only the total, start time, and update time. The application does not store IP addresses, user agents, cookies, or identities. Hosting infrastructure may retain its standard operational logs; do not claim otherwise. There is no public reset or write API.

## Hosting proposal

Use a separate Netlify service in the existing authenticated account, with a site-wide Netlify Blobs store configured for strong consistency and conditional writes. Bound write retries and report failure without resetting the total or displaying a fabricated zero. Keep credentials in hosting configuration. This platform choice is the implementer's proposal; the owner selected self-hosting, not a particular provider. Do not add paid services or replace any existing website deployment.

## Acceptance

Verify actual image rendering and motion on the GitHub profile, equivalent English and Chinese content, mobile readability, reduced motion, and the static image option. Verify concurrent increments without lost updates, persistence across a fresh process and deployment, read-only preview behavior, HEAD behavior, and storage-failure handling. Confirm a production image request changes the stored count, then confirm both profile pages use that same record. Record direct-service and GitHub-proxy observations separately. A local render or passing CI does not establish a working published counter.
