import assert from 'node:assert/strict'
import test from 'node:test'
import { Hono } from 'hono'
import { deepMerge, defer, inertia, merge, prepend, scroll } from '@hono/inertia'
import { createInertiaApp } from '../dist/index.js'
import { createElement } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

function fixture() {
  const calls = { lazy: 0, deferred: 0 }
  const app = new Hono().use(inertia({ version: '1', share: () => ({ user: { name: 'Hono' }, errors: {} }) }))
    .get('/', (c) => c.render('Home', {
      message: 'Hello', lazy: () => { calls.lazy++; return 42 },
      deferred: defer(() => { calls.deferred++; return 'Ready' }),
    }))
    .get('/feed', (c) => c.render('Feed', {
      users: scroll({ data: [{ id: 2 }], currentPage: 2, lastPage: 3, pageName: 'users_page', matchOn: 'id' }),
      append: merge([1]), prepend: prepend([2]), deep: deepMerge({ data: [{ id: 3 }] }, { matchOn: 'data.id' }),
    }))
    .put('/submit', (c) => c.redirect('/'))
    .post('/submit', (c) => c.render('Home', { message: 'Submitted' }))
  return { app, calls }
}
const headers = { 'X-Inertia': 'true', 'X-Inertia-Version': '1' }

test('middleware initial HTML and JSON use the same boot payload consumed by the adapter', async () => {
  const { app } = fixture()
  const html = await (await app.request('/')).text()
  const embedded = JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1])
  const response = await app.request('/', { headers })
  assert.equal(response.headers.get('X-Inertia'), 'true')
  assert.match(response.headers.get('Vary'), /X-Inertia/)
  assert.deepEqual(await response.json(), embedded)
  const ssr = await createInertiaApp({
    page: embedded, render: renderToString,
    resolve: () => ({ message, user }) => createElement('h1', {}, `${message} ${user.name}`),
  })
  assert.match(ssr.body, /<h1>Hello Hono<\/h1>/)
  assert.deepEqual(embedded.sharedProps, ['user', 'errors'])
  assert.deepEqual(embedded.deferredProps, { default: ['deferred'] })
})

test('partial and deferred responses skip unrequested resolvers', async () => {
  const { app, calls } = fixture()
  const response = await app.request('/', { headers: {
    ...headers, 'X-Inertia-Partial-Component': 'Home', 'X-Inertia-Partial-Data': 'deferred',
  } })
  assert.deepEqual((await response.json()).props, { deferred: 'Ready' })
  assert.deepEqual(calls, { lazy: 0, deferred: 1 })
  const except = await app.request('/', { headers: {
    ...headers, 'X-Inertia-Partial-Component': 'Home', 'X-Inertia-Partial-Except': 'lazy,deferred',
  } })
  assert.equal((await except.json()).props.message, 'Hello')
  assert.equal(calls.lazy, 0)
})

test('scroll and merge metadata match the client core protocol in both directions', async () => {
  const { app } = fixture()
  const page = await (await app.request('/feed', { headers })).json()
  assert.deepEqual(page.props.users, [{ id: 2 }])
  assert.deepEqual(page.scrollProps.users, { previousPage: 1, nextPage: 3, currentPage: 2, pageName: 'users_page' })
  assert.deepEqual(page.mergeProps, ['users', 'append'])
  assert.deepEqual(page.prependProps, ['prepend'])
  assert.deepEqual(page.deepMergeProps, ['deep'])
  assert.deepEqual(page.matchPropsOn, ['users.id', 'deep.data.id'])
  const previous = await (await app.request('/feed', { headers: {
    ...headers, 'X-Inertia-Partial-Component': 'Feed', 'X-Inertia-Partial-Data': 'users',
    'X-Inertia-Infinite-Scroll-Merge-Intent': 'prepend',
  } })).json()
  assert.deepEqual(previous.prependProps, ['users'])
  assert.equal(previous.mergeProps, undefined)
})

test('asset version conflicts and mutation redirects are left to middleware', async () => {
  const { app } = fixture()
  const stale = await app.request('/', { headers: { ...headers, 'X-Inertia-Version': 'old' } })
  assert.equal(stale.status, 409)
  assert.equal(stale.headers.get('X-Inertia-Location'), 'http://localhost/')
  const redirect = await app.request('/submit', { method: 'PUT', headers })
  assert.equal(redirect.status, 303)
  assert.equal(redirect.headers.get('Location'), '/')
  const submitted = await (await app.request('/submit', { method: 'POST', headers: { ...headers, Referer: 'http://localhost/?from=form' } })).json()
  assert.equal(submitted.url, '/?from=form')
})
