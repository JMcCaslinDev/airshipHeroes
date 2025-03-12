/**
 * End-to-end test for the login screen
 */

import { test, expect } from '@playwright/test';

test('login screen should work correctly', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Check that the login container is visible
  const loginContainer = await page.locator('#login-container');
  await expect(loginContainer).toBeVisible();
  
  // Check that the title is correct
  const title = await page.locator('#login-container h1');
  await expect(title).toHaveText('Airship Skirmish');
  
  // Enter a username
  await page.fill('input[type="text"]', 'TestPlayer');
  
  // Click the start button
  await page.click('button:has-text("Start Game")');
  
  // Check that the login container is no longer visible
  await expect(loginContainer).not.toBeVisible();
  
  // Check that the game UI elements are visible
  const modeIndicator = await page.locator('#mode-indicator');
  await expect(modeIndicator).toBeVisible();
  await expect(modeIndicator).toHaveText('Ship Mode');
  
  const stats = await page.locator('#stats');
  await expect(stats).toBeVisible();
  await expect(stats).toContainText('TestPlayer');
  await expect(stats).toContainText('Kills: 0');
});

test('login should require a username', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Try to start without entering a username
  await page.click('button:has-text("Start Game")');
  
  // Check that an alert is shown
  page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Please enter a username');
    await dialog.accept();
  });
  
  // Check that the login container is still visible
  const loginContainer = await page.locator('#login-container');
  await expect(loginContainer).toBeVisible();
}); 