import { Command } from 'cmdk';
import {
  CircleDot,
  CloudMoon,
  Download,
  FileInput,
  FileText,
  Grid3X3,
  Layers3,
  ListFilter,
  Map,
  MoonStar,
  MousePointer2,
  Plus,
  Save,
  Search,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';
import type { BackgroundStyle, NodeKind } from '../../core/types';

interface PaletteNode {
  id: string;
  displayName: string;
  nodeType: NodeKind;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: PaletteNode[];
  nodeKinds: NodeKind[];
  backgroundMode: BackgroundStyle;
  darkMode: boolean;
  showSwimlanes: boolean;
  snapToGrid: boolean;
  showMiniMap: boolean;
  onNew: () => void;
  onSave: () => void;
  onImport: () => void;
  onSample: () => void;
  onPng: () => void;
  onPdf: () => void;
  onAddNode: (kind: NodeKind) => void;
  onFocusNode: (id: string) => void;
  onToggleDark: () => void;
  onToggleSwimlanes: () => void;
  onToggleSnap: () => void;
  onToggleMiniMap: () => void;
  onSetBackground: (mode: BackgroundStyle) => void;
}

function run(close: () => void, action: () => void) {
  action();
  close();
}

export function CommandPalette(props: Props) {
  const close = () => props.onOpenChange(false);

  return (
    <Command.Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      label="Finflow Command Palette"
      className="cmdk-dialog"
      overlayClassName="cmdk-overlay"
    >
      <div className="cmdk-shell">
        <div className="cmdk-input-wrap">
          <Search size={14} className="text-slate-400" />
          <Command.Input className="cmdk-input" placeholder="Type a command or search nodes..." />
        </div>

        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">No command found.</Command.Empty>

          <Command.Group heading="Diagram">
            <Command.Item onSelect={() => run(close, props.onNew)}>
              <Plus size={14} />
              New diagram
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onSave)}>
              <Save size={14} />
              Save JSON
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onImport)}>
              <Upload size={14} />
              Import JSON
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onSample)}>
              <FileInput size={14} />
              Load sample
            </Command.Item>
          </Command.Group>

          <Command.Separator />

          <Command.Group heading="Export">
            <Command.Item onSelect={() => run(close, props.onPng)}>
              <Download size={14} />
              Export PNG
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onPdf)}>
              <FileText size={14} />
              Export PDF
            </Command.Item>
          </Command.Group>

          <Command.Separator />

          <Command.Group heading="View">
            <Command.Item onSelect={() => run(close, props.onToggleDark)}>
              {props.darkMode ? <Sun size={14} /> : <MoonStar size={14} />}
              {props.darkMode ? 'Disable dark mode' : 'Enable dark mode'}
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onToggleSwimlanes)}>
              <Layers3 size={14} />
              {props.showSwimlanes ? 'Hide swimlanes' : 'Show swimlanes'}
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onToggleSnap)}>
              <MousePointer2 size={14} />
              {props.snapToGrid ? 'Disable snap' : 'Enable snap'}
            </Command.Item>
            <Command.Item onSelect={() => run(close, props.onToggleMiniMap)}>
              <Map size={14} />
              {props.showMiniMap ? 'Hide minimap' : 'Show minimap'}
            </Command.Item>
            <Command.Item onSelect={() => run(close, () => props.onSetBackground('grid'))}>
              <Grid3X3 size={14} />
              Background: Grid
              {props.backgroundMode === 'grid' && <Sparkles size={12} className="ml-auto text-cyan-500" />}
            </Command.Item>
            <Command.Item onSelect={() => run(close, () => props.onSetBackground('dots'))}>
              <CircleDot size={14} />
              Background: Dots
              {props.backgroundMode === 'dots' && <Sparkles size={12} className="ml-auto text-cyan-500" />}
            </Command.Item>
            <Command.Item onSelect={() => run(close, () => props.onSetBackground('none'))}>
              <CloudMoon size={14} />
              Background: None
              {props.backgroundMode === 'none' && <Sparkles size={12} className="ml-auto text-cyan-500" />}
            </Command.Item>
          </Command.Group>

          <Command.Separator />

          <Command.Group heading="Add Node">
            {props.nodeKinds.map((kind) => (
              <Command.Item key={kind} onSelect={() => run(close, () => props.onAddNode(kind))}>
                <Plus size={14} />
                {kind}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator />

          <Command.Group heading="Jump To Node">
            {props.nodes.length ? (
              props.nodes.map((node) => (
                <Command.Item key={node.id} onSelect={() => run(close, () => props.onFocusNode(node.id))}>
                  <ListFilter size={14} />
                  {node.displayName}
                  <span className="ml-auto text-[11px] text-slate-400">{node.nodeType}</span>
                </Command.Item>
              ))
            ) : (
              <Command.Item disabled>
                <Search size={14} />
                No nodes on canvas yet
              </Command.Item>
            )}
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
