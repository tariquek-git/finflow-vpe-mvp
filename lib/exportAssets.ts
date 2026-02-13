import { jsPDF } from 'jspdf';
import { toPng, toSvg } from 'html-to-image';
import { EntityType, Node, NodeShape } from '../types';

const EXPORT_PADDING = 120;
const DEFAULT_VIEWPORT = { minX: -400, minY: -260, maxX: 1200, maxY: 860 };

const getNodeDimensions = (node: Node): { width: number; height: number } => {
  if (node.type === EntityType.ANCHOR) {
    return { width: 16, height: 16 };
  }

  const width =
    node.width || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : 180);
  const height =
    node.height || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : 60);
  return { width, height };
};

const getDiagramBounds = (nodes: Node[]) => {
  if (nodes.length === 0) {
    return DEFAULT_VIEWPORT;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return DEFAULT_VIEWPORT;
  }

  return { minX, minY, maxX, maxY };
};

const buildExportViewportStyle = (nodes: Node[]) => {
  const bounds = getDiagramBounds(nodes);
  const width = Math.ceil(bounds.maxX - bounds.minX + EXPORT_PADDING * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + EXPORT_PADDING * 2);

  const targetWidth = Math.max(width, 960);
  const targetHeight = Math.max(height, 640);

  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const fitZoom = Math.min((targetWidth - EXPORT_PADDING * 2) / worldWidth, (targetHeight - EXPORT_PADDING * 2) / worldHeight);

  const tx = EXPORT_PADDING - bounds.minX * fitZoom;
  const ty = EXPORT_PADDING - bounds.minY * fitZoom;

  return {
    width: targetWidth,
    height: targetHeight,
    transform: `translate(${tx}px, ${ty}px) scale(${fitZoom})`
  };
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (event) => reject(event);
    image.src = src;
  });

export type ExportImageOptions = {
  worldElement: HTMLElement;
  nodes: Node[];
  isDarkMode: boolean;
  includeBackground?: boolean;
};

export const exportDiagramToPngDataUrl = async ({
  worldElement,
  nodes,
  isDarkMode,
  includeBackground = true
}: ExportImageOptions): Promise<string> => {
  const viewport = buildExportViewportStyle(nodes);

  return toPng(worldElement, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: includeBackground ? (isDarkMode ? '#0b1220' : '#f8fafc') : 'transparent',
    width: viewport.width,
    height: viewport.height,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.dataset.exportIgnore === 'true') return false;
      return true;
    },
    style: {
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      transform: viewport.transform,
      transformOrigin: '0 0'
    }
  });
};

export const exportDiagramToSvgDataUrl = async ({
  worldElement,
  nodes,
  isDarkMode,
  includeBackground = true
}: ExportImageOptions): Promise<string> => {
  const viewport = buildExportViewportStyle(nodes);

  return toSvg(worldElement, {
    cacheBust: true,
    backgroundColor: includeBackground ? (isDarkMode ? '#0b1220' : '#f8fafc') : 'transparent',
    width: viewport.width,
    height: viewport.height,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.dataset.exportIgnore === 'true') return false;
      return true;
    },
    style: {
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      transform: viewport.transform,
      transformOrigin: '0 0'
    }
  });
};

const downloadDataUrl = (dataUrl: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
};

export const downloadPngExport = async (
  options: ExportImageOptions,
  filename = `finflow-diagram-${Date.now()}.png`
) => {
  const dataUrl = await exportDiagramToPngDataUrl(options);
  downloadDataUrl(dataUrl, filename);
};

export const downloadPdfExport = async (
  options: ExportImageOptions,
  filename = `finflow-diagram-${Date.now()}.pdf`
) => {
  const dataUrl = await exportDiagramToPngDataUrl(options);
  const image = await loadImage(dataUrl);
  const isLandscape = image.width >= image.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'px',
    format: [image.width, image.height]
  });

  pdf.addImage(dataUrl, 'PNG', 0, 0, image.width, image.height);
  pdf.save(filename);
};

export const downloadSvgExport = async (
  options: ExportImageOptions,
  filename = `finflow-diagram-${Date.now()}.svg`
) => {
  const dataUrl = await exportDiagramToSvgDataUrl(options);
  downloadDataUrl(dataUrl, filename);
};
