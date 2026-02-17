import { expect, test, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const sponsorNode = '[data-node-id="starter-sponsor"]';

const selectSponsorNode = async (page: Page) => {
  await page.locator(sponsorNode).click();
  await expect(page.getByTestId('node-context-toolbar')).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);
});

test('escape closes file menu without clearing current selection', async ({ page }) => {
  await selectSponsorNode(page);
  const fileTrigger = page.getByTestId('toolbar-file-trigger').first();
  const fileMenu = page.getByTestId('toolbar-file-menu').first();

  await fileTrigger.click();
  await expect(fileMenu).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(fileMenu).toBeHidden();
  await expect(page.getByTestId('node-context-toolbar')).toBeVisible();
});

test('escape closes node-context overflow menu without clearing selection', async ({ page }) => {
  await selectSponsorNode(page);
  const toolbar = page.getByTestId('node-context-toolbar');

  await toolbar.getByLabel('More node actions').click();
  const overflowItem = page
    .getByRole('button', { name: /Show Account Chip|Hide Account Chip/ })
    .first();
  await expect(overflowItem).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(overflowItem).toHaveCount(0);
  await expect(toolbar).toBeVisible();
});

test('escape closes shortcuts help modal and keeps node selection', async ({ page }) => {
  await selectSponsorNode(page);
  await page.getByTestId('toolbar-help-open').click();

  const shortcutsModal = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(shortcutsModal).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(shortcutsModal).toBeHidden();
  await expect(page.getByTestId('node-context-toolbar')).toBeVisible();
});
