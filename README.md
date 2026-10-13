# Inertia.js Hono JSX Adapter

The Hono JSX adapter for Inertia.js.

This is an experimental, community-scoped package. It is not an official Inertia adapter package.

> [!NOTE]
> Browser rendering uses `hono/jsx/dom` for `createRoot` and `hydrateRoot`. Page components can be
> compiled with either `hono/jsx` or `hono/jsx/dom` in the browser; hooks and context come from
> `hono/jsx`. SSR must compile the entire page/layout tree with `hono/jsx`, as documented below.

This package is a client-side adapter for apps that render interactive pages with `hono/jsx/dom`.
It delegates the Inertia protocol, visits, history, progress, partial reloads, remembered state, and
prefetch cache to `@inertiajs/core`.

## Installation

```sh
pnpm add @ts-76/inertia-hono-jsx @inertiajs/core hono
```

For Hono server integration and page props typing, install `@hono/inertia` as well:

```sh
pnpm add @hono/inertia@^0.8.0
```

```tsx
import { createInertiaApp } from '@ts-76/inertia-hono-jsx'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })

    return pages[`./Pages/${name}.tsx`]
  },
})
```

Without a custom `setup`, the adapter mounts `<App />` for you. It uses `hydrateRoot` when the root
element has `data-server-rendered`, otherwise it uses `createRoot`.

For browser page components, set `jsx: "react-jsx"` and `jsxImportSource: "hono/jsx/dom"` in your
TypeScript/build configuration. `jsxImportSource: "hono/jsx"` also works in the browser.

| Integration | Supported scope |
| --- | --- |
| `hono/jsx` | Browser pages, hooks/context, and synchronous SSR |
| `hono/jsx/dom` | Browser pages, `createRoot`, and render-like `hydrateRoot` |
| `@hono/inertia` `0.8.x` | Initial HTML/JSON, shared and lazy props, partial/deferred props, merge/scroll metadata, redirects and asset versions |

The server middleware is the separate `@hono/inertia` package, not a `hono/inertia` export of Hono
core. Earlier `0.2.x` middleware versions are no longer in this adapter's peer dependency range.

## API

The adapter exports:

- `createInertiaApp`
- `App`
- `Link`
- `Head`
- `Deferred`
- `WhenVisible`
- `InfiniteScroll`
- `Form`
- `usePage`
- `useForm`
- `useHttp`
- `useRemember`
- `usePoll`
- `usePrefetch`
- `useFormContext`
- `setLayoutProps`
- `resetLayoutProps`
- `router`, `http`, and `progress` from `@inertiajs/core`
- `InertiaPageProps`, `PageComponent`, `PageName`, `PagePropsFor`, and `PageComponentMap` types for page props typing
- `@ts-76/inertia-hono-jsx/server`, which re-exports the Inertia SSR server helper

The `createInertiaApp()` `layout` option matches the React adapter shape. The older
`defaultLayout` option is also accepted as an alias.

`useForm()` and `useHttp()` mutator methods such as `withPrecognition()`,
`setValidationTimeout()`, `validateFiles()`, `withAllErrors()`, and `optimistic()` are side-effect
commands and return `void`. Call them as separate statements instead of treating them as a builder
chain.

## Example page

```tsx
import { Form, Head, Link, type PageComponent } from '@ts-76/inertia-hono-jsx'

const UsersIndex: PageComponent<'Users/Index'> = ({ users }) => {
  return (
    <main>
      <Head title="Users" />
      <h1>Users</h1>

      {users.map((user) => (
        <Link href={`/users/${user.id}`} key={user.id}>
          {user.name}
        </Link>
      ))}

      <Form action="/users" method="post" resetOnSuccess>
        {({ processing, errors }) => (
          <>
            <input name="name" />
            <p>{errors.name}</p>
            <button type="submit" disabled={processing}>
              Save
            </button>
          </>
        )}
      </Form>
    </main>
  )
}

export default UsersIndex
```

## Page props typing

The preferred typing model is to let `@hono/inertia` describe the server-rendered page object, then
reuse that page name on the client. Use `@hono/inertia/vite` to generate `pages.gen.ts`; it
registers your Hono app so `PagePropsFor<Name>` resolves from the route that calls
`c.render(Name, props)`.

```ts
// vite.config.ts
import { inertiaPages } from '@hono/inertia/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [inertiaPages()],
})
```

```tsx
// Pages/Users/Show.tsx
import { type PageComponent, usePage } from '@ts-76/inertia-hono-jsx'

const UsersShow: PageComponent<'Users/Show'> = ({ user }) => {
  const page = usePage<'Users/Show'>()

  return <h1>{user.name}</h1>
}
```

Use a chained Hono app export so Hono can retain route output types for `AppRegistry`:

```tsx
const app = new Hono()
  .use(inertia())
  .get('/users/:id', (c) =>
    c.render('Users/Show', {
      user,
    }),
  )

export default app
```

The generated `InertiaPages` constrains valid page names, and `@hono/inertia`'s `AppRegistry`
provides the props type from `c.render()`. `InertiaPageProps` remains available as an explicit
override or fallback when an app cannot expose typed Hono route output.

With `@hono/inertia` `0.8.x`, this includes props returned by `inertia({ share: ... })`, resolved
lazy props, and page props that override shared values. `AppRegistry` can also be augmented manually
without generating an `InertiaPages` registry.

Avoid `usePage<{ ... }>()` style client-side prop annotations. Page props should come from a page
name registered by `@hono/inertia`, not from a second client-only definition.

## Server integration

This adapter focuses on the browser rendering layer. In a Hono application, the server-side Inertia
protocol is expected to be handled by a server integration such as `@hono/inertia`.

The split is:

- `@hono/inertia`: server middleware and `c.render()` behavior for initial HTML, Inertia JSON
  responses, redirects, errors, and asset version handling.
- `@ts-76/inertia-hono-jsx`: client boot, component resolution, Hono JSX rendering, links,
  forms, head updates, layouts, remembered state, polling, prefetch state, deferred props, and
  viewport-triggered reloads.

Use the middleware's `defer()` and `scroll()` helpers with the adapter's `Deferred` and
`InfiniteScroll` components. The middleware produces the page metadata and the client core processes
the follow-up requests and merge behavior. See `sample/` for a runnable integration using these
helpers. Form endpoints should accept JSON requests (`c.req.json()`) as well as multipart requests
(`c.req.parseBody()`), since the client core selects the body format based on the submitted data.

Initial page data should use Inertia's JSON script format, for example:

```html
<script data-page="app" type="application/json">
  {"component":"Home","props":{},"url":"/","version":"1"}
</script>
<div id="app"></div>
```

## SSR

This adapter exposes `@ts-76/inertia-hono-jsx/server`, which re-exports the Inertia SSR server helper.
`createInertiaApp()` can also be used in a server entry with Hono's `renderToString()`:

```tsx
/** @jsxImportSource hono/jsx */
import { createInertiaApp } from '@ts-76/inertia-hono-jsx'
import createServer from '@ts-76/inertia-hono-jsx/server'
import { renderToString } from 'hono/jsx/dom/server'

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })

      return pages[`./Pages/${name}.tsx`]
    },
  }),
)
```

> [!NOTE]
> SSR entries should pass both `page` and `render`. The `render` option is the public SSR
> discriminator for `createInertiaApp()`; in the TypeScript API, passing `page` without `render`
> does not select the SSR overload.

The SSR build must use `jsxImportSource: "hono/jsx"` for **all** imported pages and layouts, not
just the entry file. Hono's `renderToString` uses server JSX nodes; DOM JSX nodes produced by
`hono/jsx/dom/jsx-runtime` cannot be passed directly to it. If your browser build uses
`hono/jsx/dom`, compile the same sources separately with `hono/jsx` for SSR. The browser test fixture
in `tests/browser/server.mjs` demonstrates this split.

SSR support is intentionally limited to what Hono's `renderToString()` supports. Async components are not supported, and Hono's DOM hydration is render-like rather than React's strict hydration model.

Supported SSR behavior includes the initial page body, `usePage()` context, `Head`, and simple
layout/default layout rendering. Client hydration should still be treated as Hono DOM rendering, not
React-style strict hydration.

## Tested behavior

The automated tests run against the package's built JavaScript:

- `pnpm test:ssr`: SSR page context, Head, Form, layouts, concurrent requests, safe page JSON,
  and real middleware HTML/JSON, partial/deferred responses, merge/scroll metadata, redirects and
  asset version conflicts.
- `pnpm test:typecheck`: SSR/CSR overloads and middleware page props, including shared/lazy props,
  overrides, and both manual and generated registry shapes.
- `pnpm test:browser`: Chromium with pages compiled under both JSX runtimes, covering boot,
  interactive hooks, shared props, partial/deferred reloads, Head, links, Form/useForm, SSR boot,
  and InfiniteScroll append/prepend.

Install the browser once with `pnpm exec playwright install chromium`. PR CI runs the suite with
Hono `4.12.20` and `4.13.13`. The older `test-app/` pages remain illustrative fixtures; remembered
state, cancellation, polling, prefetch and viewport-triggered reloads are outside this automated suite.

## Non-goals

This adapter does not aim for complete React adapter parity. It does not provide React-specific
features such as `StrictMode`, React DevTools integration, React ref fidelity, or React's exact
hydration behavior. SSR is intentionally limited, and async component SSR is not supported.
