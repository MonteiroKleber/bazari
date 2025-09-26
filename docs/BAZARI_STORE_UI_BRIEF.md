# Bazari — Store UI: Codex Briefing Guide

Purpose: This file tells Codex exactly what to implement for each phase of the “Bazari — UI da Loja (Busca, Categorias e Temas)” spec. Copy the relevant phase brief into your Codex task, say which phase to execute, and let it implement. No changes outside the stated scope.

How To Use
- Pick a phase below and copy the corresponding “Brief to Codex” block.
- Include the Global Context once per task to give Codex environment/run info.
- Keep Approvals/Constraints as stated to avoid unintended changes.

Global Context (paste once per session)
- Repo: monorepo with apps/api and apps/web.
- Run web: `pnpm --filter @bazari/web dev` (port 5173). Run API: `pnpm --filter @bazari/api dev` (port 3000). Root uses pnpm workspaces.
- Environment: workspace-write FS, network restricted; ask approval before installing deps or running destructive commands.
- Do not refactor beyond scope; keep changes minimal and aligned to the existing style. Do not modify unrelated tests/config.
- Current store public page: `apps/web/src/pages/SellerPublicPage.tsx` under route `/seller/:shopSlug`.
- Search (global) endpoint: `apps/api/src/routes/search.ts` using `apps/api/src/lib/searchQuery.ts` (PG) and optional OS via `apps/api/src/lib/osQuery.ts`.
- Store public data endpoint: `apps/api/src/routes/sellers.ts` GET `/sellers/:shopSlug` (no filters today).

Shared Constraints (all phases)
- Keep marketplace search page behavior unchanged unless explicitly stated.
- Avoid global theme regressions. Header/ThemeProvider must remain intact.
- Prefer reusing existing hooks/components (useSearch, cards, facets) before creating new ones.
- Ask for approval before adding packages or changing build tooling.

————————————————————————————————————————
PHASE 1 — MVP Embutido (Low-risk foundation)

Goals
- Add store-scoped search (products/services) with filters/sort using the existing search stack.
- Refactor the store public page to reuse marketplace components: header block, search input (no autocomplete), controls, sidebar, grid with loading/empty/error.
- Isolate store theming with a simple wrapper (CSS vars override) without touching global theme provider.
- Extend store setup to persist theme and main category chips (policies JSON).

Scope (must)
- API: `/search` accepts `storeId` and/or `storeSlug`; apply `sellerStoreId = storeId` filter for Product and Service in results and facets. Keep PG as default; OS optional fallback.
- Web: in `/seller/:shopSlug`, switch to use `useSearch` with store scope. Add basic StoreHeader, StoreSearchBar (debounce, no autocomplete), StoreControls (sort/view/metrics placeholder), StoreSidebar (categories facets + price), reuse grid/cards with proper states.
- Theming: Add a `StoreLayout` wrapper that overrides CSS variables (`--background`, `--foreground`, `--primary`, `--accent`) scoped to the store container, values from `sellerProfile.policies.storeTheme`.
- Setup: extend `SellerSetupPage` with optional theme (preset + custom) and primary categories (up to 6) persisted in `policies`.

Non-scope (must not)
- Do not implement Branded mode, SEO, JSON-LD, autocomplete, virtualized grid, or Tailwind `--store-*` tokens yet.
- Do not change the global ThemeProvider or Tailwind config in this phase.

Files (expected touchpoints)
- API: `apps/api/src/routes/search.ts`, `apps/api/src/lib/searchQuery.ts` (and if OS is active, `apps/api/src/lib/osQuery.ts`).
- Web page: `apps/web/src/pages/SellerPublicPage.tsx` to adopt store-scoped search layout.
- New components: `apps/web/src/modules/store/StoreHeader.tsx`, `StoreSearchBar.tsx`, `StoreControls.tsx`, `StoreSidebar.tsx`, `StoreLayout.tsx`.
- Setup tweaks: `apps/web/src/pages/SellerSetupPage.tsx` (optional fields into `policies`).

Acceptance Criteria
- `GET /search?storeSlug=<slug>&q=...` returns only items of that store; facets reflect the scoped set.
- `/seller/:shopSlug` shows header + search + filters + sort + grid with proper loading/empty/error; pagination works.
- Changing the app theme via header does not alter store look (wrapper isolation works).
- `/search` without store scope behaves exactly as before.

Validation Steps
- API: manually hit `/search?storeSlug=loja-perfil-teste-001&q=test` and verify counts/facets; test both products and services.
- Web: open `/seller/loja-perfil-teste-001`, try searching, filtering, sorting; confirm isolation from global theme.
- Mobile: ensure header sticky and basic responsive layout; drawer filters not required yet.

Feature Flag
- Optional: `store_ui_v1` to gate new UI per store or globally.

Brief to Codex (copy-paste)
“Implement Phase 1 — MVP Embutido of ‘Bazari — UI da Loja’:
- API: Extend `GET /search` to accept `storeId`/`storeSlug` and filter `sellerStoreId` for Product/Service, including facets. Prefer Postgres path in `searchQuery.ts`; keep OS fallback if present. No behavior change when no store scope.
- Web: Refactor `apps/web/src/pages/SellerPublicPage.tsx` to reuse marketplace search (via `useSearch`) scoped to the store; add `StoreHeader`, `StoreSearchBar` (debounce only), `StoreControls`, `StoreSidebar`, and `StoreLayout` wrapper reading `sellerProfile.policies.storeTheme`. Reuse existing Card/Grid patterns and states.
- Setup: Add optional theme and primary categories (up to 6) saving into `policies` on `SellerSetupPage`.
- Constraints: Do not alter ThemeProvider/Tailwind config. Do not implement Branded/SEO/Autocomplete/Virtualization.
- Acceptance/Validation: Follow docs/BAZARI_STORE_UI_BRIEF.md > Phase 1. Ask approval before adding dependencies.”

————————————————————————————————————————
PHASE 2 — Branded + Store Tokens

Goals
- Add short branded route with a minimal top-bar and SEO basics per store.
- Introduce store color tokens (optional), keeping Bazari app tokens separate.

Scope (must)
- Route: add `/s/:slug` rendering the same store page in `mode="branded"`.
- Top-bar: `StoreTopBar` (56px sticky) with “Powered by Bazari • Pagamento em BZR • Wallet status • Voltar”.
- SEO: set `document.title`, `meta description`, and `link rel=canonical` for branded route.
- Tokens (optional in this phase): add Tailwind color mapping for `store.*` backed by `--store-*` CSS vars; migrate store components to `bg-store-*` classes.

Non-scope
- Do not change marketplace/global pages styling. No JSON-LD yet.

Files
- Web: `apps/web/src/App.tsx` (add route), `apps/web/src/modules/store/StoreTopBar.tsx`, small SEO util `apps/web/src/lib/seo.ts`.
- Theming (optional): `apps/web/tailwind.config.js` to add `store: { bg, ink, brand, accent }`; update store components to use them.

Acceptance Criteria
- `/s/:slug` renders with the top-bar; theme remains the store’s; the app shell still honors its own theme.
- Title/description/canonical applied on branded route.

Validation Steps
- Navigate to `/s/loja-perfil-teste-001`; verify top-bar, theme isolation, and SEO tags in DOM.

Feature Flag
- `store_branded_v1` to enable the branded route.

Brief to Codex
“Implement Phase 2 — Branded + Tokens:
- Add `/s/:slug` and `StoreTopBar`. Apply basic SEO per store in branded mode.
- Optionally introduce Tailwind `store.*` tokens backed by `--store-*` vars and migrate store components to them; ensure the app shell still reads `--app-*`.
- Do not change marketplace pages or introduce JSON-LD yet. Follow acceptance/validation in this file. Ask before adding deps.”

————————————————————————————————————————
PHASE 3 — UX Avançada (Autocomplete, Árvore, Chips, Persistência, Virtualização)

Goals
- Improve search UX with autocomplete, full category tree, active filter chips, view/sort persistence, mobile drawer, and virtualization for large grids.

Scope (must)
- Autocomplete: suggestions for popular store items, categories, and recent terms; debounce 250–350ms; ESC closes; ENTER applies.
- Category Tree: up to 4 levels with breadcrumbs; clicking updates `categoryPath`.
- Filter Chips: show active filters and “Clear all”, preserve scroll and reposition to grid top.
- Persistence: save `sort` and `viewMode` per store in `localStorage`.
- Mobile: sidebar becomes a Drawer; floating “Filtros” button.
- Virtualization: enable when total > 100 items.

Non-scope
- No SEO changes beyond Phase 2. No backend schema changes required.

Files
- Web: extend existing store modules; optionally add `apps/web/src/modules/store/Autocomplete.tsx`, `CategoryTree.tsx`.
- Hooks: enhance `useSearch` (cache by query key, optional SWR-style revalidate) if needed.

Acceptance Criteria
- Autocomplete is responsive without flooding network (debounce), keyboard accessible.
- Filters/sort/view persist across reloads/routes; chips accurately reflect active filters.
- Virtualized list maintains smooth scroll with 500+ items.

Validation Steps
- Manual tests on desktop/mobile; verify localStorage keys like `store:{slug}:sort|view`.

Feature Flag
- `store_ux_v2` to gate advanced UX per store.

Brief to Codex
“Implement Phase 3 — UX Avançada:
- Add autocomplete, category tree (4 levels), active filter chips with clear-all, persist sort/view per store, mobile drawer, and virtualization for large result sets.
- Reuse existing search APIs and hooks; keep behavior of marketplace page unchanged.
- Follow constraints and acceptance in this file; ask before adding virtualization libs.”

————————————————————————————————————————
PHASE 4 — Performance + SEO (Prefetch, Cache, Images, JSON‑LD)

Goals
- Optimize performance and enrich SEO for branded stores.

Scope (must)
- Prefetch categories at route load; cache results by `storeId+q+filters+sort+page`.
- Images: implement `srcset/sizes`, lazy loading, graceful fallbacks.
- SEO: add JSON‑LD for Organization and Product when applicable in branded pages.
- API caching headers: short `Cache-Control` for `/search` responses.

Non-scope
- No UI redesign; incremental enhancements only.

Files
- Web: caching inside `useSearch` (Map by serialized query), `apps/web/src/lib/seo.ts` for JSON‑LD helpers.
- API: add cache headers in `apps/api/src/routes/search.ts` when safe.

Acceptance Criteria
- Warm queries render <200ms; images adapt to viewport; SEO validators see correct JSON‑LD on branded route.

Validation Steps
- Measure TTI with cache warm; inspect `<script type="application/ld+json">` on branded pages.

Brief to Codex
“Implement Phase 4 — Performance + SEO:
- Add prefetch/caching for store search, responsive images, and JSON‑LD on branded pages, plus safe cache headers for `/search`.
- Keep UI intact; follow acceptance/validation in this file. Ask before altering build tooling.”

————————————————————————————————————————
Appendix — i18n Keys & Policies
- Suggested i18n keys: `store.search.placeholder`, `store.filters.title`, `store.sort.relevance`, `store.results.count`, `store.results.empty`, `store.badges.onchainReputation`, `store.badges.verified`.
- Store policies JSON (saved under `sellerProfile.policies`):
  - `storeTheme`: `{ bg, ink, brand, accent }`
  - `primaryCategories`: `string[][]` (each entry is a category path array)
  - `mode`: `"embedded" | "branded"`
  - `educationBzr`: boolean

