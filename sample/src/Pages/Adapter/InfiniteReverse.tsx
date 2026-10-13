import { InfiniteScroll, Link, type PageComponent } from '@ts-76/inertia-hono-jsx'
import { AppLayout } from '../../components/AppLayout'
import { PageShell } from '../../components/PageShell'
import type { Child } from 'hono/jsx/dom'

const InfiniteReverse: PageComponent<'Adapter/InfiniteReverse'> = (props) => {
  return (
    <PageShell>
      <h1>InfiniteScroll checks</h1>
      <nav>
        <Link href="/">Home</Link>
      </nav>

      <section>
        <h2>Manual reverse mode</h2>
        <p>Starts from page {props.manualPage}. Click the button to prepend older pages.</p>
        <InfiniteScroll
          data="manualUsers"
          manual
          preserveUrl
          reverse
          previous={({ fetch, loading, hasMore }) =>
            loading ? (
              <span>Loading previous users...</span>
            ) : (
              <button type="button" disabled={!hasMore} onClick={() => fetch()}>
                {hasMore ? 'Fetch previous' : 'No previous users'}
              </button>
            )
          }
        >
          <ul>
            {props.manualUsers.map((user) => (
              <li key={user.id}>Manual {user.name}</li>
            ))}
          </ul>
        </InfiniteScroll>
      </section>

      <section>
        <h2>Automatic next-page mode</h2>
        <p>Scroll this panel. When the bottom trigger becomes visible, the next page is appended automatically.</p>
        <div
          data-testid="auto-panel"
          style={{
            border: '1px solid #d1d5db',
            height: '10rem',
            overflowY: 'auto',
            overflowAnchor: 'none',
            padding: '1rem',
            overscrollBehavior: 'contain',
          }}
        >
          <InfiniteScroll
            as="ul"
            data="autoUsers"
            buffer={80}
            preserveUrl
            onlyNext
            loading={<li>Loading more users...</li>}
            next={({ loading, hasMore, autoMode }) =>
              loading ? (
                <span>Loading automatically...</span>
              ) : hasMore && autoMode ? (
                <span>Scroll for more</span>
              ) : (
                <span>No more users</span>
              )
            }
          >
            {props.autoUsers.map((user) => (
              <li key={user.id}>Auto {user.name}</li>
            ))}
          </InfiniteScroll>
        </div>
      </section>
    </PageShell>
  )
}

InfiniteReverse.layout = (page: Child) => <AppLayout section="Infinite checks">{page}</AppLayout>

export default InfiniteReverse
