import { createInertiaApp } from '@ts-76/inertia-hono-jsx'
import * as pages from './pages'

createInertiaApp({ resolve: (name) => pages[name as keyof typeof pages], progress: false })
