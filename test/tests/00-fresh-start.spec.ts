import { test, expect } from '@playwright/test'

test.describe('Fresh Start', () => {
  test('default watchlist, $10k balance, prices streaming', async ({ page }) => {
    await page.goto('/')

    // Wait for prices to appear
    const priceLocator = page.locator('[data-ticker]').first()
    await expect(priceLocator).toBeVisible({ timeout: 10_000 })

    // 10 default tickers visible
    const tickerCells = page.locator('[data-ticker]')
    await expect(tickerCells).toHaveCount(10)

    // Balance shows $10,000
    const cashLocator = page.locator('text=$10,000')
    await expect(cashLocator.first()).toBeVisible()

    // Connection indicator is green
    const dot = page.locator('[data-connection-dot]')
    await expect(dot).toHaveCSS('background-color', 'rgb(34, 197, 94)')

    // Prices are updating — wait 2s, capture price, wait 1s more, verify changed
    const price1 = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    await page.waitForTimeout(2000)
    const price2 = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    expect(price1).not.toEqual(price2)
  })

  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })
})
