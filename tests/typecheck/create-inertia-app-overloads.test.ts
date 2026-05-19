import type { InertiaAppSSRResponse, Page, PageProps } from '@inertiajs/core'
import { renderToString } from 'hono/jsx/dom/server'
import { createInertiaApp } from '../../src/index'

const page = {
  component: 'Home',
  props: { errors: {} },
  url: '/',
  version: null,
  rescuedProps: [],
  flash: {},
  rememberedState: {},
} satisfies Page<PageProps>

const ssrResponse: Promise<InertiaAppSSRResponse> = createInertiaApp({
  page,
  render: renderToString,
  resolve: () => () => null,
})

const pageOnlyResponse: Promise<void> = createInertiaApp({
  page,
  resolve: () => () => null,
})

// @ts-expect-error render without page should not select the SSR overload.
createInertiaApp({
  render: renderToString,
  resolve: () => () => null,
})

// @ts-expect-error page without render is not the public SSR overload.
const pageOnlySsrResponse: Promise<InertiaAppSSRResponse> = createInertiaApp({
  page,
  resolve: () => () => null,
})

void ssrResponse
void pageOnlyResponse
void pageOnlySsrResponse
