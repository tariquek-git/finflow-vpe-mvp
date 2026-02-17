import { expect, test } from '@playwright/test';

const LAYOUT_STORAGE_KEY = 'finflow-builder.layout.v1';
const THEME_STORAGE_KEY = 'finflow-builder.layout.theme.v1';

test('legacy layout dark flag no longer forces dark theme', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await context.addInitScript(
    ({ layoutKey, themeKey }) => {
      window.sessionStorage.setItem(layoutKey, JSON.stringify({ isDarkMode: true }));
      window.sessionStorage.removeItem(themeKey);
    },
    { layoutKey: LAYOUT_STORAGE_KEY, themeKey: THEME_STORAGE_KEY }
  );

  const page = await context.newPage();
  await page.goto(baseURL || '/');

  await expect(page.locator('.finflow-app-shell')).not.toHaveClass(/(^|\s)dark(\s|$)/);
  await context.close();
});

test('explicit dark theme preference still enables dark mode', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await context.addInitScript(
    ({ themeKey }) => {
      window.sessionStorage.setItem(themeKey, 'dark');
    },
    { themeKey: THEME_STORAGE_KEY }
  );

  const page = await context.newPage();
  await page.goto(baseURL || '/');

  await expect(page.locator('.finflow-app-shell')).toHaveClass(/(^|\s)dark(\s|$)/);
  await context.close();
});
