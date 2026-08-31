import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'
import { Form } from '../dist/index.js'

test('Form does not render its internal ref during SSR', () => {
  const html = renderToString(createElement(Form, { action: '/submit' }, 'Send'))

  assert.match(html, /^<form\b/)
  assert.match(html, /\saction="\/submit"(?:\s|>)/)
  assert.match(html, /\smethod="get"(?:\s|>)/)
  assert.match(html, />Send<\/form>$/)
  assert.doesNotMatch(html, /\sref=/)
})

test('Form does not render its internal ref when window exists', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true, writable: true })

  try {
    const html = renderToString(createElement(Form, { action: '/submit' }, 'Send'))

    assert.doesNotMatch(html, /\sref=/)
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow)
    } else {
      delete globalThis.window
    }
  }
})
