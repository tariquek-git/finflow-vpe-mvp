import { expect, test, type Page } from '@playwright/test';
import { insertStarterTemplate } from './helpers/diagramSetup';

const clickNodeById = async (page: Page, nodeId: string) => {
  const locator = page.locator(`[data-node-id="${nodeId}"]`).first();
  await expect(locator).toBeVisible({ timeout: 15000 });
  await locator.click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);
  await clickNodeById(page, 'starter-sponsor');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');
});

test('node name tracks type while auto, then stays custom after manual edit', async ({ page }) => {
  const nameInput = page.locator('#node-field-label');
  const typeSelect = page.locator('#node-field-type');

  await expect(nameInput).toHaveValue('Sponsor Bank');
  await expect(typeSelect).toHaveValue('Sponsor Bank');

  await typeSelect.selectOption('Processor');
  await expect(nameInput).toHaveValue('Processor');
  await expect(typeSelect).toHaveValue('Processor');

  await nameInput.fill('CWB Sponsor Bank');
  await nameInput.blur();
  await expect(nameInput).toHaveValue('CWB Sponsor Bank');

  await typeSelect.selectOption('Card Network');
  await expect(typeSelect).toHaveValue('Card Network');
  await expect(nameInput).toHaveValue('CWB Sponsor Bank');
});

test('node notes auto-clean duplicate name/type content', async ({ page }) => {
  const nameInput = page.locator('#node-field-label');
  const typeSelect = page.locator('#node-field-type');
  const notesInput = page.locator('#node-field-notes');
  const sponsorNode = page.locator('[data-node-id="starter-sponsor"]').first();

  await typeSelect.selectOption('Processor');
  await expect(nameInput).toHaveValue('Processor');
  await expect(sponsorNode).toContainText('Processor');

  await notesInput.fill('Processor');
  await notesInput.blur();
  await clickNodeById(page, 'starter-processor');
  await clickNodeById(page, 'starter-sponsor');
  await expect(notesInput).toHaveValue('');

  await nameInput.fill('CWB Sponsor Bank');
  await nameInput.blur();
  await expect(nameInput).toHaveValue('CWB Sponsor Bank');
  await expect(sponsorNode).toContainText('CWB Sponsor Bank');

  await notesInput.fill('Name: CWB Sponsor Bank');
  await notesInput.blur();
  await clickNodeById(page, 'starter-processor');
  await clickNodeById(page, 'starter-sponsor');
  await expect(notesInput).toHaveValue('');

  const uniqueNotes = 'On-call runbook for weekend settlement incidents.';
  await notesInput.fill(uniqueNotes);
  await notesInput.blur();
  await expect(notesInput).toHaveValue(uniqueNotes);
});
