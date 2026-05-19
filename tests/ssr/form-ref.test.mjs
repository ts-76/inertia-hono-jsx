import assert from 'node:assert/strict'
import test from 'node:test'

import { createElement } from 'hono/jsx'
import { renderToString } from 'hono/jsx/dom/server'

import { Form } from '../../dist/index.js'

test('Form SSR output does not render the internal ref as an HTML attribute', () => {
  const html = renderToString(createElement(Form, { action: '/submit', method: 'get' }, 'Send'))

  assert.match(html, /<form\b/, 'SSR output should include a form element')
  assert.doesNotMatch(html, /\sref=/, `SSR output should not include a ref attribute: ${html}`)
})
