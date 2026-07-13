import { test, expect } from '@playwright/test'

test.describe('Watchlist', () => {
  test('remove a ticker — it disappears from the watchlist', async ({ page }) => {
    await page.goto('/')

    // Wait for the watchlist to load with all 10 tickers
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Find the AAPL row and its remove button
    const aaplRow = page.locator('[data-ticker="AAPL"]')
    await expect(aaplRow).toBeVisible()

    // Click the remove button for AAPL
    await aaplRow.locator('[data-action="remove-ticker"]').click()

    // AAPL should be gone; 9 tickers remain
    await expect(page.locator('[data-ticker="AAPL"]')).toHaveCount(0)
    await expect(page.locator('[data-ticker]')).toHaveCount(9)
  })

  test('add a new ticker — it appears with a live price', async ({ page }) => {
    await page.goto('/')

    // Wait for initial load
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Add AMD via the watchlist add input
    const addInput = page.locator('[data-watchlist-add-input]')
    await addInput.fill('AMD')
    await page.locator('[data-watchlist-add-button]').click()

    // AMD should appear in the watchlist with a price
    await expect(page.locator('[data-ticker="AMD"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-ticker="AMD"] [data-price]')).toBeVisible()

    // Total should now be 11
    await expect(page.locator('[data-ticker]')).toHaveCount(11)
  })

  test('add same ticker twice — duplicate is rejected', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Try to add AAPL again
    const addInput = page.locator('[data-watchlist-add-input]')
    await addInput.fill('AAPL')
    await page.locator('[data-watchlist-add-button]').click()

    // Still 10 tickers — no duplicate added
    await expect(page.locator('[data-ticker="AAPL"]')).toHaveCount(1)
    await expect(page.locator('[data-ticker]')).toHaveCount(10)

    // An error or warning message should appear
    await expect(
      page.locator('text=/duplicate|already exists|already watching/i')
    ).toBeVisible({ timeout: 3_000 })
  })

  test('remove last ticker — watchlist still works after', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-ticker]')).toHaveCount(10, { timeout: 10_000 })

    // Remove all tickers one by one
    for (let i = 10; i >= 1; i--) {
      const firstTicker = page.locator('[data-ticker]').first()
      await firstTicker.locator('[data-action="remove-ticker"]').click()
      await expect(page.locator('[data-ticker]')).toHaveCount(i - 1, { timeout: 3_000 })
    }

    // Watchlist is empty
    await expect(page.locator('[data-ticker]')).toHaveCount(0)

    // Can still add a ticker
    const addInput = page.locator('[data-watchlist-add-input]')
    await addInput.fill('TSLA')
    await page.locator('[data-watchlist-add-button]').click()
    await expect(page.locator('[data-ticker="TSLA"]')).toBeVisible({ timeout: 5_000 })
  })
})
