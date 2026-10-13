import type { Page, PageProps, SharedPageProps } from '@inertiajs/core'
import type { AppRegistry, InertiaPages, PageProps as HonoPageProps } from '@hono/inertia'
import type { ExtractSchema } from 'hono/types'
import type { Child, JSXNode } from 'hono/jsx/dom'

type RegisteredApp = AppRegistry extends { app: infer App } ? App : never
type Distribute<T> = T extends infer Value ? Value : never
type AllOutputs<App> = Distribute<{
  [Path in keyof ExtractSchema<App> & string]: {
    [Method in keyof ExtractSchema<App>[Path] & string]: ExtractSchema<App>[Path][Method] extends {
      output: infer Output
    }
      ? Distribute<Output>
      : never
  }[keyof ExtractSchema<App>[Path] & string]
}[keyof ExtractSchema<App> & string]>
type RenderOutput<App> = AllOutputs<App> extends infer Output
  ? Output extends { component: string; props: unknown }
    ? Output
    : never
  : never
type RegisteredPageName = Extract<RenderOutput<RegisteredApp>['component'], string>
type RegistryPageName = Extract<keyof InertiaPages, string>
type RegisteredPageProps<Name extends string> = Extract<RenderOutput<RegisteredApp>, { component: Name }> extends {
  props: infer Props
}
  ? Props
  : never
type HonoRegisteredPageProps<Name extends string> = Name extends RegisteredPageName
  ? HonoPageProps<Name>
  : never
type RegistryPageProps<Name extends string> = Name extends keyof InertiaPages ? InertiaPages[Name] : never

export interface InertiaPageProps {}

export type PageName = RegistryPageName extends never
  ? keyof InertiaPageProps extends never
    ? RegisteredPageName extends never
      ? string
      : RegisteredPageName
    : Extract<keyof InertiaPageProps, string>
  : RegistryPageName | Extract<keyof InertiaPageProps, string>
export type PagePropsFor<Name extends PageName> = Name extends keyof InertiaPageProps
  ? InertiaPageProps[Name] extends PageProps
    ? InertiaPageProps[Name]
    : PageProps
  : HonoRegisteredPageProps<Name> extends never
    ? RegisteredPageProps<Name> extends never
      ? RegistryPageProps<Name> extends PageProps
        ? RegistryPageProps<Name>
        : PageProps
      : RegisteredPageProps<Name> extends PageProps
        ? RegisteredPageProps<Name>
        : PageProps
    : HonoRegisteredPageProps<Name> extends PageProps
      ? HonoRegisteredPageProps<Name>
      : PageProps

export type LayoutFunction = (page: Child) => Child
export type LayoutComponent<TProps = Record<string, unknown>> = ((props: TProps & { children?: Child }) => Child) & {
  name?: string
}

export type LayoutDefinition<TProps = Record<string, unknown>> =
  | LayoutFunction
  | LayoutComponent<TProps>
  | LayoutComponent<TProps>[]
  | Record<string, unknown>
  | null
  | undefined

export type HonoComponent<TProps = Record<string, unknown>> = ((props: TProps) => Child | JSXNode) & {
  layout?: LayoutDefinition<TProps> | ((props: TProps) => LayoutDefinition<TProps> | Child)
}

export type PageComponent<Name extends PageName> = HonoComponent<PagePropsFor<Name>>
export type PageComponentMap = {
  [Name in PageName]: PageComponent<Name>
}

export type ResolvedComponent<TProps = Record<string, unknown>> = HonoComponent<TProps> & {
  default?: HonoComponent<TProps>
}

export type ComponentResolver = (
  name: string,
  page?: Page<SharedPageProps>,
) => ResolvedComponent | Promise<ResolvedComponent> | { default: ResolvedComponent }

export type HonoInertiaAppConfig = Record<string, never>

export interface InertiaAppProps<SharedProps extends PageProps = PageProps> {
  children?: (options: { Component: ResolvedComponent; props: PageProps; key: number | null }) => Child
  initialPage: Page<SharedProps>
  initialComponent?: ResolvedComponent
  resolveComponent?: (name: string, page?: Page) => ResolvedComponent | Promise<ResolvedComponent>
  titleCallback?: (title: string) => string
  onHeadUpdate?: (elements: string[]) => void
  defaultLayout?: (name: string, page: Page) => LayoutDefinition
}

export type InertiaApp = (props: InertiaAppProps) => Child
