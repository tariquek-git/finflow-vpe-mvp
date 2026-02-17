import { expect, type Page } from '@playwright/test';

export const openFileMenu = async (page: Page) => {
  const strip = page.getByTestId('primary-actions-strip').first();
  const menu = strip.getByTestId('toolbar-file-menu').first();
  if (await menu.isVisible()) return menu;
  await strip.getByTestId('toolbar-file-trigger').first().click();
  await expect(menu).toBeVisible();
  return menu;
};

export const insertStarterTemplate = async (page: Page) => {
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-insert-starter-template').click();
  await expect(page.locator('[data-node-id="starter-sponsor"]')).toBeVisible();
  await expect(page.locator('[data-node-id="starter-processor"]')).toBeVisible();
  await expect(page.locator('[data-node-id="starter-network"]')).toBeVisible();
};
