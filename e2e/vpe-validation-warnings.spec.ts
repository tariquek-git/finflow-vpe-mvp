import { expect, test, type Download } from '@playwright/test';

const readDownloadText = async (download: Download) => {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Could not read exported file stream.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

test('export warns when unconnected nodes are present', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'finflow-builder.diagram.v1',
      JSON.stringify({
        nodes: [
          {
            id: 'starter-sponsor',
            type: 'Sponsor Bank',
            label: 'Sponsor Bank',
            shape: 'rectangle',
            position: { x: 360, y: 320 }
          },
          {
            id: 'starter-processor',
            type: 'Processor',
            label: 'Processor',
            shape: 'rectangle',
            position: { x: 680, y: 320 }
          },
          {
            id: 'orphan-node',
            type: 'Processor',
            label: 'Orphan Node',
            shape: 'rectangle',
            position: { x: 1180, y: 620 }
          }
        ],
        edges: [
          {
            id: 'starter-edge-1',
            sourceId: 'starter-sponsor',
            targetId: 'starter-processor',
            sourcePortIdx: 1,
            targetPortIdx: 3,
            rail: 'ACH',
            direction: 'Push (Credit)',
            label: 'Funding',
            isFX: false,
            thickness: 2,
            style: 'solid',
            showArrowHead: true,
            pathType: 'bezier'
          }
        ],
        drawings: []
      })
    );
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await Promise.all([page.waitForEvent('download'), page.getByTestId('toolbar-export-json').click()]);
  await expect(
    page.getByTestId('toast-message').filter({ hasText: 'Validation warning: 1 unconnected node in export.' })
  ).toBeVisible();
});

test('export warns when circular loops are present', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'finflow-builder.diagram.v1',
      JSON.stringify({
        nodes: [
          {
            id: 'node-a',
            type: 'Processor',
            label: 'Node A',
            shape: 'rectangle',
            position: { x: 300, y: 300 }
          },
          {
            id: 'node-b',
            type: 'Processor',
            label: 'Node B',
            shape: 'rectangle',
            position: { x: 640, y: 300 }
          }
        ],
        edges: [
          {
            id: 'edge-a-b',
            sourceId: 'node-a',
            targetId: 'node-b',
            sourcePortIdx: 1,
            targetPortIdx: 3,
            rail: '',
            direction: 'Push (Credit)',
            label: 'Forward',
            isFX: false,
            thickness: 2,
            style: 'solid',
            showArrowHead: true,
            pathType: 'bezier'
          },
          {
            id: 'edge-b-a',
            sourceId: 'node-b',
            targetId: 'node-a',
            sourcePortIdx: 3,
            targetPortIdx: 1,
            rail: '',
            direction: 'Push (Credit)',
            label: 'Reverse',
            isFX: false,
            thickness: 2,
            style: 'solid',
            showArrowHead: true,
            pathType: 'bezier'
          }
        ],
        drawings: []
      })
    );
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('toolbar-export-json').click()]);
  const exportedText = await readDownloadText(download);
  const parsed = JSON.parse(exportedText) as { diagram: { edges: unknown[] } };
  expect(parsed.diagram.edges.length).toBe(2);
  await expect(
    page.getByTestId('toast-message').filter({ hasText: 'Validation warning: Circular loop detected in flow graph.' })
  ).toBeVisible();
});
