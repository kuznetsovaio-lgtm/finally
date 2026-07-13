import { test, expect } from '@playwright/test'

test.describe('AI Chat (mocked LLM)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-chat-panel]')).toBeVisible({ timeout: 10_000 })
  })

  test('send a message — response appears', async ({ page }) => {
    const input = page.locator('[data-chat-input]')
    await input.fill('What is my portfolio worth?')
    await page.locator('[data-chat-send-button]').click()

    // User message should appear
    await expect(
      page.locator('[data-chat-message-role="user"]').last()
    ).toContainText('What is my portfolio worth?')

    // Wait for assistant response
    await expect(
      page.locator('[data-chat-message-role="assistant"]').last()
    ).toBeVisible({ timeout: 15_000 })

    const assistantMsg = await page
      .locator('[data-chat-message-role="assistant"]')
      .last()
      .textContent()
    expect(assistantMsg).toBeTruthy()
    expect(assistantMsg!.length).toBeGreaterThan(0)
  })

  test('send a buy request — trade confirmation chip appears', async ({ page }) => {
    const input = page.locator('[data-chat-input]')
    await input.fill('Buy 5 shares of NVDA')
    await page.locator('[data-chat-send-button]').click()

    // Wait for response
    await expect(
      page.locator('[data-chat-message-role="assistant"]').last()
    ).toBeVisible({ timeout: 15_000 })

    // Trade confirmation chip should appear somewhere in the chat
    // Look for an inline confirmation element (varies by implementation)
    const chip = page.locator('[data-chat-trade-confirmation], [data-trade-chip]')
    await expect(chip.first()).toBeVisible({ timeout: 5_000 })

    // Should mention NVDA
    const chipText = await chip.first().textContent()
    expect(chipText).toMatch(/NVDA/i)
  })

  test('conversation history persists across messages in same session', async ({
    page,
  }) => {
    const input = page.locator('[data-chat-input]')

    // First message
    await input.fill('Hello')
    await page.locator('[data-chat-send-button]').click()
    await expect(
      page.locator('[data-chat-message-role="assistant"]').last()
    ).toBeVisible({ timeout: 15_000 })

    // Second message — conversation context should include the first exchange
    await input.fill('What companies do I own?')
    await page.locator('[data-chat-send-button]').click()
    await expect(
      page.locator('[data-chat-message-role="assistant"]').last()
    ).toBeVisible({ timeout: 15_000 })

    // Both user messages should appear in the chat
    const userMessages = page.locator('[data-chat-message-role="user"]')
    await expect(userMessages).toHaveCount(2)
  })

  test('chat input clears after sending', async ({ page }) => {
    const input = page.locator('[data-chat-input]')
    await input.fill('Tell me about AAPL')
    await page.locator('[data-chat-send-button]').click()

    // Input should be cleared
    await expect(input).toHaveValue('')
  })

  test('loading indicator shown while awaiting response', async ({ page }) => {
    const input = page.locator('[data-chat-input]')
    await input.fill('What is my cash balance?')
    await page.locator('[data-chat-send-button]').click()

    // Loading indicator should appear immediately after send
    const loader = page.locator('[data-chat-loading]')
    await expect(loader).toBeVisible({ timeout: 2_000 })

    // Loader should disappear when response arrives
    await expect(
      page.locator('[data-chat-message-role="assistant"]').last()
    ).toBeVisible({ timeout: 15_000 })
    await expect(loader).not.toBeVisible({ timeout: 2_000 })
  })
})
