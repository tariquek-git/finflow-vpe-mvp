import { useEffect, useRef } from 'react';
import type { BankEdge, BankNode, DiagramPayload, Swimlane, UISettings } from '../../types';
import { readFromStorage, writeToStorage } from '../../utils/io';

interface Params {
  nodes: BankNode[];
  edges: BankEdge[];
  lanes: Swimlane[];
  ui: UISettings;
  hydrate: (payload: DiagramPayload) => void;
  exportPayload: () => DiagramPayload;
}

export function useDiagramPersistence({ nodes, edges, lanes, ui, hydrate, exportPayload }: Params) {
  const hydratedRef = useRef(false);
  const hydrateRef = useRef(hydrate);
  const exportPayloadRef = useRef(exportPayload);

  useEffect(() => {
    hydrateRef.current = hydrate;
  }, [hydrate]);

  useEffect(() => {
    exportPayloadRef.current = exportPayload;
  }, [exportPayload]);

  useEffect(() => {
    const payload = readFromStorage();
    if (payload) {
      hydrateRef.current(payload);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      writeToStorage(exportPayloadRef.current());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [nodes, edges, lanes, ui]);
}
