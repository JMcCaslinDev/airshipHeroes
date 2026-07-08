/**
 * E2E: player movement on ship deck survives ship rotation.
 */

import { test, expect } from '@playwright/test';

async function loginAndEnterArena(page, username = 'WalkTester') {
  await page.goto('/');
  await page.waitForSelector('#login-screen', { state: 'visible', timeout: 25000 });
  await page.fill('#username-input', username);
  await page.click('button:has-text("Enter Shipyard")');
  await page.waitForSelector('#shipyard-screen', { state: 'visible' });
  await page.click('.ship-slot-card button:has-text("Edit")');
  await page.waitForFunction(() => window.gameState?.localPlayer?.ship?.blockManager?.blocks?.length > 0);
  await page.click('#build-depart-btn');
  await expect(page.locator('#mode-indicator')).toHaveText('Ship Mode', { timeout: 20000 });
}

async function getPlayerWorldPos(page) {
  return page.evaluate(() => {
    const p = window.gameState.localPlayer.character.position;
    return { x: p.x, y: p.y, z: p.z };
  });
}

async function getPlayerLocalPos(page) {
  return page.evaluate(() => {
    const ship = window.gameState.localPlayer.ship;
    const p = window.gameState.localPlayer.character.position;
    return ship.transform.worldToLocalPosition({ x: p.x, y: p.y, z: p.z });
  });
}

async function focusGame(page) {
  await page.click('#game-canvas', { position: { x: 400, y: 300 } });
}

async function rotateShip(page, radians) {
  await page.evaluate((r) => {
    const ship = window.gameState.localPlayer.ship;
    ship.rotation += r;
    ship.group.rotation.y = ship.rotation;
    ship.group.updateMatrixWorld(true);
  }, radians);
}

async function isOnShipDeck(page) {
  return page.evaluate(() => {
    const ship = window.gameState.localPlayer.ship;
    const p = window.gameState.localPlayer.character.position;
    const local = ship.transform.worldToLocalPosition({ x: p.x, y: p.y, z: p.z });
    return local.y >= 0 && local.y <= 1.5;
  });
}

async function holdKeys(page, keys, ms) {
  for (const key of keys) {
    await page.keyboard.down(key);
  }
  await page.waitForTimeout(ms);
  for (const key of keys) {
    await page.keyboard.up(key);
  }
}

async function tapKey(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(50);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
}

test.describe('player movement on rotated ship', () => {
  test.describe.configure({ timeout: 60000 });
  test('walk forward and strafe in player mode after rotating ship', async ({ page }) => {
    await loginAndEnterArena(page);
    await focusGame(page);

    // Player mode
    await tapKey(page, 'b');
    await expect(page.locator('#mode-indicator')).toHaveText('Player Mode');
    expect(await isOnShipDeck(page)).toBe(true);

    const startLocal = await getPlayerLocalPos(page);
    expect(startLocal.y).toBeCloseTo(0.5, 0);

    await holdKeys(page, ['w'], 800);
    const afterForward = await getPlayerLocalPos(page);
    const forwardDist = Math.hypot(afterForward.x - startLocal.x, afterForward.z - startLocal.z);
    expect(forwardDist).toBeGreaterThan(0.4);

    // Ship mode — rotate ship (game loop Q/E is slow; set yaw directly for reliable coverage)
    await tapKey(page, 'b');
    await expect(page.locator('#mode-indicator')).toHaveText('Ship Mode');

    const rotBefore = (await page.evaluate(() => window.gameState.localPlayer.ship.rotation));
    await rotateShip(page, Math.PI / 3);
    const rotAfter = (await page.evaluate(() => window.gameState.localPlayer.ship.rotation));
    expect(Math.abs(rotAfter - rotBefore)).toBeGreaterThan(0.1);

    // Back to player — should respawn on control block, not drift off ship
    await tapKey(page, 'b');
    await expect(page.locator('#mode-indicator')).toHaveText('Player Mode');

    const respawnLocal = await getPlayerLocalPos(page);
    expect(respawnLocal.y).toBeCloseTo(0.5, 0);
    expect(Math.hypot(respawnLocal.x, respawnLocal.z)).toBeLessThan(1.5);

    const mid = await getPlayerWorldPos(page);
    await holdKeys(page, ['w'], 800);
    const afterRotWalk = await getPlayerWorldPos(page);
    const worldMoved = Math.hypot(afterRotWalk.x - mid.x, afterRotWalk.z - mid.z);
    expect(worldMoved).toBeGreaterThan(0.3);

    await holdKeys(page, ['d'], 800);
    const afterStrafe = await getPlayerWorldPos(page);
    const strafeMoved = Math.hypot(afterStrafe.x - afterRotWalk.x, afterStrafe.z - afterRotWalk.z);
    expect(strafeMoved).toBeGreaterThan(0.3);

    const endLocal = await getPlayerLocalPos(page);
    expect(endLocal.y).toBeCloseTo(0.5, 0);
  });

  test('jump and sneak on ship deck', async ({ page }) => {
    await loginAndEnterArena(page);
    await focusGame(page);
    await tapKey(page, 'b');
    await expect(page.locator('#mode-indicator')).toHaveText('Player Mode');
    expect(await isOnShipDeck(page)).toBe(true);

    await page.keyboard.down(' ');
    await page.waitForTimeout(150);
    await page.keyboard.up(' ');
    await page.waitForTimeout(900);

    expect(await isOnShipDeck(page)).toBe(true);

    await holdKeys(page, ['x'], 500);
    expect(await isOnShipDeck(page)).toBe(true);
  });
});
