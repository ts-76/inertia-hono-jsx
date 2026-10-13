import { Hono } from 'hono'
import { defer, inertia, scroll } from '@hono/inertia'
import type { PageComponent, PageName, PagePropsFor } from '../../src/index'
import { usePage } from '../../src/index'

export const app = new Hono()
  .use(inertia({ share: () => ({ user: { name: 'Hono' }, overridden: 1, lazyShared: async () => true }) }))
  .get('/', (c) => c.render('Home', {
    message: () => 'hello', stats: defer(async () => ({ visits: 42 })), overridden: 'page',
    users: scroll({ data: [{ id: 1 }], currentPage: 1, lastPage: 2, pageName: 'page' }),
  }))
  .get('/empty', (c) => c.render('Empty'))

declare module '@hono/inertia' {
  interface AppRegistry { app: typeof app }
}

const home: PagePropsFor<'Home'> = {
  user: { name: 'Hono' }, lazyShared: true, overridden: 'page', message: 'hello', stats: { visits: 42 }, users: [{ id: 1 }],
}
const empty: PagePropsFor<'Empty'> = { user: { name: 'Hono' }, overridden: 1, lazyShared: true }
const Home: PageComponent<'Home'> = (props) => {
  const page = usePage<'Home'>()
  const name: string = props.user.name
  const shared: boolean = page.props.lazyShared
  // @ts-expect-error lazy page props resolve to their value, not a function.
  props.message()
  // @ts-expect-error page props override the shared value type.
  const override: number = props.overridden
  void name; void shared; void override
  return null
}
// @ts-expect-error unknown page names are rejected with AppRegistry alone.
const invalid: PageName = 'Missing'
void home; void empty; void Home; void invalid
