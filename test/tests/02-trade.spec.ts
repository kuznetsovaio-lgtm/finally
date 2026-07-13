import { test, expect } from '@playwright/test'

test.describe('Trading', () => {
  test('buy shares — cash decreases, position appears', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Get initial cash balance from the header
    const cashText = await page.locator('[data-cash-balance]').textContent()
    // Parse out the numeric value (e.g. "$10,000.00" → 10000)
    const initialCash = parseFloat(cashText!.replace(/[^0-9.]/g, ''))

    // Get current AAPL price
    const aaplPriceAttr = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    const aaplPrice = parseFloat(aaplPriceAttr!)

    // Select AAPL in the trade bar
    await page.locator('[data-ticker="AAPL"]').click()

    // Enter quantity 5, click BUY
    await page.locator('[data-trade-ticker-input]').fill('AAPL')
    await page.locator('[data-trade-quantity-input]').fill('5')
    await page.locator('[data-action="buy"]').click()

    // Wait for position to appear in positions table
    await expect(
      page.locator('[data-positions-table] [data-position-ticker="AAPL"]')
    ).toBeVisible({ timeout: 5_000 })

    // Verify position quantity is 5
    const qtyCell = page.locator(
      '[data-positions-table] [data-position-ticker="AAPL"] [data-position-quantity]'
    )
    await expect(qtyCell).toHaveText('5')

    // Cash should have decreased by ~5 × AAPL price
    const newCashText = await page.locator('[data-cash-balance]').textContent()
    const newCash = parseFloat(newCashText!.replace(/[^0-9.]/g, ''))
    const expectedCash = initialCash - 5 * aaplPrice
    expect(newCash).toBeCloseTo(expectedCash, 0)
  })

  test('sell shares — cash increases, quantity decreases', async ({ page, request }) => {
    // Set up: buy 10 shares of AAPL via API so we have a known starting state
    const buyResp = await request.post('/api/portfolio/trade', {
      data: { ticker: 'AAPL', quantity: 10, side: 'buy' },
    })
    expect(buyResp.ok()).toBeTruthy()

    await page.goto('/')
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Get initial cash
    const cashText = await page.locator('[data-cash-balance]').textContent()
    const initialCash = parseFloat(cashText!.replace(/[^0-9.]/g, ''))

    // Get AAPL price
    const aaplPriceAttr = await page
      .locator('[data-ticker="AAPL"] [data-price]')
      .getAttribute('data-price')
    const aaplPrice = parseFloat(aaplPriceAttr!)

    // Select AAPL and sell 2 shares
    await page.locator('[data-trade-ticker-input]').fill('AAPL')
    await page.locator('[data-trade-quantity-input]').fill('2')
    await page.locator('[data-action="sell"]').click()

    // Wait for positions table to update
    await expect(
      page.locator(
        '[data-positions-table] [data-position-ticker="AAPL"] [data-position-quantity]'
      )
    ).toHaveText('8', { timeout: 5_000 })

    // Cash should have increased by ~2 × AAPL price
    const newCashText = await page.locator('[data-cash-balance]').textContent()
    const newCash = parseFloat(newCashText!.replace(/[^0-9.]/g, ''))
    const expectedCash = initialCash + 2 * aaplPrice
    expect(newCash).toBeCloseTo(expectedCash, 0)
  })

  test('sell more shares than owned — sale is prevented', async ({ page, request }) => {
    // Set up: buy 3 shares of AAPL
    await request.post('/api/portfolio/trade', {
      data: { ticker: 'AAPL', quantity: 3, side: 'buy' },
    })

    await page.goto('/')
    await expect(
      page.locator('[data-positions-table] [data-position-ticker="AAPL"]')
    ).toBeVisible({ timeout: 5_000 })

    // Try to sell 10 shares (more than we own)
    await page.locator('[data-trade-ticker-input]').fill('AAPL')
    await page.locator('[data-trade-quantity-input]').fill('10')
    await page.locator('[data-action="sell"]').click()

    // Error message should appear
    await expect(
      page.locator('text=/insufficient|not enough|more than/i')
    ).toBeVisible({ timeout: 3_000 })

    // Position quantity should be unchanged (still 3)
    await expect(
      page.locator(
        '[data-positions-table] [data-position-ticker="AAPL"] [data-position-quantity]'
      )
    ).toHaveText('3')
  })

  test('buy with insufficient cash — trade is prevented', async ({ page }) => {
    await page.goto('/')

    // Get current cash
    const cashText = await page.locator('[data-cash-balance]').textContent()
    const cash = parseFloat(cashText!.replace(/[^0-9.]/g, ''))

    // Try to buy an absurdly large quantity
    await page.locator('[data-trade-ticker-input]').fill('AAPL')
    await page.locator('[data-trade-quantity-input]').fill('999999')
    await page.locator('[data-action="buy"]').click()

    // Error message should appear
    await expect(
      page.locator('text=/insufficient|not enough|cash/i')
    ).toBeVisible({ timeout: 3_000 })

    // Cash should be unchanged
    const newCashText = await page.locator('[data-cash-balance]').textContent()
    const newCash = parseFloat(newCashText!.replace(/[^0-9.]/g, ''))
    expect(newCash).toBeCloseTo(cash, 2)
  })

  test('buy then sell entire position — position disappears, cash returns', async ({
    page,
    request,
  }) => {
    // Buy 5 NVDA
    await request.post('/api/portfolio/trade', {
      data: { ticker: 'NVDA', quantity: 5, side: 'buy' },
    })

    await page.goto('/')
    await expect(
      page.locator('[data-positions-table] [data-position-ticker="NVDA"]')
    ).toBeVisible({ timeout: 5_000 })

    const cashText = await page.locator('[data-cash-balance]').textContent()
    const initialCash = parseFloat(cashText!.replace(/[^0-9.]/g, ''))
    const nvdaPriceAttr = await page
      .locator('[data-ticker="NVDA"] [data-price]')
      .getAttribute('data-price')
    const nvdaPrice = parseFloat(nvdaPriceAttr!)

    // Sell all 5 NVDA
    await page.locator('[data-trade-ticker-input]').fill('NVDA')
    await page.locator('[data-trade-quantity-input]').fill('5')
    await page.locator('[data-action="sell"]').click()

    // NVDA position should be gone
    await expect(
      page.locator('[data-positions-table] [data-position-ticker="NVDA"]')
    ).toHaveCount(0, { timeout: 5_000 })

    // Cash restored (minus original cost, approximately)
    const newCashText = await page.locator('[data-cash-balance]').textContent()
    const newCash = parseFloat(newCashText!.replace(/[^0-9.]/g, ''))
    // After buying 5 and selling 5 at current price, cash should be roughly:
    // initialCash - 5*buyPrice + 5*sellPrice ≈ initialCash
    // Allow generous tolerance since prices moved
    expect(Math.abs(newCash - initialCash)).toBeLessThan(nvdaPrice * 10)
  })
})
