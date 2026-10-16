# OSCAR Flower Dynamic Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Flower follow OSCAR's active template palette and the current browser's OSCAR light/dark preference, while keeping a Flower-only override.

**Architecture:** AdminUI resolves both saved template modes through its existing resolver and publishes a public read-only JSON response. A small mode cookie carries the browser preference across OSCAR's two ports. Flower maps that response to Bootstrap and Flower variables; Traefik forwards only that endpoint and local fonts on Flower's entry point.

**Tech Stack:** Next.js API routes, Vitest, Flower 2.2, browser JavaScript/CSS, Node's built-in test runner, Traefik dynamic configuration, Python wheel.

**Spec:** `docs/superpowers/specs/2026-10-16-oscar-flower-dynamic-branding-design.md` in the Flower feature worktree.

## Global Constraints

- Use local branches named `feature/oscar-flower-dynamic-branding` in `flower`, `oscar-adminui`, and `oscar`; do not edit their `main` checkouts.
- Do not push, merge to main, modify the live stack, add a migration, or add a secret.
- Preserve the `oscar-flower` distribution name and `flower` import name; Taskmanager's Dockerfile installs `oscar_flower-*.whl`.
- API schema version is `1`; the endpoint is public, read only, returns no drafts or user data, and uses `Cache-Control: no-store`.
- Mode cookie is `oscar-ui-mode`, `Path=/; SameSite=Lax; Secure; Max-Age=31536000`; it contains only `light` or `dark`, and `semi-dark` maps to `light`.
- No new runtime dependency; fonts come from AdminUI's existing `/fonts/branding/` files.
- Preserve the Flower control's accessible label and pressed state, and keep Flower usable without the branding API.

## Review Focus

- A stale or invalid mode cookie must select the configured OSCAR default; a persisted light cookie must survive browser restart and direct Flower navigation (Task 1 and 2 tests).
- Metadata outages must return `503` without a false Classic success, while Flower keeps its last valid palette (Task 2 and 4 tests).
- Classic's null link/focus/control roles and rgba colors must produce valid, legible Flower values (Task 4 tests).
- Switching dark to light after a manual Flower override must update both colors and RGB companion variables without losing the override; older overlapping fetches must not win (Task 4 tests).
- The built wheel must contain the merged Flower 2.2 theme script, OSCAR mapping, and Ericsson assets, while the reverseproxy routes cannot reach write branding APIs (Task 3 and 5 checks).

---

### Task 1: Share OSCAR's browser mode across ports

**Files:**
- Create: `oscar-adminui/src/lib/branding/flowerMode.js`
- Modify: `oscar-adminui/src/@core/context/settingsContext.js`
- Test: `oscar-adminui/src/lib/branding/flowerMode.test.js`
- Test: `oscar-adminui/src/tests/hooks/settingsContextFlowerMode.test.js`

**Interfaces:**
- Produce `normalizeFlowerMode(mode: unknown): 'light' | 'dark'` (`semi-dark` -> `light`; invalid -> configured default).
- Produce `writeFlowerModeCookie(mode: unknown): void`; browser-only, safe if cookies are unavailable.
- `SettingsProvider` calls the writer after restored settings are known and whenever `saveSettings` changes mode.

- [ ] **Step 1: Write failing tests** for light, dark, semi-dark, invalid input, persistent cookie attributes, initial settings restoration, mode toggles, and a direct Flower visit after browser restart. Mount the actual `SettingsProvider` in the hook test with a jsdom environment; stub local storage and cookies without changing other settings behavior.
- [ ] **Step 2: Run** `yarn test src/lib/branding/flowerMode.test.js src/tests/hooks/settingsContextFlowerMode.test.js`; expect failures for the missing helper and sync.
- [ ] **Step 3: Implement** `flowerMode.js` and the two `settingsContext.js` calls. Use the current `themeConfig.mode` as the missing/invalid fallback.
- [ ] **Step 4: Run** both targeted tests; expect all cases to pass.
- [ ] **Step 5: Commit** the helper, caller, and test in the AdminUI feature worktree.

### Task 2: Publish the active resolved template and browser mode

**Files:**
- Create: `oscar-adminui/src/pages/api/branding/flower.js`
- Test: `oscar-adminui/src/tests/pages/api/branding/flower.test.js`

**Interfaces:**
- Consume `apiGet(req, '/branding')`, `resolveBranding(metadata, {mode})`, and `normalizeFlowerMode(req.cookies?.['oscar-ui-mode'])`.
- Produce canonical `GET /api/branding/flower/` with `{schema_version, branding_revision, template_id, preferred_mode, modes:{light,dark}}`; each mode is `.tokens` from the existing resolver, and a missing revision is JSON `null`.
- Return `503` for failed or empty metadata; `405` and `Allow: GET` for other methods.

- [ ] **Step 1: Write failing route tests** with valid Modern and Classic metadata, missing/invalid cookie, `semi-dark` cookie, empty metadata, upstream exception, and rejected write method. Assert no draft or raw user fields leak, `no-store` on responses, and exact two-mode token shape. Pin the canonical trailing-slash URL used by Flower.
- [ ] **Step 2: Run** `yarn test src/tests/pages/api/branding/flower.test.js`; expect missing-route failure.
- [ ] **Step 3: Implement** the route using the existing public branding fetch and resolver; log upstream errors through `logProxyError` and return a fixed `503` body.
- [ ] **Step 4: Run** route tests plus `src/lib/branding/resolveBranding.test.js`; expect pass.
- [ ] **Step 5: Commit** route and test in the AdminUI feature worktree.

### Task 3: Serve the JSON and fonts on Flower's origin

**Files:**
- Modify: `oscar/oscar-reverseproxy/traefik/conf/traefik.yml`
- Test: `oscar/oscar-reverseproxy/tests/test_flower_branding_routes.py` (small source-contract test if no native Traefik validator is installed)

**Interfaces:**
- On the `flower` entry point, route `GET` for both `/api/branding/flower/` and `/api/branding/flower` to `adminui` with higher priority than `/flower`; Flower fetches the canonical trailing-slash path.
- On the same entry point, route `/fonts/branding/` to `adminui`; keep the existing `/flower` router unchanged.

- [ ] **Step 1: Write a failing route test** that checks both exact endpoint spellings, Next.js redirect target, service, entry point, host matcher, priority, and absence of a broad `/api/branding` route.
- [ ] **Step 2: Run** `python3.13 -m pytest -q oscar-reverseproxy/tests/test_flower_branding_routes.py`; expect failure.
- [ ] **Step 3: Add** the two narrow routers to `traefik.yml`; no new service or environment variable.
- [ ] **Step 4: Run** the route test and a YAML/Traefik parse check if a validator is available; expect pass. Document any unavailable validator in the verification note.
- [ ] **Step 5: Commit** router and test in the `oscar` feature worktree.

### Task 4: Follow OSCAR from Flower with a manual override

**Files:**
- Modify: `flower/flower/static/js/theme.js`
- Modify: `flower/flower/templates/navbar.html`
- Modify: `flower/flower/static/css/flower.css`
- Test: `flower/tests/js/theme.test.js`

**Interfaces:**
- Consume the Task 2 response from canonical same-origin `/api/branding/flower/`.
- Flower control values are `oscar`, `light`, `dark`; `oscar` removes `flower-theme` local storage, manual choices store it.
- Map validated active-mode tokens to existing `--bs-*` and `--flower-*` variables and used Bootstrap component variables. Refetch on load/focus; keep last good result on failure.

- [ ] **Step 1: Write failing Node tests** for OSCAR default, manual override persistence/reset, focus refresh, reverse-order overlapping fetches, invalid schema/color/size/font rejection, null Classic roles, readable primary-fill text, rgba to RGB conversion, dark/light switch, and API failure before/after success. Use a small fake DOM/fetch; run the actual script.
- [ ] **Step 2: Run** `node --test tests/js/theme.test.js`; expect failures.
- [ ] **Step 3: Implement** the control and allowlisted CSS variable mapping in `theme.js`. Keep one response for both modes; map `semi-dark` only at the OSCAR cookie. Use latest-request-wins ordering and apply accepted responses against the current manual override. Preserve accessible control updates.
- [ ] **Step 4: Update** `navbar.html` to label the default as OSCAR and `flower.css` for Classic-like startup palettes, local Hilda `@font-face` rules, variable-based navbar/task-state colors, used Bootstrap button/badge variants, and readable active navigation, eyebrow, worker-tab, and skip-link foregrounds. Keep static Ericsson images as specified.
- [ ] **Step 5: Run** Node tests and `python3.13 -m pytest -q tests/unit/views`; expect pass. Check syntax with `node --check flower/static/js/theme.js`.
- [ ] **Step 6: Commit** script, template, CSS, and tests in the Flower feature worktree.

### Task 5: Package and verify the cross-repo result

**Files:**
- Modify: `oscar/oscar-taskmanager/wheels/oscar_flower-2.0.0-py2.py3-none-any.whl` (remove old wheel)
- Create: `oscar/oscar-taskmanager/wheels/oscar_flower-2.2.0-py2.py3-none-any.whl`
- Update: `flower/BUILD_INSTRUCTIONS.md` only if a tested command differs from the merge-stage instructions.

**Interfaces:**
- Taskmanager Dockerfile's existing wildcard must match exactly one custom wheel.

- [ ] **Step 1: Build and copy** the wheel using `TASKMANAGER_WHEELS_DIR=/absolute/path/to/oscar-feature-worktree/oscar-taskmanager/wheels uv run --no-project --python 3.13 --with setuptools --with wheel ./build_and_deploy.sh`. Expect `dist/oscar_flower-2.2.0-py2.py3-none-any.whl`.
- [ ] **Step 2: Inspect** the wheel ZIP for `theme.js`, `flower.css`, templates, and three Ericsson PNGs; fail if any are absent.
- [ ] **Step 3: Confirm** the old 2.0 wheel is removed from the `oscar` feature worktree and the Dockerfile wildcard matches exactly one file.
- [ ] **Step 4: Run** AdminUI targeted branding tests and `yarn build`; run Flower `tests/unit/views`, Node theme tests, and full `tests/unit`. The two full-suite failures already reproduced on untouched upstream master (`Retry.get_retries` with local Redis package; `/private/var` on macOS); record them without modifying unrelated upstream code.
- [ ] **Step 5: Verify in an isolated local browser fixture** Classic/Modern in light/dark, direct and OSCAR-launched navigation, manual override/reset, focus refresh, endpoint outage, and font failure. Inspect computed foreground/background contrast for active navigation, eyebrow, worker tabs, skip link, and primary buttons/badges; do not modify the live stack.
- [ ] **Step 6: Review** diff and whitespace checks in all three feature worktrees, then commit the wheel replacement in `oscar`. Do not build or restart the live stack.

## Review and execution order

The requested Astra adversarial review runs against this plan, the spec, and Flower merge commit `0d9942a` **before Task 1**. Fix material findings in the spec/plan and repeat the review if a finding changes the interface. Then execute Tasks 1–5 in order, with focused tests and commits. Finish with a code review of the three feature branches and a deployment note listing AdminUI, Taskmanager/Flower, and reverseproxy as the changed services.
