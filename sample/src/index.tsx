/** @jsxImportSource hono/jsx */
import { defer, inertia, scroll, serializePage, type RootView } from '@hono/inertia'
import { Hono } from 'hono'
import { renderToString } from 'hono/jsx/dom/server'
import { Link as ViteLink, Script, ViteClient } from 'vite-ssr-components/hono'

const version = 'hono-vite-sample'

const users = [
  { id: 1, name: 'Taka', role: 'Designer' },
  { id: 2, name: 'Mika', role: 'Engineer' },
  { id: 3, name: 'Ren', role: 'Product' },
]

const scrollUsers = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: `Scroll User ${index + 1}`,
}))

function paginateScrollUsers(page: number, perPage = 8, pageName = 'page') {
  const start = (page - 1) * perPage
  const data = scrollUsers.slice(start, start + perPage)
  return scroll({
    data,
    currentPage: page,
    lastPage: Math.ceil(scrollUsers.length / perPage),
    pageName,
    matchOn: 'id',
  })
}

const rootView: RootView = (page) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hono JSX Inertia Sample</title>
    ${renderToString(<ViteClient />)}
    ${renderToString(<ViteLink href="/src/style.css" rel="stylesheet" />)}
  </head>
  <body>
    <script data-page="app" type="application/json">${serializePage(page)}</script>
    <div id="app"></div>
    ${renderToString(<Script src="/src/client.tsx" />)}
  </body>
</html>`

const app = new Hono()
  .use(inertia({ version, rootView }))
  .get('/', (c) =>
    c.render('Home', {
      message: 'Hello from a Hono Vite server',
      stats: defer(() => ({ visits: 42 })),
      users,
    }),
  )
  .get('/users', (c) =>
    c.render('Users/Index', {
      users,
    }),
  )
  .get('/users/:id', (c) => {
    const user = users.find((candidate) => candidate.id === Number(c.req.param('id')))

    if (!user) {
      return c.notFound()
    }

    return c.render('Users/Show', {
      user,
    })
  })
  .get('/adapter/form', (c) =>
    c.render('Adapter/Form', {
      submitted: null,
    }),
  )
  .post('/adapter/form/success', async (c) => {
    const body = c.req.header('Content-Type')?.includes('application/json')
      ? await c.req.json<Record<string, unknown>>()
      : await c.req.parseBody({ all: true })

    return c.render('Adapter/Form', {
      submitted: body,
    })
  })
  .post('/adapter/form/cancel-slow', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return c.render('Adapter/Form', {
      submitted: c.req.header('Content-Type')?.includes('application/json')
        ? await c.req.json<Record<string, unknown>>()
        : await c.req.parseBody({ all: true }),
    })
  })
  .get('/adapter/head', (c) => c.render('Adapter/HeadKeys'))
  .get('/adapter/infinite', (c) => {
    const manualPage = Number(c.req.query('manualPage') ?? c.req.query('page') ?? 2)
    const autoPage = Number(c.req.query('autoPage') ?? 1)
    const manual = paginateScrollUsers(manualPage, 8, 'manualPage')
    const auto = paginateScrollUsers(autoPage, 6, 'autoPage')

    return c.render('Adapter/InfiniteReverse', {
      manualPage,
      manualUsers: manual,
      autoUsers: auto,
    })
  })

export default app
