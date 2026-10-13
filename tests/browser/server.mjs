import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Hono } from 'hono'
import { defer, inertia, scroll, serializePage } from '@hono/inertia'
import { createInertiaApp } from '../../dist/index.js'
import { renderToString } from 'hono/jsx/dom/server'

const directory = fileURLToPath(new URL('.', import.meta.url))
await Promise.all(['hono', 'dom', 'ssr'].map((target) => build({
  entryPoints: [directory + (target === 'ssr' ? 'pages.tsx' : 'client.tsx')],
  outfile: directory + `.build/${target}.mjs`, bundle: true, format: 'esm',
  platform: target === 'ssr' ? 'node' : 'browser',
  packages: target === 'ssr' ? 'external' : undefined,
  jsx: 'automatic', jsxImportSource: target === 'dom' ? 'hono/jsx/dom' : 'hono/jsx',
})))
const pages = await import('./.build/ssr.mjs')
const render = await createInertiaApp({ resolve: (name) => pages[name] })
const app = new Hono()
app.get('/assets/:target', async (c) => c.body(await readFile(directory + `.build/${c.req.param('target')}.mjs`), 200, { 'Content-Type': 'text/javascript' }))
for (const runtime of ['hono', 'dom']) {
  const base = `/${runtime}`
  let messages = 0
  app.use(`${base}/*`, inertia({
    version: 'fixture-1', share: () => ({ base, user: { name: 'Hono user' }, errors: {} }),
    rootView: async (page, c) => {
      const ssr = c.req.path.endsWith('/ssr') ? await render(page, renderToString) : null
      return `<!DOCTYPE html><html><head>${ssr?.head.join('') ?? ''}</head><body>${ssr?.body ?? `<script data-page="app" type="application/json">${serializePage(page)}</script><div id="app"></div>`}<script type="module" src="/assets/${runtime}"></script></body></html>`
    },
  }))
  const homeProps = () => ({ message: () => `Hello ${++messages}`, stats: defer(() => ({ visits: 42 })), submitted: '' })
  app.get(base, (c) => c.render('Home', homeProps()))
  app.get(`${base}/ssr`, (c) => c.render('Home', homeProps()))
  app.get(`${base}/target`, (c) => c.render('Target'))
  app.get(`${base}/feed`, (c) => {
    const currentPage = Number(c.req.query('users_page') ?? 2)
    return c.render('Feed', { users: scroll({ data: [{ id: currentPage }], currentPage, lastPage: 3, pageName: 'users_page', matchOn: 'id' }) })
  })
  app.post(`${base}/submit`, async (c) => {
    const data = c.req.header('Content-Type')?.includes('application/json') ? await c.req.json() : await c.req.parseBody()
    return c.render('Home', { ...homeProps(), submitted: data.name })
  })
}
const server = createServer(async (req, res) => {
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const response = await app.fetch(new Request(`http://127.0.0.1:4179${req.url}`, {
      method: req.method, headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}),
    }))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) { console.error(error); res.writeHead(500); res.end(String(error)) }
})
server.listen(4179, '127.0.0.1', () => console.log('Browser fixture listening on 4179'))
process.on('SIGTERM', () => server.close())
