# OSCAR Flower Dynamic Branding Design

**Date:** 2026-10-16  
**Status:** Design approved in conversation; implementation pending adversarial plan review  
**Repositories:** `flower`, `oscar-adminui`, `oscar` (reverseproxy configuration and Taskmanager wheel)

## Intent and success criteria

Flower should look like the active OSCAR template without copying each template's palette into Flower. When a user opens Flower, its default light/dark choice should match that browser's OSCAR choice. The Flower control must still allow a local Light or Dark override and a return to following OSCAR. Switching the active OSCAR template or editing its saved palette should update Flower on the next load or tab focus. Flower must remain usable if OSCAR's branding endpoint is unavailable.

The accepted starting point is the Ericsson Flower branch merged with upstream Flower 2.2 in `feature/oscar-flower-dynamic-branding` (merge commit `0d9942a`). The merge retains `oscar-flower` as the wheel distribution, Ericsson image assets, and the OSCAR title. It uses upstream's Bootstrap 5.3 theme control and CSS variables.

## Current boundaries

- OSCAR's public `GET /api/branding` returns the active template metadata and saved overrides. `resolveBranding(metadata, settings)` in AdminUI is the canonical recipe, validation, fallback, and font resolver. A Flower copy of those rules would drift.
- OSCAR's appearance mode is a per-browser `settings.mode` value in local storage on `https://<host>`. Flower runs on `https://<host>:5555`; local storage does not cross ports. Cookies do cross ports on the same host.
- Flower 2.2 already selects a Bootstrap `data-bs-theme` of light or dark. Its CSS has reusable `--bs-*` and `--flower-*` variables.
- The Taskmanager image installs a checked-in `oscar_flower-*.whl` from `oscar/oscar-taskmanager/wheels/`. Changing Flower source alone cannot change the running UI.

## Chosen approach

AdminUI exposes a public, read-only, versioned resolved-theme JSON endpoint. It calls the existing branding metadata API and `resolveBranding` twice, once for each content mode. Flower fetches that JSON through a narrow route on its own origin and maps the resolved roles onto its existing CSS variables. AdminUI mirrors the effective browser mode to a non-sensitive same-host cookie; the endpoint reads that cookie and returns the preferred Flower mode.

This avoids CORS, new database state, new secrets, and a second recipe implementation. A link query parameter would only work when Flower is opened from OSCAR and would go stale in bookmarks. Persisting appearance mode in the backend would add migration and per-user identity work for a browser preference. Those alternatives are not needed.

## API contract

`GET /api/branding/flower/` is public because the active branding metadata and recipe assets are already public for login and error pages. The trailing slash is canonical because AdminUI enables Next.js `trailingSlash: true`; the Flower proxy also accepts the no-slash spelling so a redirect remains on the same origin. It accepts no body or write method. Its response is:

```json
{
  "schema_version": 1,
  "branding_revision": 14,
  "template_id": "oscar-modern",
  "preferred_mode": "dark",
  "modes": {
    "light": { "surface": {}, "text": {}, "interaction": {}, "status": {}, "typography": {}, "geometry": {} },
    "dark": { "surface": {}, "text": {}, "interaction": {}, "status": {}, "typography": {}, "geometry": {} }
  }
}
```

Each mode value is the validated `tokens` output from `resolveBranding`, including the nested role names and resolved font families. The endpoint does not return template drafts, permissions, user data, or raw stored token edits. `template_id` and `branding_revision` come from the active saved metadata. A nonempty metadata response is required; an upstream failure returns `503` and `Cache-Control: no-store` rather than a successful Classic payload. All successful responses also use `Cache-Control: no-store` because `preferred_mode` is browser specific. Unsupported methods return `405` with `Allow: GET`.

OSCAR writes a `oscar-ui-mode` cookie containing only `light` or `dark` on settings restoration and mode changes: `Path=/; SameSite=Lax; Secure; Max-Age=31536000`. The current `semi-dark` mode maps to `light` because its content palette is light. Missing or invalid cookies map to OSCAR's configured default mode (`dark` today); a browser that has never loaded the updated OSCAR UI cannot supply its prior local-storage mode when it opens Flower directly. The cookie is not an authentication or authorization input. Its only purpose is to carry a harmless display preference across ports.

## Flower behavior

Flower's theme control offers **OSCAR**, **Light**, and **Dark**. OSCAR is selected by default and means “use `preferred_mode` from the API.” A manual Light or Dark choice is stored under Flower's existing `flower-theme` key and persists until OSCAR is selected again; selecting OSCAR removes the stored override. The old Ericsson `oscar-flower-theme` key is not migrated, so existing custom-branch users start in the new OSCAR default. OSCAR mode changes become visible when a Flower tab loads or gains focus. In an open focused tab, a change made in OSCAR appears on the next focus; no background polling is required. Refreshes use latest-request-wins ordering, so an older slow response cannot replace a newer palette or preference; every accepted response is applied against the current manual override.

Flower maps the API roles to its existing Bootstrap and Flower variables: canvas/body background, paper/card background, primary and secondary text, divider, links and focus, selected state, status colors, body and mono font stacks, and radius. Where Classic legitimately resolves a role to `null`, Flower uses a safe local Classic fallback: divider for control borders, readable body text for a light-mode link, primary for a dark-mode link/focus, and a contrast-selected label color for primary fills. The mapping validates schema version, mode keys, CSS color values, bounded sizes, and font IDs before writing an allowlist of CSS properties; it never interpolates arbitrary response strings into a stylesheet. Bootstrap's RGB companion variables are updated alongside colors that use them. The compiled Bootstrap 5.3 button and badge classes carry their own color variables, so Flower also binds the primary, outline-primary, danger, success, and warning classes it actually uses to the mapped roles. Its navbar background and task-state badge must use mapped variables rather than their current fixed green/blue values. Active navigation links, the page eyebrow, worker tabs, and the skip link use readable foreground roles rather than putting Classic yellow text on a pale surface or white text on a yellow fill.

The API supplies both modes in one response. Flower switches between the mapped palettes when its control changes without a second request. It fetches on load and refetches on window focus. When a fetch fails or the schema is unsupported, Flower keeps the last valid palette and mode in that tab; before any valid response, it uses its packaged OSCAR-like fallback CSS and the browser's light/dark preference. A manual Flower override remains usable during outages. The page must never turn blank or lose its controls because branding is unavailable.

The wheel includes the Ericsson logo assets already present in the custom branch. Logo replacement from OSCAR's image slots is outside this first integration; the requested dynamic elements are palette, typography, shape, and appearance mode.

## Fonts and routing

Flower loads Hilda only when the resolved typography asks for it. Its `@font-face` declarations use the existing AdminUI files under `/fonts/branding/`. Traefik exposes only `GET /api/branding/flower` and the `/fonts/branding/` static path on Flower's `:5555` entry point, forwarding them to AdminUI. The existing `/flower` route remains Flower's own service. The font route serves the same immutable local WOFF2 files as AdminUI; no font CDN or copied font bundle is added. A failed font request falls back to the resolver's safe system stack. Before any API response, the packaged fallback is OSCAR Classic-like: dark canvas `#242424`, paper `#3A3A3A`, text `#F2F2F2`, primary `#FAD22D`; light canvas `#FFFFFF`, paper `#FAFAFA`, text `#0C0C0C`, primary `#C6A823`.

## Accessibility and security

The Flower theme control keeps its accessible name and pressed state. Links, focus rings, selected rows, badges, and text must remain legible in Classic and Modern, light and dark. Colors with a Classic `null` role are not emitted as invalid CSS. No write API, secret, session token, or database data is exposed by the new route. The mode cookie is validated, contains no identifier, and cannot authorize anything. The route does not allow user-provided URLs or arbitrary file names.

## Verification and delivery

Tests cover the endpoint contract and failure status, cookie synchronization and semi-dark mapping, Flower mode preference and manual override, request ordering, palette validation/mapping, and Classic/Modern light/dark samples. Check direct Flower navigation, OSCAR-launched Flower, template changes, focus refresh, endpoint outage, font fallback, and computed foreground/background contrast in an isolated local browser fixture. Run AdminUI targeted tests/build, Flower tests/wheel packaging, and Traefik configuration validation. Confirm the generated `oscar_flower` wheel contains the new JavaScript, CSS, templates, and Ericsson images.

Work stays on local feature branches for `flower`, `oscar-adminui`, and `oscar`. The wheel is copied only into the `oscar` feature worktree. No push, merge to main, live stack modification, migration, or new secret is part of implementation. A deployer later builds AdminUI and Taskmanager images and reloads reverseproxy configuration together.
