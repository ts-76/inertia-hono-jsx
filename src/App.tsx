import {
  createHeadManager,
  router,
  type Page,
  type PageProps,
} from '@inertiajs/core'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'hono/jsx'
import HeadContext from './HeadContext'
import { resetLayoutProps, store } from './layoutProps'
import PageContext from './PageContext'
import renderWithLayouts from './renderWithLayouts'
import type { InertiaAppProps, ResolvedComponent } from './types'

let routerIsInitialized = false

type CurrentPage = {
  component: ResolvedComponent | null
  page: Page
  key: number | null
}

const emptySnapshot = {
  shared: {} as Record<string, unknown>,
  named: {} as Record<string, Record<string, unknown>>,
}

export default function App<SharedProps extends PageProps = PageProps>({
  children,
  initialPage,
  initialComponent,
  resolveComponent,
  titleCallback,
  onHeadUpdate,
  defaultLayout,
}: InertiaAppProps<SharedProps>) {
  const [current, setCurrent] = useState<CurrentPage>({
    component: initialComponent || null,
    page: { ...initialPage, flash: initialPage.flash ?? {} },
    key: null,
  })

  const headManager = useMemo(() => {
    return createHeadManager(
      typeof window === 'undefined',
      titleCallback || ((title) => title),
      onHeadUpdate || (() => {}),
    )
  }, [])

  const dynamicLayoutProps = useSyncExternalStore(store.subscribe, store.get, () => emptySnapshot)

  if (typeof window !== 'undefined' && !routerIsInitialized) {
    router.init<ResolvedComponent>({
      initialPage,
      resolveComponent: resolveComponent!,
      swapComponent: async ({ component, page, preserveState }) => {
        if (!preserveState) {
          resetLayoutProps()
        }

        setCurrent((current) => ({
          component,
          page,
          key: preserveState ? current.key : Date.now(),
        }))
      },
      onFlash: (flash) => {
        setCurrent((current) => ({
          ...current,
          page: { ...current.page, flash },
        }))
      },
    })

    routerIsInitialized = true
  }

  useEffect(() => {
    return router.on('navigate', () => headManager.forceUpdate())
  }, [])

  const Component = current.component

  if (!Component) {
    return (
      <HeadContext.Provider value={headManager}>
        <PageContext.Provider value={current.page}>{null}</PageContext.Provider>
      </HeadContext.Provider>
    )
  }

  const renderChildren =
    children ||
    (({ Component, props, key }: { Component: ResolvedComponent; props: PageProps; key: number | null }) => {
      return renderWithLayouts({
        Component,
        page: current.page,
        props,
        key,
        defaultLayout,
        dynamicLayoutProps,
      })
    })

  return (
    <HeadContext.Provider value={headManager}>
      <PageContext.Provider value={current.page}>
        {renderChildren({
          Component,
          key: current.key,
          props: current.page.props,
        })}
      </PageContext.Provider>
    </HeadContext.Provider>
  )
}

App.displayName = 'Inertia'
