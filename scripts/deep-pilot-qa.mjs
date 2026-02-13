import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const cwd = process.cwd();
const artifactRoot = path.join(cwd, 'qa-artifacts', 'deep-pilot');
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(artifactRoot, runStamp);
mkdirSync(runDir, { recursive: true });

const report = {
  date: new Date().toISOString(),
  baseUrl: '',
  checks: [],
  metrics: {},
  summary: {
    passed: 0,
    failed: 0,
  },
};

function addCheck(id, name, ok, details = '') {
  report.checks.push({ id, name, ok, details });
  if (ok) report.summary.passed += 1;
  else report.summary.failed += 1;
}

function mark(message) {
  console.log(`[pilot] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 4173;
      probe.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function waitFor(fn, timeoutMs = 10000, intervalMs = 100) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(intervalMs);
  }
  throw new Error('Timed out waiting for condition');
}

async function nodeCount(page) {
  return page.locator('.react-flow__node').count();
}

async function edgeCount(page) {
  return page.locator('.react-flow__edge').count();
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

async function setCheckbox(page, label, checked) {
  const checkbox = page.getByLabel(label);
  const current = await checkbox.isChecked();
  if (current !== checked) {
    await checkbox.click();
  }
}

async function saveDownload(page, buttonName, targetPath, timeoutMs = 20000) {
  const downloadPromise = page.waitForEvent('download', { timeout: timeoutMs });
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  const download = await downloadPromise;

  const tempPath = await download.path();
  if (tempPath) {
    copyFileSync(tempPath, targetPath);
  } else {
    await download.saveAs(targetPath);
  }
  assert(statSync(targetPath).size > 0, `${buttonName} produced empty output`);
}

function markdownStatus(ok) {
  return ok ? 'PASS' : 'FAIL';
}

async function findVisibleEdgePoint(page) {
  return await page.evaluate(() => {
    const flow = document.querySelector('.react-flow');
    if (!flow) {
      return null;
    }
    const flowRect = flow.getBoundingClientRect();
    const edges = Array.from(document.querySelectorAll('.react-flow__edge-interaction'));
    for (const edge of edges) {
      const rect = edge.getBoundingClientRect();
      if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y) || rect.width <= 1) {
        continue;
      }

      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const insideX = centerX > flowRect.left + 6 && centerX < flowRect.right - 6;
      const insideY = centerY > flowRect.top + 6 && centerY < flowRect.bottom - 6;
      if (insideX && insideY) {
        return { x: centerX, y: centerY };
      }
    }
    return null;
  });
}

async function findVisibleNodeTarget(page) {
  return await page.evaluate(() => {
    const flow = document.querySelector('.react-flow');
    if (!flow) {
      return null;
    }
    const flowRect = flow.getBoundingClientRect();
    const nodes = Array.from(document.querySelectorAll('.react-flow__node'));
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const insideX = centerX > flowRect.left + 20 && centerX < flowRect.right - 20;
      const insideY = centerY > flowRect.top + 20 && centerY < flowRect.bottom - 20;
      if (!insideX || !insideY) {
        continue;
      }
      const id = node.getAttribute('data-id');
      if (!id) {
        continue;
      }
      return { id, clickX: centerX, clickY: centerY };
    }
    return null;
  });
}

async function getNodeCenter(page, nodeId) {
  return await page.evaluate((id) => {
    const node = document.querySelector(`.react-flow__node[data-id="${id}"]`);
    if (!node) {
      return null;
    }
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
  }, nodeId);
}

function buildMarkdownReport() {
  const lines = [];
  lines.push('# Deep Pilot QA Report');
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
  lines.push('## Metrics');
  lines.push('');
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  if (report.metrics.autoLayoutRuns?.length) {
    lines.push(`- Auto-layout runs (ms): ${report.metrics.autoLayoutRuns.join(', ')}`);
    lines.push(`- Auto-layout avg (ms): ${report.metrics.autoLayoutAvgMs}`);
  }
  lines.push(`- Artifacts: \`qa-artifacts/deep-pilot/${runStamp}\``);
  lines.push('');
  return lines.join('\n');
}

let server;
let browser;

try {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  report.baseUrl = baseUrl;

  const serverLogPath = path.join(runDir, 'dev-server.log');
  const serverLogStream = fs.createWriteStream(serverLogPath, { flags: 'a' });

  server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  server.stdout.pipe(serverLogStream);
  server.stderr.pipe(serverLogStream);

  mark(`waiting for dev server at ${baseUrl}`);
  await waitForServer(baseUrl);
  mark('dev server ready');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1700, height: 1000 },
    acceptDownloads: true,
  });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  // DP1: Sample load and baseline graph presence
  try {
    await page.getByRole('button', { name: 'Load Sample', exact: true }).click();
    await waitFor(async () => (await nodeCount(page)) > 0 && (await edgeCount(page)) > 0, 10000);
    addCheck('DP1', 'Load Sample baseline', true, `nodes=${await nodeCount(page)} edges=${await edgeCount(page)}`);
  } catch (error) {
    addCheck('DP1', 'Load Sample baseline', false, String(error));
  }

  // DP2: Edge interaction reachable + inspector update
  try {
    let selectedEdge = false;
    for (let attempt = 0; attempt < 5 && !selectedEdge; attempt += 1) {
      const edgePoint = await findVisibleEdgePoint(page);
      assert(edgePoint, 'No in-viewport edge interaction point found');
      await page.mouse.click(edgePoint.x, edgePoint.y);
      await sleep(150);
      selectedEdge = (await page.locator('.react-flow__edge.selected').count()) > 0;
    }
    assert(selectedEdge, 'Unable to select edge after repeated in-viewport clicks');

    await page.locator('label:has-text("Rail")').waitFor({ timeout: 5000 });
    await page.locator('label:has-text("Rail") select').selectOption('RTP');
    await waitFor(
      async () => (await page.locator('.react-flow__edge-text').filter({ hasText: 'RTP' }).count()) > 0,
      5000,
    );

    addCheck('DP2', 'Edge reachable and editable after sample load', true);
  } catch (error) {
    addCheck('DP2', 'Edge reachable and editable after sample load', false, String(error));
  }

  // DP3: Save/import roundtrip + malformed file failure path
  let savedJsonPath = '';
  try {
    savedJsonPath = path.join(runDir, 'saved-pilot.json');
    await saveDownload(page, 'Save JSON', savedJsonPath);
    const parsed = JSON.parse(readFileSync(savedJsonPath, 'utf8'));
    const expectedNodes = Array.isArray(parsed.nodes) ? parsed.nodes.length : 0;
    const expectedEdges = Array.isArray(parsed.edges) ? parsed.edges.length : 0;
    assert(expectedNodes > 0, 'Saved payload has zero nodes');

    const invalidPath = path.join(runDir, 'malformed.json');
    writeFileSync(invalidPath, 'this is not valid json');
    await page.locator('input[type="file"]').first().setInputFiles(invalidPath);
    await page.getByText('Import failed: invalid schema').waitFor({ timeout: 5000 });

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await waitFor(async () => (await nodeCount(page)) === 0, 5000);

    await page.locator('input[type="file"]').first().setInputFiles(savedJsonPath);
    await waitFor(async () => (await nodeCount(page)) === expectedNodes, 8000);
    assert((await edgeCount(page)) === expectedEdges, 'Edge count mismatch after import');

    addCheck('DP3', 'Save/import roundtrip and malformed import handling', true, `nodes=${expectedNodes} edges=${expectedEdges}`);
  } catch (error) {
    addCheck('DP3', 'Save/import roundtrip and malformed import handling', false, String(error));
  }

  // DP4: Undo should revert graph edit while keeping camera transform
  try {
    // Let any post-import fitView normalization settle before this camera-sensitive check.
    await sleep(1500);

    const flow = page.locator('.react-flow').first();
    const flowBox = await flow.boundingBox();
    assert(Boolean(flowBox), 'Missing flow bounds');

    await page.mouse.move(flowBox.x + flowBox.width / 2, flowBox.y + flowBox.height / 2);
    await page.mouse.wheel(0, -1200);
    await sleep(250);

    const beforeLayoutPath = path.join(runDir, 'dp4-before-layout.json');
    const afterEditPath = path.join(runDir, 'dp4-after-edit.json');
    const afterUndoPath = path.join(runDir, 'dp4-after-undo.json');

    await saveDownload(page, 'Save JSON', beforeLayoutPath);
    let visibleNode = await findVisibleNodeTarget(page);
    assert(visibleNode, 'No in-viewport node found for DP4 edit');

    let selectedNodeId = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.mouse.click(visibleNode.clickX, visibleNode.clickY);
      await sleep(120);
      selectedNodeId = await page.evaluate(() => document.querySelector('.react-flow__node.selected')?.getAttribute('data-id'));
      if (selectedNodeId === visibleNode.id) {
        break;
      }
      visibleNode = await findVisibleNodeTarget(page);
      assert(visibleNode, 'Lost all in-viewport nodes while trying to select DP4 target');
    }
    assert(selectedNodeId === visibleNode.id, 'Could not select the intended in-viewport node for DP4');

    const beforeUndoCenter = await getNodeCenter(page, visibleNode.id);
    assert(beforeUndoCenter, 'Unable to capture DP4 node center before edit');

    const displayNameField = page.locator('label:has-text("Display Name") input');
    await displayNameField.fill('DP4 Camera Check');
    await waitFor(async () => (await page.getByText('DP4 Camera Check').count()) > 0, 5000);

    await saveDownload(page, 'Save JSON', afterEditPath);

    const beforeLayout = JSON.parse(readFileSync(beforeLayoutPath, 'utf8'));
    const afterEdit = JSON.parse(readFileSync(afterEditPath, 'utf8'));
    const editedNodeId = visibleNode.id;

    const beforeNode = (beforeLayout.nodes ?? []).find((node) => node.id === editedNodeId);
    const editedNode = (afterEdit.nodes ?? []).find((node) => node.id === editedNodeId);
    assert(beforeNode && editedNode, 'Unable to locate DP4 node in exported payloads');
    assert(beforeNode.data.displayName !== editedNode.data.displayName, 'Node edit did not change exported payload in DP4');

    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await saveDownload(page, 'Save JSON', afterUndoPath);

    const afterUndo = JSON.parse(readFileSync(afterUndoPath, 'utf8'));
    const undoNode = (afterUndo.nodes ?? []).find((node) => node.id === editedNodeId);
    assert(undoNode, 'Unable to locate DP4 node after undo');
    assert(
      undoNode.data.displayName === beforeNode.data.displayName,
      'Undo did not restore pre-edit node data in DP4',
    );

    const afterUndoCenter = await getNodeCenter(page, visibleNode.id);
    assert(afterUndoCenter, 'Unable to capture DP4 node center after undo');
    const deltaX = Math.abs(afterUndoCenter.x - beforeUndoCenter.x);
    const deltaY = Math.abs(afterUndoCenter.y - beforeUndoCenter.y);
    assert(deltaX <= 1.5 && deltaY <= 1.5, `Camera moved after undo (deltaX=${deltaX}, deltaY=${deltaY})`);

    addCheck('DP4', 'Undo graph only, keep camera zoom/pan', true);
  } catch (error) {
    addCheck('DP4', 'Undo graph only, keep camera zoom/pan', false, String(error));
  }

  // DP5: UI-only state should not be undone
  try {
    await page.getByRole('button', { name: 'Auto Layout', exact: true }).click();
    await waitFor(async () => !(await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled()), 4000);

    await openViewMenu(page);
    await page.getByRole('button', { name: /^MiniMap (On|Off)$/ }).click();
    const miniMap = page.locator('.react-flow__minimap');
    await waitFor(async () => (await miniMap.count()) > 0, 4000);

    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await sleep(250);
    assert((await miniMap.count()) > 0, 'MiniMap toggle got undone');

    addCheck('DP5', 'UI-only toggle excluded from undo history', true);
  } catch (error) {
    addCheck('DP5', 'UI-only toggle excluded from undo history', false, String(error));
  }

  // DP6: Export variants
  try {
    await openExportMenu(page);
    await setCheckbox(page, 'Include swimlanes', false);
    await setCheckbox(page, 'Include background', false);
    await saveDownload(page, 'Export PNG', path.join(runDir, 'export-no-lanes-no-bg.png'));

    await openExportMenu(page);
    await setCheckbox(page, 'Include swimlanes', true);
    await setCheckbox(page, 'Include background', true);
    await saveDownload(page, 'Export PNG', path.join(runDir, 'export-with-lanes-with-bg.png'));

    await openExportMenu(page);
    await saveDownload(page, 'Export PDF', path.join(runDir, 'export.pdf'));

    addCheck('DP6', 'PNG/PDF exports with toggle variants', true);
  } catch (error) {
    addCheck('DP6', 'PNG/PDF exports with toggle variants', false, String(error));
  }

  // DP7: 75-node stress and repeated auto-layout
  try {
    const sample75Path = path.join(cwd, 'public', 'sampleDiagram.75.json');
    assert(existsSync(sample75Path), 'Missing sampleDiagram.75.json');

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await waitFor(async () => (await nodeCount(page)) === 0, 5000);

    await page.locator('input[type="file"]').first().setInputFiles(sample75Path);
    await waitFor(async () => (await nodeCount(page)) === 75, 12000);

    const runs = [];
    for (let i = 0; i < 5; i += 1) {
      const started = Date.now();
      await page.getByRole('button', { name: 'Auto Layout', exact: true }).click();
      await sleep(500);
      assert((await nodeCount(page)) === 75, 'Auto layout changed node count');
      runs.push(Date.now() - started);
    }

    report.metrics.autoLayoutRuns = runs;
    report.metrics.autoLayoutAvgMs = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);

    addCheck('DP7', '75-node stress and repeated auto-layout', true, `avg=${report.metrics.autoLayoutAvgMs}ms`);
  } catch (error) {
    addCheck('DP7', '75-node stress and repeated auto-layout', false, String(error));
  }

  // DP8: Persistence across reload
  try {
    const beforeReload = await nodeCount(page);
    await sleep(700);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(async () => (await nodeCount(page)) === beforeReload, 10000);

    addCheck('DP8', 'Persistence restore on reload', true, `nodes=${beforeReload}`);
  } catch (error) {
    addCheck('DP8', 'Persistence restore on reload', false, String(error));
  }

  // DP9: beforeunload lifecycle guard
  try {
    let sawBeforeUnloadDialog = false;
    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') {
        sawBeforeUnloadDialog = true;
      }
      await dialog.dismiss();
    });

    await page.close({ runBeforeUnload: true });
    await sleep(300);

    assert(sawBeforeUnloadDialog, 'Did not receive beforeunload dialog on close lifecycle');

    addCheck('DP9', 'beforeunload guard via real browser lifecycle', true);
  } catch (error) {
    addCheck('DP9', 'beforeunload guard via real browser lifecycle', false, String(error));
  }

  if (!page.isClosed()) {
    await page.screenshot({ path: path.join(runDir, 'final-state.png'), fullPage: true });
  }

  await context.close();
} catch (error) {
  addCheck('FATAL', 'Deep pilot runner execution', false, String(error));
} finally {
  if (browser) {
    await browser.close();
  }
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  mark('runner finished');
}

const jsonReportPath = path.join(runDir, 'deep-pilot-summary.json');
const markdownReportPath = path.join(runDir, 'deep-pilot-summary.md');
writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
writeFileSync(markdownReportPath, buildMarkdownReport());

console.log(`RUN_DIR=${runDir}`);
console.log(`PASSED=${report.summary.passed}`);
console.log(`FAILED=${report.summary.failed}`);

if (report.summary.failed > 0) {
  process.exitCode = 1;
}
