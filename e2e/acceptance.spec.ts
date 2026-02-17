import { expect, test, type Download, type Page } from '@playwright/test';

const EDGE_SELECTOR = 'svg g.cursor-pointer.group';
const WORLD_LAYER_SELECTOR = '[data-testid="canvas-dropzone"] div.absolute.inset-0';

const readDownloadText = async (download: Download): Promise<string> => {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read download stream.');

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const exportDiagramText = async (page: Page) => {
  const menu = await openFileMenu(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    menu.getByTestId('toolbar-export-json').click()
  ]);
  return readDownloadText(download);
};

const importDiagramText = async (page: Page, jsonText: string) => {
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles({
    name: 'acceptance-import.json',
    mimeType: 'application/json',
    buffer: Buffer.from(jsonText, 'utf8')
  });
};

const openFileMenu = async (page: Page) => {
  const strip = page.getByTestId('primary-actions-strip').first();
  const menu = strip.getByTestId('toolbar-file-menu');
  if (await menu.isVisible()) {
    return menu;
  }
  const trigger = strip.getByTestId('toolbar-file-trigger');
  await trigger.click();
  try {
    await expect(menu).toBeVisible({ timeout: 1000 });
  } catch {
    await trigger.click();
  }
  await expect(menu).toBeVisible();
  return menu;
};

const openViewMenu = async (page: Page) => {
  const panel = page.getByTestId('toolbar-view-menu').first();
  if (await panel.isVisible()) {
    return panel;
  }
  const trigger = page.getByTestId('toolbar-view-trigger').first();
  await trigger.click();
  try {
    await expect(panel).toBeVisible({ timeout: 1000 });
  } catch {
    await trigger.click();
  }
  await expect(panel).toBeVisible();
  return panel;
};

const insertStarterTemplate = async (page: Page) => {
  const menu = await openFileMenu(page);
  await menu.getByTestId('toolbar-insert-starter-template').click();
  await expect(page.locator('[data-node-id="starter-sponsor"]')).toBeVisible();
  await expect(page.locator('[data-node-id="starter-processor"]')).toBeVisible();
  await expect(page.locator('[data-node-id="starter-network"]')).toBeVisible();
};

const clickNodeByLabel = async (page: Page, label: string, shift = false) => {
  const locator = page.locator(`[data-node-label="${label}"]`).first();
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Could not find node bounding box for ${label}`);
  }
  if (shift) {
    await page.keyboard.down('Shift');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  if (shift) {
    await page.keyboard.up('Shift');
  }
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await insertStarterTemplate(page);
});

test('starter diagram is loaded and can be edited', async ({ page }) => {
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Sponsor Bank' }).first()).toBeVisible();
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Processor' }).first()).toBeVisible();
  await expect(page.locator('div.group.absolute').filter({ hasText: 'Card Network' }).first()).toBeVisible();

  const duplicateButton = page.locator('button[title="Duplicate selected nodes"]');
  await expect(duplicateButton).toHaveCount(0);

  await clickNodeByLabel(page, 'Sponsor Bank');
  await clickNodeByLabel(page, 'Processor', true);

  await expect(duplicateButton).toBeVisible();

  const beforeNodeCount = await page.locator('div.group.absolute').count();
  await duplicateButton.click();
  await expect.poll(async () => page.locator('div.group.absolute').count()).toBeGreaterThan(beforeNodeCount);
});

test('connector drag-drop from toolbar into canvas inserts a connector edge', async ({ page }) => {
  const beforeEdges = await page.locator(EDGE_SELECTOR).count();

  await page.evaluate(() => {
    const connectorButton = document.querySelector('[data-testid="toolbar-insert-connector"]');
    const canvas = document.querySelector('[data-testid="canvas-dropzone"]');
    if (!connectorButton || !canvas) {
      throw new Error('Missing connector button or canvas dropzone');
    }

    const transfer = new DataTransfer();
    connectorButton.dispatchEvent(
      new DragEvent('dragstart', { dataTransfer: transfer, bubbles: true, cancelable: true })
    );

    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * 0.68;
    const y = rect.top + rect.height * 0.58;

    canvas.dispatchEvent(
      new DragEvent('dragover', {
        dataTransfer: transfer,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      })
    );

    canvas.dispatchEvent(
      new DragEvent('drop', {
        dataTransfer: transfer,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      })
    );
  });

  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(beforeEdges + 1);
});

test('reset and restore recover previous workspace state', async ({ page }) => {
  const connectorButton = page.locator('[data-testid="toolbar-insert-connector"]');
  await connectorButton.click();
  const modifiedEdgeCount = await page.locator(EDGE_SELECTOR).count();
  await expect(modifiedEdgeCount).toBeGreaterThan(2);

  page.once('dialog', (dialog) => dialog.accept());
  const fileMenu = await openFileMenu(page);
  await fileMenu.getByTestId('toolbar-reset-canvas').click();
  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(0);

  const restoreMenu = await openFileMenu(page);
  const restoreButton = restoreMenu.getByTestId('toolbar-restore');
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  await expect.poll(async () => page.locator(EDGE_SELECTOR).count()).toBe(modifiedEdgeCount);
});

test('edge styling is inspector-only for selected connector', async ({ page }) => {
  await page.locator('[data-testid="toolbar-insert-connector"]').click();
  await expect(page.getByTestId('selection-action-tray')).toHaveCount(0);
  await expect(page.locator('button[title="dashed line style"]')).toHaveCount(0);

  const inspectorBody = page.getByTestId('inspector-scroll-body');
  const dashedButton = inspectorBody.getByRole('button', { name: 'dashed' });
  const dottedButton = inspectorBody.getByRole('button', { name: 'dotted' });
  const solidButton = inspectorBody.getByRole('button', { name: 'solid' });
  const bothArrowsButton = inspectorBody.getByRole('button', { name: 'Both' });
  const noneArrowsButton = inspectorBody.getByRole('button', { name: 'None' });

  await expect(dashedButton).toBeEnabled();
  await dashedButton.click();
  await expect(dashedButton).toHaveClass(/is-active/);

  await dottedButton.click();
  await expect(dottedButton).toHaveClass(/is-active/);

  await solidButton.click();
  await expect(solidButton).toHaveClass(/is-active/);

  await bothArrowsButton.click();
  await expect(bothArrowsButton).toHaveClass(/is-active/);
  await noneArrowsButton.click();
  await expect(noneArrowsButton).toHaveClass(/is-active/);
});

test('contextual tray shows only relevant actions for current selection', async ({ page }) => {
  const tray = page.getByTestId('selection-action-tray');
  await expect(tray).toHaveCount(0);

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.locator('button[title="Duplicate selected node"]')).toBeVisible();
  await expect(page.locator('button[title="dashed line style"]')).toHaveCount(0);

  await page.locator('[data-testid="toolbar-insert-connector"]').click();
  await expect(tray).toHaveCount(0);
  await expect(page.locator('button[title="dashed line style"]')).toHaveCount(0);
  await expect(page.locator('button[title="Duplicate selected node"]')).toHaveCount(0);
});

test('mobile bottom dock uses More overflow for contextual actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  if ((await page.locator('[data-node-id="starter-sponsor"]').count()) === 0) {
    await insertStarterTemplate(page);
  }

  await expect(page.getByTestId('bottom-more-actions')).toHaveCount(0);
  const selectTool = page.getByTestId('bottom-tool-select').first();
  if ((await selectTool.getAttribute('aria-pressed')) !== 'true') {
    await selectTool.click();
    await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
  }

  await clickNodeByLabel(page, 'Sponsor Bank');
  const moreButton = page.getByTestId('bottom-more-actions');
  await expect(moreButton).toBeVisible({ timeout: 8000 });

  await moreButton.click();
  const overflowSheet = page.getByTestId('bottom-overflow-sheet');
  await expect(overflowSheet).toBeVisible();
  await expect(overflowSheet.locator('button[title="Duplicate selected nodes"]')).toBeVisible();
  await expect(overflowSheet.locator('button[title="dashed line style"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('bottom-overflow-sheet')).toHaveCount(0);

  await page.locator('[data-testid="toolbar-insert-connector"]').click();
  await expect(page.getByTestId('bottom-more-actions')).toHaveCount(0);
});

test('export controls include JSON/SVG/PNG/PDF and trigger downloads', async ({ page }) => {
  const fileMenu = await openFileMenu(page);
  await expect(fileMenu.getByTestId('toolbar-export-json')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-export-svg')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-export-png')).toBeVisible();
  await expect(fileMenu.getByTestId('toolbar-export-pdf')).toBeVisible();

  const [svgDownload] = await Promise.all([
    page.waitForEvent('download'),
    fileMenu.getByTestId('toolbar-export-svg').click()
  ]);
  expect((await svgDownload.suggestedFilename()).toLowerCase()).toContain('.svg');

  const fileMenuForPng = await openFileMenu(page);
  const [pngDownload] = await Promise.all([
    page.waitForEvent('download'),
    fileMenuForPng.getByTestId('toolbar-export-png').click()
  ]);
  expect((await pngDownload.suggestedFilename()).toLowerCase()).toContain('.png');

  const fileMenuForPdf = await openFileMenu(page);
  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    fileMenuForPdf.getByTestId('toolbar-export-pdf').click()
  ]);
  expect((await pdfDownload.suggestedFilename()).toLowerCase()).toContain('.pdf');
});

test('command palette exposes export actions using shared handlers', async ({ page }) => {
  await page.getByTestId('toolbar-open-command').click();
  const palette = page.getByTestId('command-palette');
  await expect(palette).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    palette.getByTestId('command-action-export-json').click()
  ]);
  expect((await download.suggestedFilename()).toLowerCase()).toContain('.json');
});

test('primary actions labels remain readable without clipping on desktop', async ({ page }) => {
  const strip = page.getByTestId('primary-actions-strip');
  await expect(strip).toBeVisible();

  const fileTrigger = page.getByTestId('toolbar-file-trigger').first();

  await expect(fileTrigger).toBeVisible();

  const fileTriggerClipped = await fileTrigger.evaluate((element) => {
    return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
  });
  expect(fileTriggerClipped, 'File trigger is clipped').toBe(false);

  const stripOverflowing = await strip.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
  expect(stripOverflowing).toBe(false);
});

test('view popover no longer includes risk and ledger overlay toggles', async ({ page }) => {
  const viewMenu = await openViewMenu(page);
  await expect(viewMenu.getByTestId('toolbar-toggle-risk-overlay')).toHaveCount(0);
  await expect(viewMenu.getByTestId('toolbar-toggle-ledger-overlay')).toHaveCount(0);
});

test('minimap toggle lives in view popover and pans viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const viewMenu = await openViewMenu(page);
  const minimapToggle = viewMenu.getByTestId('toolbar-view-minimap');
  await minimapToggle.click();
  await expect(page.getByTestId('canvas-minimap')).toBeVisible();

  const worldLayer = page.locator(WORLD_LAYER_SELECTOR).first();
  const before = await worldLayer.getAttribute('style');

  await page.evaluate(() => {
    const minimap = document.querySelector('[data-testid="canvas-minimap"] [role="button"]') as HTMLElement | null;
    if (!minimap) {
      throw new Error('Minimap control is missing.');
    }
    const rect = minimap.getBoundingClientRect();
    minimap.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 12,
        clientY: rect.top + 12
      })
    );
  });
  await expect.poll(async () => worldLayer.getAttribute('style')).not.toBe(before);
});

test('view menu no longer exposes swimlane toggle', async ({ page }) => {
  const viewMenu = await openViewMenu(page);
  await expect(viewMenu.getByTestId('toolbar-view-lanes')).toHaveCount(0);
});

test('edge labels reveal on edge focus and non-connected edges dim on node selection', async ({ page }) => {
  const firstEdge = page.locator('g[data-edge-id]').first();
  const edgeId = await firstEdge.getAttribute('data-edge-id');
  if (!edgeId) {
    throw new Error('Could not resolve first edge id');
  }
  const edgeLabel = page.getByTestId(`edge-label-${edgeId}`);

  const opacityBeforeHover = await edgeLabel.evaluate((element) => window.getComputedStyle(element).opacity);
  expect(Number(opacityBeforeHover)).toBeLessThan(0.2);

  await firstEdge.dispatchEvent('click');
  await expect
    .poll(async () =>
      edgeLabel.evaluate((element) => Number.parseFloat(window.getComputedStyle(element).opacity))
    )
    .toBeGreaterThan(0.75);

  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect.poll(async () => page.locator('g[data-dimmed="true"]').count()).toBeGreaterThan(0);
});

test('inspector metadata is encoded in description and survives export/import', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  const detailsToggle = page.getByTestId('inspector-toggle-node-details');
  if ((await detailsToggle.getAttribute('aria-expanded')) === 'false') {
    await detailsToggle.click();
  }

  await page
    .getByPlaceholder('Operational context and workflow notes...')
    .fill('Primary settlement and sponsorship responsibilities.');
  await page.getByLabel('Sponsor / Custodian').fill('North Ridge Sponsor');
  await expect(page.getByLabel('Sponsor / Custodian')).toHaveValue('North Ridge Sponsor');
  await page.getByLabel('KYC Owner').fill('Compliance Ops');
  await expect(page.getByLabel('KYC Owner')).toHaveValue('Compliance Ops');

  const exportedText = await exportDiagramText(page);
  const payload = JSON.parse(exportedText) as {
    diagram?: { nodes?: Array<{ label?: string; description?: string }> };
  };
  const sponsorNode = payload.diagram?.nodes?.find((node) => node.label === 'Sponsor Bank');
  expect(sponsorNode?.description).toContain('[[finflow-meta]]');
  expect(sponsorNode?.description).toContain('custodyHolder=North Ridge Sponsor');
  expect(sponsorNode?.description).toContain('kycOwner=Compliance Ops');
  expect(sponsorNode?.description).toContain('Primary settlement and sponsorship responsibilities.');

  page.once('dialog', (dialog) => dialog.accept());
  const resetMenu = await openFileMenu(page);
  await resetMenu.getByTestId('toolbar-reset-canvas').click();
  await importDiagramText(page, exportedText);

  await clickNodeByLabel(page, 'Sponsor Bank');
  if ((await detailsToggle.getAttribute('aria-expanded')) === 'false') {
    await detailsToggle.click();
  }
  await expect(page.getByLabel('Sponsor / Custodian')).toHaveValue('North Ridge Sponsor');
  await expect(page.getByLabel('KYC Owner')).toHaveValue('Compliance Ops');
});

test('inspector fields adapt to selected node type and payment rail', async ({ page }) => {
  await clickNodeByLabel(page, 'Processor');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');
  await expect(page.getByText('Intermediary profile')).toBeVisible();

  const detailsToggle = page.getByTestId('inspector-toggle-node-details');
  if ((await detailsToggle.getAttribute('aria-expanded')) === 'false') {
    await detailsToggle.click();
  }
  await expect(page.getByLabel('Settlement Partner')).toBeVisible();

  const complianceToggle = page.getByTestId('inspector-scroll-body').getByRole('button', { name: 'Compliance' }).first();
  if ((await complianceToggle.getAttribute('aria-expanded')) === 'false') {
    await complianceToggle.click();
  }
  await expect(page.getByLabel('Program KYC Owner')).toBeVisible();

  await page.getByLabel('Node Type').selectOption('Sponsor Bank');
  await expect(page.getByText('Institution profile')).toBeVisible();
  await expect(page.getByLabel('Sponsor / Custodian')).toBeVisible();
  await expect(page.getByLabel('KYC Owner')).toBeVisible();

  const firstEdge = page.locator('g[data-edge-id]').first();
  await firstEdge.dispatchEvent('click');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Edge');

  const railSelect = page.getByLabel('Rail / Instrument');
  await expect.poll(async () => {
    await railSelect.selectOption('RTP');
    return railSelect.inputValue();
  }).toBe('RTP');
  await expect(page.getByText('AI Suggestions')).toBeVisible();
  await page.getByRole('button', { name: /AI suggested:/i }).first().click();
  await expect(page.getByLabel('Type')).not.toHaveValue('');
  await expect(page.getByLabel('Timing')).not.toHaveValue('');
  const inspectorBody = page.getByTestId('inspector-scroll-body');
  await inspectorBody.getByRole('button', { name: 'dashed' }).click();
  await expect(inspectorBody.getByRole('button', { name: 'dashed' })).toHaveClass(/is-active/);
});

test('inspector account and appearance controls persist on node data', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByTestId('inspector-mode-title')).toContainText('Node');

  await page.getByLabel('Account Type').selectOption('FBO');
  await page.getByPlaceholder('Optional: FBO for whom, custodian, program name').fill('Program Alpha, Custodian North');

  const appearanceToggle = page.getByRole('button', { name: 'Appearance' }).first();
  if ((await appearanceToggle.getAttribute('aria-expanded')) === 'false') {
    await appearanceToggle.click();
  }
  await page.getByRole('button', { name: 'Circle' }).click();
  await page.getByLabel('Border style').selectOption('dashed');
  await page.getByLabel('Opacity').fill('62');

  const exportedText = await exportDiagramText(page);
  const payload = JSON.parse(exportedText) as {
    diagram?: { nodes?: Array<{ label?: string; shape?: string; data?: Record<string, unknown> }> };
  };
  const sponsorNode = payload.diagram?.nodes?.find((node) => node.label === 'Sponsor Bank');
  expect(sponsorNode?.shape).toBe('circle');
  expect(sponsorNode?.data?.accountType).toBe('FBO');
  expect(sponsorNode?.data?.accountDetails).toBe('Program Alpha, Custodian North');
  expect(sponsorNode?.data?.borderStyle).toBe('dashed');
  expect(sponsorNode?.data?.opacity).toBe(62);
});

test('locked nodes cannot be dragged on canvas', async ({ page }) => {
  await clickNodeByLabel(page, 'Sponsor Bank');
  await expect(page.getByRole('switch', { name: 'Lock' })).toBeVisible();
  await page.getByRole('switch', { name: 'Lock' }).click();

  const node = page.locator('div.group.absolute').filter({ hasText: 'Sponsor Bank' }).first();
  const before = await node.boundingBox();
  if (!before) {
    throw new Error('Could not read node position before drag.');
  }

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 140, before.y + before.height / 2 + 90);
  await page.mouse.up();

  const after = await node.boundingBox();
  if (!after) {
    throw new Error('Could not read node position after drag.');
  }

  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
});

test('level-of-detail hides node metadata and edge labels as zoom decreases', async ({ page }) => {
  const clickViewControl = async (testId: string) => {
    const viewMenu = await openViewMenu(page);
    await viewMenu.getByTestId(testId).click();
  };

  const nodeMeta = page.getByTestId('node-meta-starter-sponsor');
  for (let i = 0; i < 14; i += 1) {
    if ((await nodeMeta.count()) > 0) break;
    await clickViewControl('toolbar-view-zoom-in');
  }
  await expect
    .poll(async () => nodeMeta.count())
    .toBeGreaterThan(0);
  await expect(nodeMeta).toBeVisible();

  const firstEdge = page.locator('g[data-edge-id]').first();
  const edgeId = await firstEdge.getAttribute('data-edge-id');
  if (!edgeId) {
    throw new Error('Could not resolve first edge id');
  }

  await firstEdge.dispatchEvent('click');
  await expect
    .poll(async () =>
      page
        .getByTestId(`edge-label-${edgeId}`)
        .evaluate((element) => Number.parseFloat(window.getComputedStyle(element).opacity))
    )
    .toBeGreaterThan(0.75);

  for (let i = 0; i < 24; i += 1) {
    if ((await nodeMeta.count()) === 0) break;
    await clickViewControl('toolbar-view-zoom-out');
  }
  await expect(nodeMeta).toHaveCount(0);

  const edgeLabel = page.getByTestId(`edge-label-${edgeId}`);
  for (let i = 0; i < 24; i += 1) {
    if ((await edgeLabel.count()) === 0) break;
    await clickViewControl('toolbar-view-zoom-out');
  }
  await expect(edgeLabel).toHaveCount(0);
});
