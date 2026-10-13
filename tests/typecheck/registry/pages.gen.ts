// Same augmentation shape as @hono/inertia/vite's generated registry.
import type { app } from '../page-props.test'
declare module '@hono/inertia' {
  interface InertiaPages { Home: unknown; Empty: unknown }
  interface AppRegistry { app: typeof app }
}
