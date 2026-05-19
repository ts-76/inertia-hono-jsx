// SSR 互換のための compatibility layer。
// Form / WhenVisible / InfiniteScroll は元々 `hono/jsx/dom` から createElement を import していたが、
// `hono/jsx/dom/server.renderToString` は JSXNode を期待するため、SSR 時に `str.search is not a function` で落ちる。
// そこで実体は `hono/jsx` の createElement を使いつつ、子要素 (Child[]) を受ける広い型に補正する。
//
// 上流 hono の issue #4943 で `hono/jsx` の createElement の children シグネチャが Child[] に広がれば、
// この helper は不要になり、各ファイルの import を `'./ssrCreateElement'` → `'hono/jsx'` に置換するだけで済む。
import {
  createElement as honoCreateElement,
  forwardRef,
  Fragment,
  type Child,
  type JSX,
  type JSXNode,
  type RefObject,
} from 'hono/jsx'

type ElementTag = string | Function
type ElementProps = Record<string, any>

const isServerHostElement = (tag: ElementTag): tag is string => typeof tag === 'string' && typeof document === 'undefined'

const removeServerOnlyRef = (tag: ElementTag, props: ElementProps | null): ElementProps | null => {
  if (!props || !isServerHostElement(tag) || !('ref' in props)) {
    return props
  }

  const { ref: _ref, ...rest } = props

  return rest
}

const createElementWithChildSupport = honoCreateElement as unknown as (
  tag: ElementTag,
  props: ElementProps | null,
  ...children: Child[]
) => JSXNode

const createElement = (
  tag: ElementTag,
  props: ElementProps | null,
  ...children: Child[]
) => createElementWithChildSupport(tag, removeServerOnlyRef(tag, props), ...children)

export { createElement, forwardRef, Fragment }
export type { Child, JSX, JSXNode, RefObject }
