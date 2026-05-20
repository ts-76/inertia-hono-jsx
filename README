# Inertia.js Hono JSX Adapter

The Hono JSX adapter for Inertia.js.

This is an experimental, community-scoped package. It is not an official Inertia adapter package.

> [!NOTE]
> This package is intentionally named for Hono JSX, but `hono/jsx` support is partial. Browser
> rendering targets `hono/jsx/dom` for `createRoot` and `hydrateRoot`, while hooks, context, and JSX
> types come from `hono/jsx`. Server-only `hono/jsx` usage is limited to the SSR path documented
> below and does not promise React-style strict hydration fidelity.

This package is a client-side adapter for apps that render interactive pages with `hono/jsx/dom`.
It delegates the Inertia protocol, visits, history, progress, partial reloads, remembered state, and
prefetch cache to `@inertiajs/core`.

## Installation

```sh
pnpm add @ts-76/inertia-hono-jsx @inertiajs/core hono
```

For Hono server integration and page props typing, install `@hono/inertia` as well:

```sh
pnpm add @hono/inertia
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

SSR support is intentionally limited to what Hono's `renderToString()` supports. Async components are not supported, and Hono's DOM hydration is render-like rather than React's strict hydration model.

Supported SSR behavior includes the initial page body, `usePage()` context, `Head`, and simple
layout/default layout rendering. Client hydration should still be treated as Hono DOM rendering, not
React-style strict hydration.

## Tested behavior

The package test app covers initial boot, links, page props, partial reload headers, head updates,
layout props, remembered state, forms, cancellation, polling, prefetch state, deferred props,
viewport-triggered reloads, infinite scroll, and limited SSR.

## Non-goals

This adapter does not aim for complete React adapter parity. It does not provide React-specific
features such as `StrictMode`, React DevTools integration, React ref fidelity, or React's exact
hydration behavior. SSR is intentionally limited, and async component SSR is not supported.
