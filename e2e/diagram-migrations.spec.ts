import { expect, test } from '@playwright/test';
import {
  GRAPH_SCHEMA_VERSION,
  createExportPayload,
  migrateGraphToLatest,
  parseImportPayload,
  sanitizeDiagramSnapshot
} from '../lib/diagramIO';
import { buildDescriptionWithNodeMeta, createEmptyNodeMeta } from '../lib/nodeMeta';
import {
  EntityType,
  FlowDirection,
  NodeShape,
  PaymentRail,
  type DiagramSnapshot,
  type LayoutSettings
} from '../types';

test('migrateGraphToLatest maps legacy notes and legacy accountType into canonical node.data fields', () => {
  const legacyGraph = {
    nodes: [
      {
        id: 'legacy-sponsor',
        type: EntityType.SPONSOR_BANK,
        label: 'Legacy Sponsor',
        shape: NodeShape.RECTANGLE,
        position: { x: 120, y: 200 },
        accountType: 'FBO',
        data: {
          documentation: 'legacy node notes'
        }
      },
      {
        id: 'legacy-processor',
        type: EntityType.PROCESSOR,
        label: 'Legacy Processor',
        shape: NodeShape.RECTANGLE,
        position: { x: 420, y: 200 }
      }
    ],
    edges: [
      {
        id: 'legacy-edge',
        sourceId: 'legacy-sponsor',
        targetId: 'legacy-processor',
        rail: PaymentRail.ACH,
        direction: FlowDirection.PUSH,
        label: 'Legacy funding',
        data: {
          note: 'legacy edge notes'
        }
      }
    ],
    drawings: []
  };

  const migrated = migrateGraphToLatest(legacyGraph);
  const snapshot = sanitizeDiagramSnapshot(migrated);
  expect(snapshot).not.toBeNull();

  const normalized = snapshot as DiagramSnapshot;
  expect(normalized.schemaVersion).toBe(GRAPH_SCHEMA_VERSION);

  const sponsor = normalized.nodes.find((node) => node.id === 'legacy-sponsor');
  expect(sponsor?.data?.notes).toBe('legacy node notes');
  expect(sponsor?.data?.accountType).toBe('FBO');

  const edge = normalized.edges.find((candidate) => candidate.id === 'legacy-edge');
  expect(edge?.data?.notes).toBe('legacy edge notes');
});

test('export/import round-trip preserves raw notes and keeps metadata in description', () => {
  const meta = createEmptyNodeMeta();
  meta.tags = 'ops,critical';
  meta.externalRefs = 'REF-1234';

  const nodeNotes = 'Raw runbook notes [[finflow-meta]] tags=leave-as-text';
  const edgeNotes = 'Edge operational notes without metadata parsing';

  const snapshot: DiagramSnapshot = {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: 'n1',
        type: EntityType.SPONSOR_BANK,
        label: 'Sponsor Bank',
        shape: NodeShape.RECTANGLE,
        position: { x: 120, y: 120 },
        description: buildDescriptionWithNodeMeta(meta, 'Description context'),
        data: {
          notes: nodeNotes,
          accountType: 'FBO',
          customFlag: 'keep-me'
        }
      },
      {
        id: 'n2',
        type: EntityType.PROCESSOR,
        label: 'Processor',
        shape: NodeShape.RECTANGLE,
        position: { x: 420, y: 120 },
        data: {
          notes: ''
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        sourceId: 'n1',
        targetId: 'n2',
        sourcePortIdx: 1,
        targetPortIdx: 3,
        rail: PaymentRail.ACH,
        direction: FlowDirection.PUSH,
        label: 'Funding',
        isFX: false,
        style: 'solid',
        showArrowHead: true,
        pathType: 'bezier',
        thickness: 2,
        data: {
          notes: edgeNotes,
          customMetric: 42
        }
      }
    ],
    drawings: []
  };

  const layout: LayoutSettings = {
    showSwimlanes: true,
    swimlaneLabels: ['Lane 1', 'Lane 2'],
    gridMode: 'dots',
    isDarkMode: false,
    showPorts: true
  };

  const payload = createExportPayload(snapshot, layout, {
    workspaceId: 'ws-test',
    shortWorkspaceId: 'WSTEST',
    name: 'Test Workspace',
    schemaVersion: GRAPH_SCHEMA_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  });

  const parsed = parseImportPayload(JSON.parse(JSON.stringify(payload)));
  expect(parsed).not.toBeNull();

  const imported = parsed as NonNullable<typeof parsed>;
  const sponsor = imported.diagram.nodes.find((node) => node.id === 'n1');
  const edge = imported.diagram.edges.find((candidate) => candidate.id === 'e1');

  expect(sponsor?.description || '').toContain('[[finflow-meta]]');
  expect(sponsor?.description || '').toContain('tags=ops,critical');
  expect(sponsor?.data?.notes).toBe(nodeNotes);
  expect(sponsor?.data?.notes || '').not.toContain('externalRefs=');
  expect(sponsor?.data?.customFlag).toBe('keep-me');

  expect(edge?.data?.notes).toBe(edgeNotes);
  expect(edge?.data?.customMetric).toBe(42);
});
