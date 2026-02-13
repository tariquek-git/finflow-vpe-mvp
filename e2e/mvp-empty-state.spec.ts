import { expect, test } from '@playwright/test';

test('empty canvas shows Start Here guidance when quick start is dismissed', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('finflow-builder.quickstart.dismissed.v1', 'true');
    window.localStorage.setItem(
      'finflow-builder.diagram.v1',
      JSON.stringify({ nodes: [], edges: [], drawings: [] })
    );
    window.localStorage.setItem(
      'finflow-builder.layout.v1',
      JSON.stringify({
        showSwimlanes: false,
        swimlaneLabels: ['Settlement Core', 'Risk & Controls'],
        gridMode: 'dots',
        isDarkMode: false,
        showPorts: false
      })
    );
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const state = page.getByTestId('empty-canvas-state');
  await expect(state).toBeVisible();
  await expect(state).toContainText('Start Here');
  await expect(state.getByRole('button', { name: 'Open Library' })).toBeVisible();
  await expect(state.getByRole('button', { name: 'Quick Start' })).toBeVisible();
  await expect(state.getByRole('button', { name: 'Import JSON' })).toBeVisible();
});
