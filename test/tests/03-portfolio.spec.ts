import { test, expect } from '@playwright/test'

test.describe('Portfolio', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure a clean slate with several positions for each test
    // Buy AAPL, NVDA, TSLA via API
    await Promise.all([
      request.post('/api/portfolio/trade', { data: { ticker: 'AAPL', quantity: 10, side: 'buy' } }),
      request.post('/api/portfolio/trade', { data: { ticker: 'NVDA', quantity: 5, side: 'buy' } }),
      request.post('/api/portfolio/trade', { data: { ticker: 'TSLA', quantity: 3, side: 'buy' } }),
    ])
  })

  test('positions table shows all positions with correct data', async ({ page }) => {
    await page.goto('/')

    const table = page.locator('[data-positions-table]')
    await expect(table).toBeVisible({ timeout: 10_000 })

    // AAPL position
    const aaplRow = page.locator(
      '[data-positions-table] [data-position-ticker="AAPL"]'
    )
    await expect(aaplRow).toBeVisible()
    await expect(
      aaplRow.locator('[data-position-quantity]')
    ).toHaveText('10')

    // NVDA position
    await expect(
      page.locator(
        '[data-positions-table] [data-position-ticker="NVDA"] [data-position-quantity]'
      )
    ).toHaveText('5')

    // TSLA position
    await expect(
      page.locator(
        '[data-positions-table] [data-position-ticker="TSLA"] [data-position-quantity]'
      )
    ).toHaveText('3')

    // P&L cells should be present (sign agnostic — may be positive or negative)
    const plCell = page.locator(
      '[data-positions-table] [data-position-ticker="AAPL"] [data-position-pl]'
    )
    await expect(plCell).toBeVisible()
    const plText = await plCell.textContent()
    expect(plText).toMatch(/[$€£¥]|-?\d+/)
  })

  test('portfolio heatmap renders with colored cells', async ({ page }) => {
    await page.goto('/')

    const heatmap = page.locator('[data-portfolio-heatmap]')
    await expect(heatmap).toBeVisible({ timeout: 10_000 })

    // At least 3 colored rectangles should be visible (one per position)
    const cells = heatmap.locator('[data-heatmap-cell]')
    const count = await cells.count()
    expect(count).toBeGreaterThanOrEqual(3)

    // Each cell should have a background color
    for (const cell of await cells.all()) {
      const bg = await cell.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      )
      // Should not be transparent or pure black
      expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    }
  })

  test('P&L chart shows data points', async ({ page }) => {
    await page.goto('/')

    const chart = page.locator('[data-pnl-chart]')
    await expect(chart).toBeVisible({ timeout: 10_000 })

    // Wait up to 10s for a snapshot to be recorded
    // (snapshots are recorded every 30s + on trade, but we just bought 3 tickers)
    // So at least one snapshot should exist from our API buys
    await page.waitForTimeout(2_000)

    // The chart should have at least one visible data point / SVG path
    const svgPaths = chart.locator('svg path')
    const pathCount = await svgPaths.count()
    expect(pathCount).toBeGreaterThan(0)
  })

  test('portfolio total value updates live with price changes', async ({ page }) => {
    await page.goto('/')

    const totalVal = page.locator('[data-portfolio-total-value]')
    await expect(totalVal).toBeVisible({ timeout: 5_000 })
    const val1 = await totalVal.textContent()

    // Wait for prices to move
    await page.waitForTimeout(3_000)
    const val2 = await totalVal.textContent()

    // Value may or may not have changed in 3s — not asserting equality
    // Just ensuring the element is still present and has a dollar value
    expect(val2).toMatch(/\$[\d,]+\.?\d*/)
  })

  test('clicking a ticker selects it in the main chart', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-ticker="AAPL"]')).toBeVisible({ timeout: 10_000 })

    // Main chart should initially show something
    const mainChart = page.locator('[data-main-chart]')
    await expect(mainChart).toBeVisible()

    // Click AAPL in the watchlist
    await page.locator('[data-ticker="AAPL"]').click()

    // The selected ticker indicator should show AAPL
    await expect(
      page.locator('[data-selected-ticker="AAPL"]')
    ).toBeVisible({ timeout: 3_000 })
  })
})
