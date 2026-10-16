# OSCAR Flower dynamic branding implementation

**Branch:** `feature/oscar-flower-dynamic-branding` in `flower`, `oscar-adminui`, and `oscar`. Changes are local and have not been pushed or merged to main.

## Delivered

- Flower 2.2 merged with the Ericsson branch; the wheel distribution remains `oscar-flower` and retains Ericsson images.
- AdminUI mirrors its browser appearance setting to a persistent same-host cookie and serves `GET /api/branding/flower/` with both resolved template modes and the preferred mode.
- Reverseproxy forwards only the read-only branding endpoint and local branding fonts on Flower's origin.
- Flower maps the returned palette, fonts, status colors, and shape; follows OSCAR by default; and keeps its Light/Dark override with an OSCAR reset choice.
- The Taskmanager feature worktree contains one Flower 2.2 wheel, replacing the old 2.0 wheel.

## Deployment sequence for later UAT

Build AdminUI and Taskmanager from their feature branches and reload reverseproxy with the `oscar` feature branch configuration together. Flower's UI is supplied by the Taskmanager wheel; no separate Flower image source build is required. No migration, secret, or new runtime dependency was added. The live stack was not changed in this work.

## Verification

- Astra adversarial plan review: no remaining BLOCK/HIGH findings before implementation.
- AdminUI production build: passed. New targeted suites: 19/19 passed.
- Flower views: 117/117 passed. Node theme tests: 6/6 passed. Wheel ZIP: 59 entries with theme JS, CSS, navbar, and Ericsson images.
- Reverseproxy Go template rendered and parsed as YAML; narrow router source test: 1/1 passed. A Traefik executable was unavailable for runtime validation.
- Isolated local browser fixture: Classic and Modern in light and dark, direct navigation, manual override/reset, focus refresh, API outage, and missing font fallback. Sampled active navigation, eyebrow, worker tab, skip link, primary/outline/danger buttons, and status badges all computed at or above 4.5:1 text contrast.
- Broader baseline: AdminUI `yarn test` had 4,949 passed, three expected failures, and one existing Modern dark grid-header expectation failure reproduced on untouched main. Flower `tests/unit` had 351 passed and two failures also reproduced on untouched upstream Flower master (`redis Retry.get_retries` API and macOS `/private/var` temp path).

Integrated routing and UAT against a deployed stack remain for the later deployment step.
