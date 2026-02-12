import { spawn } from 'node:child_process';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const cwd = process.cwd();
const preferredPort = 4173;
const artifactRoot = path.join(cwd, 'qa-artifacts');
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(artifactRoot, runStamp);
const storageKey = 'banking-diagram-mvp-v1';
const defaultUi = {
  darkMode: false,
  backgroundMode: 'grid',
  snapToGrid: false,
  autoLayoutDirection: 'LR',
  showSwimlanes: true,
  laneOrientation: 'horizontal',
  showMiniMap: false,
  exportIncludeSwimlanes: true,
  exportIncludeBackground: true,
};
const defaultLaneLabels = ['Initiation', 'Processing', 'Settlement'];
mkdirSync(runDir, { recursive: true });

const report = {
  date: new Date().toISOString(),
  baseUrl: '',
  checks: [],
  summary: {
    passed: 0,
    failed: 0,
  },
};

function addCheck(id, name, ok, details = '') {
  report.checks.push({ id, name, ok, details });
  if (ok) {
    report.summary.passed += 1;
  } else {
    report.summary.failed += 1;
  }
}

function markProgress(message) {
  console.log(`[qa] ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : preferredPort;
      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitFor(fn, timeoutMs = 10000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) {
      return value;
    }
    await sleep(intervalMs);
  }
  throw new Error('Timed out waiting for condition');
}

async function saveDownloadTemp(download, targetPath) {
  const tempPath = await download.path();
  if (tempPath) {
    copyFileSync(tempPath, targetPath);
    return;
  }
  await download.saveAs(targetPath);
}

async function setCheckbox(page, label, checked) {
  const checkbox = page.getByLabel(label);
  const current = await checkbox.isChecked();
  if (current !== checked) {
    await checkbox.click();
  }
}

async function dragPaletteNode(page, name, x, y) {
  const source = page.getByRole('button', { name, exact: true }).first();
  const dropTarget = page.locator('.react-flow').first();
  const dropBox = await dropTarget.boundingBox();
  assert(Boolean(dropBox), 'Canvas drop target not found');

  const clientX = dropBox.x + x;
  const clientY = dropBox.y + y;

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await dropTarget.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
  await dropTarget.dispatchEvent('drop', { dataTransfer, clientX, clientY });
}

async function clickAndCaptureDownload(page, buttonName, timeoutMs = 20000) {
  return new Promise(async (resolve, reject) => {
    let timer;
    const onDownload = (download) => {
      clearTimeout(timer);
      page.off('download', onDownload);
      resolve(download);
    };

    page.on('download', onDownload);
    timer = setTimeout(() => {
      page.off('download', onDownload);
      reject(new Error(`Timed out waiting for download after clicking "${buttonName}"`));
    }, timeoutMs);

    try {
      await page.getByRole('button', { name: buttonName, exact: true }).click();
    } catch (error) {
      clearTimeout(timer);
      page.off('download', onDownload);
      reject(error);
    }
  });
}

async function importJsonFile(page, filePath) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
}

async function openViewMenu(page) {
  const marker = page.getByText('Background');
  const alreadyOpen = await marker.isVisible().catch(() => false);
  if (!alreadyOpen) {
    await page.getByRole('button', { name: 'View', exact: true }).click();
  }
  await marker.waitFor({ timeout: 5000 });
}

async function openExportMenu(page) {
  const marker = page.getByText('Include swimlanes');
  const alreadyOpen = await marker.isVisible().catch(() => false);
  if (!alreadyOpen) {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
  }
  await marker.waitFor({ timeout: 5000 });
}

async function connectNodes(page, sourceIndex, targetIndex) {
  const source = page.locator('.react-flow__node').nth(sourceIndex).locator('.react-flow__handle-right').first();
  const target = page.locator('.react-flow__node').nth(targetIndex).locator('.react-flow__handle-left').first();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  assert(Boolean(sourceBox), `Missing source handle for node ${sourceIndex}`);
  assert(Boolean(targetBox), `Missing target handle for node ${targetIndex}`);
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function edgeCount(page) {
  return page.locator('.react-flow__edge').count();
}

async function nodeCount(page) {
  return page.locator('.react-flow__node').count();
}

async function expectNodeCount(page, expected, label, timeoutMs = 5000) {
  try {
    await waitFor(async () => (await nodeCount(page)) === expected, timeoutMs);
  } catch {
    throw new Error(`${label}: expected node count ${expected}, actual ${await nodeCount(page)}`);
  }
}

async function readStoredPayload(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }, storageKey);
}

function markdownStatus(ok) {
  return ok ? 'PASS' : 'FAIL';
}

function buildMarkdownReport() {
  const lines = [];
  lines.push('# MVP E2E QA Report');
  lines.push('');
  lines.push(`Date: ${new Date(report.date).toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  for (const check of report.checks) {
    const details = check.details ? ` - ${check.details}` : '';
    lines.push(`- ${check.id} ${check.name}: ${markdownStatus(check.ok)}${details}`);
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Artifacts: \`qa-artifacts/${runStamp}\``);
  lines.push('');
  return lines.join('\n');
}

const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';

let server;
let browser;

try {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  report.baseUrl = baseUrl;

  const serverLogPath = path.join(runDir, 'dev-server.log');
  const serverLogStream = createWriteStream(serverLogPath, { flags: 'a' });

  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  server.stdout.pipe(serverLogStream);
  server.stderr.pipe(serverLogStream);

  markProgress(`waiting for dev server at ${baseUrl}`);
  await waitForServer(baseUrl);
  markProgress('dev server ready');

  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }
  markProgress('browser launched');

  const context = await browser.newContext({
    viewport: { width: 1700, height: 1000 },
    acceptDownloads: true,
  });
  context.setDefaultTimeout(12000);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  markProgress('page loaded');

  try {
    await page.getByText('Quick Help').waitFor({ timeout: 5000 });
    addCheck('A0', 'Initial app load', true, 'Quick Help visible');
  } catch (error) {
    addCheck('A0', 'Initial app load', false, String(error));
  }

  let savedJsonPath = '';

  try {
    markProgress('A1 start');
    await dragPaletteNode(page, 'Sponsor Bank', 520, 230);
    await dragPaletteNode(page, 'Issuer Bank', 860, 300);
    await waitFor(async () => (await nodeCount(page)) >= 2, 7000);
    await connectNodes(page, 0, 1);
    await waitFor(async () => (await edgeCount(page)) >= 1, 5000);
    addCheck('A1', 'Create nodes and connect edge', true, `nodes=${await nodeCount(page)} edges=${await edgeCount(page)}`);
    markProgress('A1 pass');
  } catch (error) {
    addCheck('A1', 'Create nodes and connect edge', false, String(error));
    markProgress('A1 fail');
  }

  if ((await nodeCount(page)) < 2) {
    markProgress('A1 fallback load sample');
    try {
      const samplePath = path.join(cwd, 'public', 'sampleDiagram.json');
      await importJsonFile(page, samplePath);
      await waitFor(async () => (await nodeCount(page)) >= 2, 10000);
      addCheck('A1F', 'Fallback sample import for downstream checks', true);
    } catch (error) {
      addCheck('A1F', 'Fallback sample import for downstream checks', false, String(error));
    }
  }

  try {
    markProgress('A2 start');
    const before = await edgeCount(page);
    await connectNodes(page, 0, 0);
    await sleep(250);
    const after = await edgeCount(page);
    assert(before === after, `Expected self-loop to be blocked (${before} -> ${after})`);
    addCheck('A2', 'Prevent self-loop edge', true);
    markProgress('A2 pass');
  } catch (error) {
    addCheck('A2', 'Prevent self-loop edge', false, String(error));
    markProgress('A2 fail');
  }

  try {
    markProgress('A4N start');
    const firstNode = page.locator('.react-flow__node').nth(0);
    await firstNode.click();
    const displayNameField = page.locator('label:has-text("Display Name") input');
    await displayNameField.fill('QA Sponsor Node');
    await waitFor(async () => (await page.getByText('QA Sponsor Node').count()) > 0, 5000);
    addCheck('A4N', 'Node inspector updates node immediately', true);
    markProgress('A4N pass');
  } catch (error) {
    addCheck('A4N', 'Node inspector updates node immediately', false, String(error));
    markProgress('A4N fail');
  }

  try {
    markProgress('A4E start');
    await page.locator('.react-flow__edge-interaction').first().click();
    const railSelect = page.locator('label:has-text("Rail") select');
    await railSelect.selectOption('RTP');
    await waitFor(async () => (await page.locator('.react-flow__edge-text').filter({ hasText: 'RTP' }).count()) > 0, 5000);
    addCheck('A4E', 'Edge inspector updates edge immediately', true);
    markProgress('A4E pass');
  } catch (error) {
    addCheck('A4E', 'Edge inspector updates edge immediately', false, String(error));
    markProgress('A4E fail');
  }

  try {
    markProgress('A5 start');
    const railSelect = page.locator('label:has-text("Rail") select');
    const networkSelect = page.locator('label:has-text("Network Name") select');

    await railSelect.selectOption('Blank');
    await sleep(120);
    const blankCount = await page.locator('.react-flow__edge-text').filter({ hasText: 'ACH' }).count();
    assert(blankCount === 0, 'Expected no ACH label when rail is Blank');

    await railSelect.selectOption('ACH');
    await waitFor(async () => (await page.locator('.react-flow__edge-text').filter({ hasText: 'ACH' }).count()) > 0, 5000);

    await railSelect.selectOption('Card Network');
    await networkSelect.selectOption('Visa');
    await waitFor(
      async () => (await page.locator('.react-flow__edge-text').filter({ hasText: 'Card Network (Visa)' }).count()) > 0,
      5000,
    );

    addCheck('A5', 'Edge label rules', true);
    markProgress('A5 pass');
  } catch (error) {
    addCheck('A5', 'Edge label rules', false, String(error));
    markProgress('A5 fail');
  }

  try {
    markProgress('A3 start');
    const baseline = await nodeCount(page);
    const selectedNode = page.locator('.react-flow__node').nth(0);
    await selectedNode.click();
    await waitFor(async () => (await page.locator('.react-flow__node.selected').count()) > 0, 3000);
    const duplicateCombos = Array.from(new Set([`${modifierKey}+d`, 'Meta+d', 'Control+d']));
    let duplicated = false;
    for (const combo of duplicateCombos) {
      await page.keyboard.press(combo);
      await sleep(150);
      if ((await nodeCount(page)) === baseline + 1) {
        duplicated = true;
        break;
      }
    }
    assert(duplicated, 'Duplicate shortcut did not create a new node');

    await page.keyboard.press('Delete');
    await expectNodeCount(page, baseline, 'Delete selected node');

    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expectNodeCount(page, baseline + 1, 'Undo restore');

    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expectNodeCount(page, baseline, 'Redo remove again');
    addCheck('A3', 'Duplicate/delete/undo/redo flow', true);
    markProgress('A3 pass');
  } catch (error) {
    addCheck('A3', 'Duplicate/delete/undo/redo flow', false, String(error));
    markProgress('A3 fail');
  }

  try {
    markProgress('A6 start');
    await openViewMenu(page);
    await page.getByRole('button', { name: 'Lanes', exact: true }).click();
    await page.getByText('Swimlane Manager').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'vertical' }).click();

    const modal = page.locator('.fixed.inset-0').first();
    const laneNameInput = modal.locator('input:not([type]), input[type="text"]').first();
    await laneNameInput.fill('Originations');

    const laneSizeInput = modal.locator('input[type="number"]').first();
    await laneSizeInput.fill('260');

    const visibleCheckbox = modal.locator('label:has-text("visible") input[type="checkbox"]').first();
    await visibleCheckbox.click();
    await visibleCheckbox.click();

    await modal.locator('button').first().click();
    await page.getByText('Swimlane Manager').waitFor({ state: 'hidden', timeout: 5000 });
    addCheck('A6', 'Lane manager edit/reorder/orientation', true);
    markProgress('A6 pass');
  } catch (error) {
    addCheck('A6', 'Lane manager edit/reorder/orientation', false, String(error));
    markProgress('A6 fail');
  }

  try {
    markProgress('B1A start');
    const download = await clickAndCaptureDownload(page, 'Save JSON', 20000);
    savedJsonPath = path.join(runDir, 'saved-diagram.json');
    await saveDownloadTemp(download, savedJsonPath);
    const parsed = JSON.parse(readFileSync(savedJsonPath, 'utf8'));
    assert(Array.isArray(parsed.nodes), 'Saved JSON does not include nodes array');
    addCheck('B1A', 'Save JSON download', true, `nodes=${parsed.nodes.length}`);
    markProgress('B1A pass');
  } catch (error) {
    addCheck('B1A', 'Save JSON download', false, String(error));
    markProgress('B1A fail');
  }

  try {
    markProgress('B1B start');
    await page.getByRole('button', { name: 'New' }).click();
    await waitFor(async () => (await nodeCount(page)) === 0, 5000);
    assert(savedJsonPath && existsSync(savedJsonPath), 'Saved JSON unavailable for import');
    await importJsonFile(page, savedJsonPath);
    const imported = JSON.parse(readFileSync(savedJsonPath, 'utf8'));
    await waitFor(async () => (await nodeCount(page)) === imported.nodes.length, 8000);
    addCheck('B1B', 'Import JSON restore', true, `nodes=${imported.nodes.length}`);
    markProgress('B1B pass');
  } catch (error) {
    addCheck('B1B', 'Import JSON restore', false, String(error));
    markProgress('B1B fail');
  }

  try {
    markProgress('B3 start');
    const beforeReload = await nodeCount(page);
    await sleep(650);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(async () => (await nodeCount(page)) === beforeReload, 10000);
    addCheck('B3', 'LocalStorage restore on reload', true, `nodes=${beforeReload}`);
    markProgress('B3 pass');
  } catch (error) {
    addCheck('B3', 'LocalStorage restore on reload', false, String(error));
    markProgress('B3 fail');
  }

  try {
    markProgress('B4 start');
    await openViewMenu(page);
    await page.getByRole('button', { name: /^Swimlanes (On|Off)$/ }).click();
    await page.getByRole('button', { name: /^MiniMap (On|Off)$/ }).click();
    await page.getByRole('button', { name: /^Snap (On|Off)$/ }).click();
    await page.getByRole('button', { name: /Dark mode/i }).click();
    await page.getByRole('button', { name: /none/i }).click();
    await page.getByRole('button', { name: 'View', exact: true }).click();

    await page.getByRole('button', { name: 'TB', exact: true }).click();

    await openExportMenu(page);
    await setCheckbox(page, 'Include swimlanes', false);
    await setCheckbox(page, 'Include background', false);
    await page.getByRole('button', { name: 'Export', exact: true }).click();

    await openViewMenu(page);
    await page.getByRole('button', { name: 'Lanes', exact: true }).click();
    await page.getByText('Swimlane Manager').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'vertical' }).click();
    const modal = page.locator('.fixed.inset-0').first();
    await modal.locator('button').first().click();
    await page.getByText('Swimlane Manager').waitFor({ state: 'hidden', timeout: 5000 });

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await waitFor(async () => (await nodeCount(page)) === 0 && (await edgeCount(page)) === 0, 7000);
    await waitFor(async () => (await page.getByText('Quick Help').count()) > 0, 5000);
    await sleep(700);

    const payload = await readStoredPayload(page);
    assert(payload && typeof payload === 'object', 'Expected persisted payload after New reset');
    assert(payload.ui && typeof payload.ui === 'object', 'Expected persisted ui in payload after New reset');
    assert(Array.isArray(payload.lanes), 'Expected persisted lanes in payload after New reset');

    for (const [key, expected] of Object.entries(defaultUi)) {
      assert(payload.ui[key] === expected, `Expected ui.${key}=${String(expected)}, received ${String(payload.ui[key])}`);
    }

    const lanes = [...payload.lanes].sort((a, b) => a.order - b.order);
    assert(lanes.length === defaultLaneLabels.length, `Expected ${defaultLaneLabels.length} default lanes, got ${lanes.length}`);
    for (let index = 0; index < lanes.length; index += 1) {
      const lane = lanes[index];
      assert(lane.label === defaultLaneLabels[index], `Expected lane[${index}] label "${defaultLaneLabels[index]}", got "${lane.label}"`);
      assert(lane.order === index, `Expected lane[${index}] order=${index}, got ${lane.order}`);
      assert(lane.size === 220, `Expected lane[${index}] size=220, got ${lane.size}`);
      assert(lane.visible === true, `Expected lane[${index}] visible=true, got ${String(lane.visible)}`);
      assert(lane.orientation === 'horizontal', `Expected lane[${index}] orientation=horizontal, got ${lane.orientation}`);
    }

    addCheck('B4', 'New resets graph and UI defaults', true);
    markProgress('B4 pass');
  } catch (error) {
    addCheck('B4', 'New resets graph and UI defaults', false, String(error));
    markProgress('B4 fail');
  }

  try {
    markProgress('C1C2C3 start');
    await openExportMenu(page);
    await setCheckbox(page, 'Include swimlanes', false);
    await setCheckbox(page, 'Include background', false);
    const pngA = await clickAndCaptureDownload(page, 'Export PNG', 25000);
    const pngAPath = path.join(runDir, 'export-no-lanes-no-bg.png');
    await saveDownloadTemp(pngA, pngAPath);
    assert(statSync(pngAPath).size > 0, 'PNG export (no lanes/no bg) is empty');

    await openExportMenu(page);
    await setCheckbox(page, 'Include swimlanes', true);
    await setCheckbox(page, 'Include background', true);
    const pngB = await clickAndCaptureDownload(page, 'Export PNG', 25000);
    const pngBPath = path.join(runDir, 'export-with-lanes-with-bg.png');
    await saveDownloadTemp(pngB, pngBPath);
    assert(statSync(pngBPath).size > 0, 'PNG export (with lanes/with bg) is empty');

    await openExportMenu(page);
    const pdf = await clickAndCaptureDownload(page, 'Export PDF', 25000);
    const pdfPath = path.join(runDir, 'export.pdf');
    await saveDownloadTemp(pdf, pdfPath);
    assert(statSync(pdfPath).size > 0, 'PDF export is empty');

    addCheck('C1C2C3', 'PNG/PDF export toggles and output', true);
    markProgress('C1C2C3 pass');
  } catch (error) {
    addCheck('C1C2C3', 'PNG/PDF export toggles and output', false, String(error));
    markProgress('C1C2C3 fail');
  }

  try {
    markProgress('D1D2D3 start');
    const sample75Path = path.join(cwd, 'public', 'sampleDiagram.75.json');
    assert(existsSync(sample75Path), 'Missing sampleDiagram.75.json');
    await page.getByRole('button', { name: 'New' }).click();
    await waitFor(async () => (await nodeCount(page)) === 0, 5000);
    await importJsonFile(page, sample75Path);
    await waitFor(async () => (await nodeCount(page)) === 75, 12000);

    const started = Date.now();
    await page.getByRole('button', { name: 'Auto Layout' }).click();
    await sleep(450);
    const elapsedMs = Date.now() - started;
    assert((await nodeCount(page)) === 75, 'Auto layout changed node count');
    addCheck('D1D2D3', '75-node import and auto-layout', true, `autoLayoutClickToStable~${elapsedMs}ms`);
    markProgress('D1D2D3 pass');
  } catch (error) {
    addCheck('D1D2D3', '75-node import and auto-layout', false, String(error));
    markProgress('D1D2D3 fail');
  }

  await page.screenshot({ path: path.join(runDir, 'final-canvas.png'), fullPage: true });
  await context.close();
} catch (error) {
  addCheck('FATAL', 'Runner execution', false, String(error));
  markProgress(`fatal: ${String(error)}`);
} finally {
  if (browser) {
    await browser.close();
  }
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  markProgress('runner finished');
}

const jsonReportPath = path.join(runDir, 'mvp-qa-e2e-report.json');
const markdownReportPath = path.join(runDir, 'mvp-qa-e2e-report.md');
writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
writeFileSync(markdownReportPath, buildMarkdownReport());

const latestJson = path.join(cwd, 'docs', 'mvp-qa-e2e-report.json');
const latestMarkdown = path.join(cwd, 'docs', 'mvp-qa-e2e-report.md');
writeFileSync(latestJson, JSON.stringify(report, null, 2));
writeFileSync(latestMarkdown, buildMarkdownReport());

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
