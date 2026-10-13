import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement as h } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'
import { createInertiaApp, Form, Head, router, usePage } from '../dist/index.js'

const makePage = (message) => ({
  component: 'Home', props: { message, errors: {} }, url: '/', version: '1',
})

function Home() {
  const { props } = usePage()
  return h('main', {},
    h(Head, { title: props.message }, h('meta', { name: 'description', content: props.message, 'head-key': 'description' })),
    h('h1', {}, props.message),
    h(Form, { action: '/submit' }, h('input', { name: 'message', value: props.message })),
  )
}

test('SSR renders page context, Head, Form and layouts, resolving the page only once', async () => {
  let resolves = 0
  const response = await createInertiaApp({
    page: makePage('Hello <Hono>'), render: renderToString,
    resolve: () => { resolves++; return Home },
    layout: () => ({ children }) => h('section', { id: 'layout' }, children),
  })
  assert.equal(resolves, 1)
  assert.match(response.body, /<section id="layout"><main><h1>Hello &lt;Hono&gt;<\/h1>/)
  assert.match(response.body, /<form action="\/submit"/)
  assert.doesNotMatch(response.body, /\sref=/)
  assert.match(response.body, /data-server-rendered/)
  assert.ok(response.head.includes('<title data-inertia="">Hello &lt;Hono&gt;</title>'))
  assert.ok(response.head.some((tag) => tag.includes('data-inertia="description"')))
})

test('custom SSR setup using App never initializes the browser router', async () => {
  const original = router.init
  router.init = () => { throw new Error('browser router initialized during SSR') }
  try {
    const response = await createInertiaApp({
      page: makePage('Custom'), render: renderToString, resolve: () => Home,
      setup: ({ el, App, props }) => { assert.equal(el, null); return h(App, props) },
    })
    assert.match(response.body, /<h1>Custom<\/h1>/)
    assert.ok(response.head.some((tag) => tag.includes('Custom')))
  } finally { router.init = original }
})

test('SSR render factory and overlapping requests keep page and head data separate', async () => {
  const render = await createInertiaApp({ resolve: async () => Home })
  const [first, second] = await Promise.all([render(makePage('First')), render(makePage('Second'))])
  assert.match(first.body, /<h1>First<\/h1>/)
  assert.doesNotMatch(first.body, /Second/)
  assert.match(second.body, /<h1>Second<\/h1>/)
  assert.doesNotMatch(second.body, /First/)
  assert.ok(first.head.every((tag) => !tag.includes('Second')))
  assert.ok(second.head.every((tag) => !tag.includes('First')))
})

test('SSR serializes script-like props safely and preserves their JSON value', async () => {
  const message = '</script><script>alert("x")</script>'
  const response = await createInertiaApp({ page: makePage(message), render: renderToString, resolve: () => Home })
  const payload = response.body.match(/<script[^>]*>(.*?)<\/script>/s)[1]
  assert.doesNotMatch(payload, /<\/script>/)
  assert.equal(JSON.parse(payload).props.message, message)
})

test('async components remain outside synchronous Hono SSR support', async () => {
  await assert.rejects(createInertiaApp({
    page: makePage('Async'), render: renderToString,
    resolve: () => async () => h('h1', {}, 'Async'),
  }), /Async component is not supported/)
})
