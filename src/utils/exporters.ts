import { getNodesBounds } from '@xyflow/react';
import type { BankNode } from '../types';

interface ExportOptions {
  nodes: BankNode[];
  viewport: HTMLElement;
  includeSwimlanes: boolean;
  includeBackground: boolean;
  darkMode: boolean;
}

function filterElement(includeSwimlanes: boolean, includeBackground: boolean) {
  return (node: HTMLElement) => {
    if (!includeBackground && node.classList?.contains('react-flow__background')) {
      return false;
    }

    if (!includeSwimlanes && node.closest?.('[data-swimlane-overlay="true"]')) {
      return false;
    }

    return true;
  };
}

export function computeExportFrame(nodes: BankNode[]) {
  if (!nodes.length) {
    return {
      width: 1200,
      height: 720,
      transform: 'translate(0px, 0px) scale(1)',
    };
  }

  const bounds = getNodesBounds(nodes);
  const padding = 100;
  const width = Math.max(420, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(320, Math.ceil(bounds.height + padding * 2));
  const transform = `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`;

  return { width, height, transform };
}

export async function captureDiagramPng(options: ExportOptions): Promise<{ dataUrl: string; width: number; height: number }> {
  const { toPng } = await import('html-to-image');
  const frame = computeExportFrame(options.nodes);
  const dataUrl = await toPng(options.viewport, {
    width: frame.width,
    height: frame.height,
    backgroundColor: options.includeBackground
      ? options.darkMode
        ? '#0f172a'
        : '#ffffff'
      : 'rgba(255,255,255,0)',
    pixelRatio: 2,
    filter: filterElement(options.includeSwimlanes, options.includeBackground),
    style: {
      width: `${frame.width}px`,
      height: `${frame.height}px`,
      transform: frame.transform,
      transformOrigin: '0 0',
    },
  });

  return {
    dataUrl,
    width: frame.width,
    height: frame.height,
  };
}

export function downloadPng(dataUrl: string, fileName = 'banking-diagram.png'): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

export async function exportPdf(options: ExportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const png = await captureDiagramPng(options);
  const orientation = png.width >= png.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [png.width, png.height],
  });

  pdf.addImage(png.dataUrl, 'PNG', 0, 0, png.width, png.height);
  pdf.save('banking-diagram.pdf');
}
