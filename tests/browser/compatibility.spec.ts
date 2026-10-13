import { expect, test } from '@playwright/test'

for (const runtime of ['hono', 'dom']) {
  test(`${runtime}: boot, hooks, shared props, partial/deferred props, links and forms`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/${runtime}`)
    await expect(page.getByRole('heading')).toContainText('Hello')
    await expect(page.getByTestId('shared')).toHaveText('Hono user')
    await expect(page.getByTestId('stats')).toHaveText('42')
    await page.getByRole('button', { name: 'Count 0', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Count 1', exact: true })).toBeVisible()
    const oldMessage = await page.getByRole('heading').textContent()
    const partial = page.waitForRequest((request) => request.headers()['x-inertia-partial-data'] === 'message')
    await page.getByRole('button', { name: 'Reload message' }).click()
    expect((await partial).headers()['x-inertia-partial-component']).toBe('Home')
    await expect(page.getByRole('heading')).not.toHaveText(oldMessage!)
    await expect(page.getByTestId('shared')).toHaveText('Hono user')
    await page.getByRole('link', { name: 'Target', exact: true }).click()
    await expect(page.getByRole('heading')).toHaveText('Target')
    await expect(page).toHaveTitle('Target')
    await expect(page.locator('meta[name="description"]')).toHaveCount(1)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Target page')
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Form value')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(page.getByTestId('submitted')).toHaveText('Form value')
    await page.getByRole('textbox', { name: 'useForm name', exact: true }).fill('Hook value')
    await page.getByRole('button', { name: 'Send useForm', exact: true }).click()
    await expect(page.getByTestId('submitted')).toHaveText('Hook value')
    expect(errors).toEqual([])
  })

  test(`${runtime}: SSR payload boots interactive components`, async ({ page, request }) => {
    const html = await (await request.get(`/${runtime}/ssr`)).text()
    expect(html).toContain('data-server-rendered')
    expect(html).toContain('<h1>Hello')
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/${runtime}/ssr`)
    await page.getByRole('button', { name: 'Count 0', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Count 1', exact: true })).toBeVisible()
    await expect(page.getByTestId('stats')).toHaveText('42')
    await expect(page.locator('h1')).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test(`${runtime}: middleware scroll props append and prepend through InfiniteScroll`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`/${runtime}/feed`)
    await expect(page.getByRole('listitem')).toHaveText(['User 2'])
    await page.getByRole('button', { name: 'Previous', exact: true }).click()
    await expect(page.getByRole('listitem')).toHaveText(['User 1', 'User 2'])
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByRole('listitem')).toHaveText(['User 1', 'User 2', 'User 3'])
    expect(errors).toEqual([])
  })
}
