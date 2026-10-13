# Inertia Hono JSX Sample

This sample follows the Hono Vite template shape: a single `vite` dev server runs the Hono app,
and client assets are injected with `vite-ssr-components`.

The Inertia split is:

- `@hono/inertia` handles the Hono server protocol and `c.render()`.
- `@ts-76/inertia-hono-jsx` handles the client adapter and Hono JSX DOM rendering.

```sh
pnpm build # from the repository root, before installing this sample
cd sample
pnpm install --ignore-workspace
pnpm dev
```

Open:

```txt
http://localhost:5173
```

This directory is a repository sample only. It is intentionally not included in the adapter package
build or npm package contents.

The adapter is installed from `file:..`, so build it before installing the sample. After changing the
adapter, rebuild it and run `pnpm update @ts-76/inertia-hono-jsx --ignore-workspace` in this directory
to refresh the local package. `pnpm exec tsc --noEmit` verifies page props against the package's
declarations and the generated `@hono/inertia` registry.

The server uses `@hono/inertia` `0.8.x`: `defer()` supplies the stats and `scroll()` supplies both
infinite lists. Page props, partial filtering, scroll merge direction and asset versions all pass
through `c.render()`. Browser pages compile with `hono/jsx/dom`; the HTML shell uses `hono/jsx`.
