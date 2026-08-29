import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'
import { Form } from '../dist/index.js'

test('Form does not render its internal ref during SSR', () => {
  const html = renderToString(createElement(Form, { action: '/submit' }, 'Send'))

  assert.equal(html, '<form action="/submit" method="get">Send</form>')
  assert.doesNotMatch(html, /\sref=/)
})

test('Form does not render its internal ref when window exists', () => {
  globalThis.window = {}

  try {
    const html = renderToString(createElement(Form, { action: '/submit' }, 'Send'))

    assert.doesNotMatch(html, /\sref=/)
  } finally {
    delete globalThis.window
  }
})
