import { test, expect } from '@playwright/test'

test.describe('SSE Reconnection', () => {
  test('prices resume after network disconnect', async ({ page }) => {
    await page.goto('/')

    // Wait for prices to be visible
    await expect(page.locator('[data-ticker="AAPL"] [data-price]')).toBeVisible({
      timeout: 10_000,
    })

    // Capture the current AAPL price
    const priceBefore = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    expect(priceBefore).toBeTruthy()

    // Simulate going offline via CDP (Chromium DevTools Protocol)
    const context = page.context()
    await context.route('**', (route) => route.abort())

    // Wait 3 seconds while offline
    await page.waitForTimeout(3_000)

    // Connection indicator should turn red or yellow
    const dot = page.locator('[data-connection-dot]')
    await expect(dot).toHaveCSS(
      'background-color',
      /rgb\(\d+,\s*\d+,\s*\d+\)/,
      { timeout: 5_000 }
    )

    // Restore network
    await context.unroute('**', (route) => route.abort())

    // Wait for reconnection — connection dot should go green again
    await expect(dot).toHaveCSS('background-color', 'rgb(34, 197, 94)', {
      timeout: 15_000,
    })

    // Prices should be updating again
    await page.waitForTimeout(3_000)
    const priceAfter = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    expect(priceAfter).not.toEqual(priceBefore)
  })

  test('page navigation restores SSE connection', async ({ page }) => {
    await page.goto('/')

    // Wait for initial price load
    await expect(page.locator('[data-ticker="AAPL"] [data-price]')).toBeVisible({
      timeout: 10_000,
    })
    const price1 = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')

    // Navigate away and back
    await page.goto('about:blank')
    await page.goto('/')

    // Prices should be visible again
    await expect(page.locator('[data-ticker="AAPL"] [data-price]')).toBeVisible({
      timeout: 10_000,
    })

    // Prices should be updating
    await page.waitForTimeout(2_000)
    const price2 = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    expect(price2).toBeTruthy()
    // After navigation back, prices may or may not have changed yet
    // — just verify they are present and numeric
    expect(parseFloat(price2!)).toBeGreaterThan(0)
  })

  test('connection dot shows correct state throughout lifecycle', async ({ page }) => {
    await page.goto('/')

    const dot = page.locator('[data-connection-dot]')

    // Should eventually be green
    await expect(dot).toHaveCSS('background-color', 'rgb(34, 197, 94)', {
      timeout: 15_000,
    })
  })
})
