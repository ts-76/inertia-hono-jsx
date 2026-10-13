import { Deferred, Form, Head, InfiniteScroll, Link, router, useForm, usePage } from '@ts-76/inertia-hono-jsx'
import { useState } from 'hono/jsx'

export function Home() {
  const { props } = usePage()
  const [count, setCount] = useState(0)
  const form = useForm({ name: '' })
  return <main>
    <Head title="Home"><meta name="description" content="Home page" head-key="description" /></Head>
    <h1>{props.message as string}</h1>
    <p data-testid="shared">{(props.user as { name: string }).name}</p>
    <button onClick={() => setCount(count + 1)}>Count {count}</button>
    <button onClick={() => router.reload({ only: ['message'] })}>Reload message</button>
    <Deferred data="stats" fallback={<p>Loading stats</p>}>
      <p data-testid="stats">{(props.stats as { visits: number } | undefined)?.visits}</p>
    </Deferred>
    <Link href={`${props.base}/target`}>Target</Link>
    <Link href={`${props.base}/feed`}>Feed</Link>
    <Form action={`${props.base}/submit`} method="post">
      <input name="name" aria-label="Name" />
      <button type="submit">Send</button>
    </Form>
    <p data-testid="submitted">{props.submitted as string}</p>
    <input aria-label="useForm name" value={form.data.name} onInput={(e) => form.setData('name', (e.currentTarget as HTMLInputElement).value)} />
    <button onClick={() => form.post(`${props.base}/submit`)}>Send useForm</button>
  </main>
}

export function Target() {
  const { props } = usePage()
  return <main><Head title="Target"><meta name="description" content="Target page" head-key="description" /></Head>
    <h1>Target</h1><p data-testid="shared">{(props.user as { name: string }).name}</p>
    <Link href={props.base as string}>Home</Link>
  </main>
}

export function Feed() {
  const { props } = usePage()
  return <main><Head title="Feed" /><h1>Feed</h1>
    <InfiniteScroll data="users" manual preserveUrl
      previous={({ fetch, hasMore }) => <button disabled={!hasMore} onClick={fetch}>Previous</button>}
      next={({ fetch, hasMore }) => <button disabled={!hasMore} onClick={fetch}>Next</button>}
    >
      <ul>{(props.users as { id: number }[]).map((user) => <li key={user.id}>User {user.id}</li>)}</ul>
    </InfiniteScroll>
  </main>
}
