import {
  buildSSRBody,
  CreateInertiaAppOptions,
  CreateInertiaAppOptionsForCSR,
  CreateInertiaAppOptionsForSSR,
  createHeadManager,
  getInitialPageFromDOM,
  http as httpModule,
  InertiaAppSSRResponse,
  Page,
  PageProps,
  router,
  setupProgress,
  SharedPageProps,
} from '@inertiajs/core'
import { createElement } from 'hono/jsx'
import type { Child, JSXNode } from 'hono/jsx/dom'
import { createRoot, hydrateRoot } from 'hono/jsx/dom/client'
import { renderToString as honoRenderToString } from 'hono/jsx/dom/server'
import App from './App'
import HeadContext from './HeadContext'
import { config } from './index'
import PageContext from './PageContext'
import renderWithLayouts from './renderWithLayouts'
import type { ComponentResolver, HonoInertiaAppConfig, InertiaAppProps, ResolvedComponent } from './types'

export type SetupOptions<ElementType, SharedProps extends PageProps> = {
  el: ElementType
  App: typeof App
  props: InertiaAppProps<SharedProps>
}

type InertiaAppOptionsForCSR<SharedProps extends PageProps> = Omit<
  CreateInertiaAppOptionsForCSR<
    SharedProps,
    ComponentResolver,
    SetupOptions<HTMLElement, SharedProps>,
    void,
    HonoInertiaAppConfig
  >,
  'setup'
> &
  Pick<InertiaAppProps<SharedProps>, 'onHeadUpdate' | 'defaultLayout'> & {
    layout?: InertiaAppProps<SharedProps>['defaultLayout']
    setup?: (options: SetupOptions<HTMLElement, SharedProps>) => void
  }

type RenderToString = typeof honoRenderToString

type InertiaAppOptionsForSSR<SharedProps extends PageProps> = Omit<
  CreateInertiaAppOptionsForSSR<
    SharedProps,
    ComponentResolver,
    SetupOptions<null, SharedProps>,
    Child,
    HonoInertiaAppConfig
  >,
  'setup'
> &
  Pick<InertiaAppProps<SharedProps>, 'onHeadUpdate' | 'defaultLayout'> & {
    layout?: InertiaAppProps<SharedProps>['defaultLayout']
    render: RenderToString
    setup?: (options: SetupOptions<null, SharedProps>) => Child | void
  }

type InertiaAppOptionsAuto<SharedProps extends PageProps> = Omit<
  CreateInertiaAppOptions<
    ComponentResolver,
    SetupOptions<HTMLElement | null, SharedProps>,
    Child | void,
    HonoInertiaAppConfig
  >,
  'setup'
> & {
  page?: Page<SharedProps>
  render?: undefined
  setup?: (options: SetupOptions<HTMLElement | null, SharedProps>) => Child | void
} & Pick<InertiaAppProps<SharedProps>, 'onHeadUpdate' | 'defaultLayout'> & {
    layout?: InertiaAppProps<SharedProps>['defaultLayout']
  }

type RenderFunction<SharedProps extends PageProps> = (
  page: Page<SharedProps>,
  renderToString?: RenderToString,
) => Promise<InertiaAppSSRResponse>

export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options: InertiaAppOptionsForCSR<SharedProps>,
): Promise<void>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options: InertiaAppOptionsForSSR<SharedProps>,
): Promise<InertiaAppSSRResponse>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options?: InertiaAppOptionsAuto<SharedProps>,
): Promise<void | RenderFunction<SharedProps>>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>({
  id = 'app',
  resolve,
  setup,
  progress = {},
  page,
  defaults = {},
  http,
  title,
  onHeadUpdate,
  defaultLayout,
  layout,
  render,
}:
  | InertiaAppOptionsForCSR<SharedProps>
  | InertiaAppOptionsForSSR<SharedProps>
  | InertiaAppOptionsAuto<SharedProps> = {} as InertiaAppOptionsAuto<SharedProps>): Promise<
  InertiaAppSSRResponse | RenderFunction<SharedProps> | void
> {
  config.replace(defaults)

  if (http) {
    httpModule.setClient(http)
  }

  const isServer = typeof window === 'undefined'
  const effectiveLayout = layout ?? defaultLayout

  const resolveComponent = (name: string, page?: Page) =>
    Promise.resolve(resolve!(name, page)).then((module) => {
      return ((module as { default?: ResolvedComponent }).default || module) as ResolvedComponent
    })

  const buildApp = async (
    page: Page<SharedProps>,
    renderToString: RenderToString = honoRenderToString,
  ): Promise<InertiaAppSSRResponse> => {
    let head: string[] = []
    const initialComponent = await resolveComponent(page.component, page)
    const headManager = createHeadManager(true, title || ((title) => title), (elements) => {
      head = elements
      onHeadUpdate?.(elements)
    })

    const props: InertiaAppProps<SharedProps> = {
      initialPage: page,
      initialComponent,
      resolveComponent,
      titleCallback: title,
      onHeadUpdate: (elements: string[]) => headManager.createProvider().update(elements),
      defaultLayout: effectiveLayout,
    }

    const renderComponent = () => {
      return renderWithLayouts({
        Component: initialComponent,
        page,
        props: page.props,
        defaultLayout: effectiveLayout,
      })
    }

    const app =
      (setup as ((options: SetupOptions<null, SharedProps>) => Child | void) | undefined)?.({
        el: null,
        App,
        props,
      }) ??
      createElement(
        HeadContext.Provider as unknown as (props: Record<string, unknown>) => JSXNode,
        { value: headManager },
        createElement(
          PageContext.Provider as unknown as (props: Record<string, unknown>) => JSXNode,
          { value: { ...page, flash: page.flash ?? {} } },
          renderComponent() as never,
        ) as never,
      )

    const html = renderToString(app)

    return {
      head,
      body: buildSSRBody(id, page, html),
    }
  }

  if (isServer && !page && !render) {
    return (page: Page<SharedProps>, renderToString: RenderToString = honoRenderToString) =>
      buildApp(page, renderToString)
  }

  const initialPage = page || getInitialPageFromDOM<Page<SharedProps>>(id)!

  const [initialComponent] = await Promise.all([
    resolveComponent(initialPage.component, initialPage),
    router.decryptHistory().catch(() => {}),
  ])

  const props: InertiaAppProps<SharedProps> = {
    initialPage,
    initialComponent,
    resolveComponent,
    titleCallback: title,
    onHeadUpdate: isServer ? onHeadUpdate || (() => {}) : onHeadUpdate,
    defaultLayout: effectiveLayout,
  }

  if (isServer) {
    return buildApp(initialPage, render || honoRenderToString)
  }

  const el = document.getElementById(id)!

  if (setup) {
    ;(setup as (options: SetupOptions<HTMLElement, SharedProps>) => void)({
      el,
      App,
      props,
    })
  } else if (el.hasAttribute('data-server-rendered')) {
    hydrateRoot(el, <App {...props} />)
  } else {
    createRoot(el).render(<App {...props} />)
  }

  if (progress) {
    setupProgress(progress)
  }
}
