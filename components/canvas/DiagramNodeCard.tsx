import React, { useMemo } from 'react';
import { ENDPOINT_ICONS, ENTITY_ICONS } from '../../constants';
import { AccountType, EndPointType, EntityType, Node } from '../../types';
import { ANCHOR_SIZE, getNodeDimensions } from './canvasGeometry';

type ConnectState = 'idle' | 'source' | 'candidate';

type DiagramNodeCardProps = {
  node: Node;
  compactMode: boolean;
  showBodyMeta: boolean;
  showFooter: boolean;
  isSelected: boolean;
  isDarkMode: boolean;
  showPorts: boolean;
  connectState: ConnectState;
  onMouseDown: (event: React.MouseEvent, id: string) => void;
  onClick: (event: React.MouseEvent, id: string) => void;
  onPortClick: (event: React.MouseEvent, id: string, portIdx: number) => void;
};

const PORT_HIT_SIZE = 26;
const PORT_HALF = PORT_HIT_SIZE / 2;
const PORT_DOT_SIZE = 10;

const getBadge = (node: Node): string | null => {
  if (node.accountType === AccountType.FBO) return 'FBO';

  switch (node.type) {
    case EntityType.ISSUING_BANK:
      return 'Issuer';
    case EntityType.SPONSOR_BANK:
      return 'Sponsor';
    case EntityType.NETWORK:
      return 'Network';
    case EntityType.LIQUIDITY_PROVIDER:
      return 'Ledger';
    case EntityType.GATE:
      return 'Control';
    default:
      return null;
  }
};

const getNodeFamily = (type: EntityType): 'bank' | 'ops' | 'control' | 'endpoint' | 'other' => {
  if (
    type === EntityType.SPONSOR_BANK ||
    type === EntityType.ISSUING_BANK ||
    type === EntityType.ACQUIRING_BANK ||
    type === EntityType.CENTRAL_BANK ||
    type === EntityType.CREDIT_UNION ||
    type === EntityType.CORRESPONDENT_BANK
  ) {
    return 'bank';
  }
  if (
    type === EntityType.PROCESSOR ||
    type === EntityType.NETWORK ||
    type === EntityType.GATEWAY ||
    type === EntityType.SWITCH ||
    type === EntityType.WALLET_PROVIDER ||
    type === EntityType.PROGRAM_MANAGER ||
    type === EntityType.LIQUIDITY_PROVIDER
  ) {
    return 'ops';
  }
  if (type === EntityType.GATE) {
    return 'control';
  }
  if (type === EntityType.END_POINT) {
    return 'endpoint';
  }
  return 'other';
};

const inferStatusChips = (node: Node): string[] => {
  const statuses: string[] = [];

  if (
    node.type === EntityType.END_POINT ||
    node.type === EntityType.ISSUING_BANK ||
    node.type === EntityType.PROGRAM_MANAGER
  ) {
    statuses.push('KYC');
  }

  if (
    node.type === EntityType.GATE ||
    node.type === EntityType.PROCESSOR ||
    node.type === EntityType.SPONSOR_BANK ||
    node.type === EntityType.NETWORK
  ) {
    statuses.push('AML');
  }

  if (
    node.type === EntityType.LIQUIDITY_PROVIDER ||
    node.accountType === AccountType.SETTLEMENT ||
    node.accountType === AccountType.RESERVE ||
    node.type === EntityType.CENTRAL_BANK
  ) {
    statuses.push('Settlement');
  }

  return statuses;
};

const statusDotClass = (status: string, isDarkMode: boolean) => {
  if (status === 'AML') {
    return isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500';
  }
  if (status === 'KYC') {
    return isDarkMode ? 'bg-amber-300' : 'bg-amber-500';
  }
  if (status === 'Settlement') {
    return isDarkMode ? 'bg-sky-300' : 'bg-sky-500';
  }
  return isDarkMode ? 'bg-slate-300' : 'bg-slate-500';
};

const getFamilyClasses = (family: ReturnType<typeof getNodeFamily>, isDarkMode: boolean) => {
  if (family === 'bank') {
    return isDarkMode
      ? 'border-slate-500 bg-slate-900/92'
      : 'border-slate-300 bg-white';
  }
  if (family === 'ops') {
    return isDarkMode
      ? 'border-cyan-500/35 bg-slate-900/92'
      : 'border-cyan-200 bg-white';
  }
  if (family === 'control') {
    return isDarkMode
      ? 'border-rose-500/35 bg-slate-900/92'
      : 'border-rose-200 bg-white';
  }
  if (family === 'endpoint') {
    return isDarkMode
      ? 'border-violet-500/35 bg-slate-900/92'
      : 'border-violet-200 bg-white';
  }
  return isDarkMode
    ? 'border-slate-700 bg-slate-900/92'
    : 'border-slate-200 bg-white';
};

const getHeaderStripClass = (family: ReturnType<typeof getNodeFamily>) => {
  if (family === 'bank') return 'from-slate-500/45 to-slate-400/5';
  if (family === 'ops') return 'from-cyan-500/40 to-cyan-400/8';
  if (family === 'control') return 'from-rose-500/38 to-rose-400/8';
  if (family === 'endpoint') return 'from-violet-500/38 to-violet-400/8';
  return 'from-slate-500/35 to-slate-400/8';
};

const getRadiusClass = (family: ReturnType<typeof getNodeFamily>) => {
  if (family === 'control') return 'rounded-[14px]';
  if (family === 'endpoint') return 'rounded-[18px]';
  return 'rounded-[16px]';
};

const DiagramNodeCardComponent: React.FC<DiagramNodeCardProps> = ({
  node,
  compactMode,
  showBodyMeta,
  showFooter,
  isSelected,
  isDarkMode,
  showPorts,
  connectState,
  onMouseDown,
  onClick,
  onPortClick
}) => {
  const family = getNodeFamily(node.type);
  const semanticBadge = getBadge(node);
  const statuses = useMemo(() => inferStatusChips(node), [node]);

  if (node.type === EntityType.ANCHOR) {
    return (
      <div
        className={`absolute cursor-grab rounded-full border shadow-sm transition-transform duration-150 hover:scale-125 active:cursor-grabbing ${
          connectState === 'source'
            ? 'border-emerald-300 bg-emerald-500 ring-2 ring-emerald-300/80'
            : isSelected
              ? 'bg-cyan-500 ring-2 ring-cyan-300'
              : connectState === 'candidate'
                ? 'border-sky-400 bg-sky-100 ring-2 ring-sky-300/80 dark:bg-sky-500/20'
                : node.isConnectorHandle
                  ? 'border-cyan-400 bg-cyan-100 dark:bg-cyan-500/20'
                  : isDarkMode
                    ? 'border-slate-500 bg-slate-500'
                    : 'border-slate-400 bg-slate-400'
        }`}
        style={{ left: node.position.x, top: node.position.y, width: ANCHOR_SIZE, height: ANCHOR_SIZE, zIndex: 100 }}
        onMouseDown={(event) => onMouseDown(event, node.id)}
      />
    );
  }

  const { width, height } = getNodeDimensions(node);
  const iconNode =
    node.type === EntityType.END_POINT && node.endPointType
      ? ENDPOINT_ICONS[node.endPointType as EndPointType]
      : ENTITY_ICONS[node.type];

  return (
    <div
      className={`group absolute flex flex-col border shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition-[transform,box-shadow,border-color,opacity] duration-150 ${getRadiusClass(
        family
      )} ${getFamilyClasses(family, isDarkMode)} ${
        connectState === 'source'
          ? 'scale-[1.02] border-emerald-500 ring-2 ring-emerald-300/85 shadow-xl'
          : isSelected
            ? 'scale-[1.02] border-cyan-600 ring-2 ring-cyan-500 shadow-xl'
            : connectState === 'candidate'
              ? 'border-sky-400 ring-2 ring-sky-300/80'
              : 'hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)]'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width,
        minHeight: height,
        zIndex: isSelected ? 99 : 10
      }}
      data-node-id={node.id}
      data-node-label={node.label}
      onMouseDown={(event) => onMouseDown(event, node.id)}
      onClick={(event) => onClick(event, node.id)}
    >
      <div className={`h-1.5 w-full rounded-t-[inherit] bg-gradient-to-r ${getHeaderStripClass(family)}`} />

      {compactMode ? (
        <div className="flex min-h-[44px] items-center gap-1.5 px-2 py-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <span className="scale-90">{iconNode}</span>
          </div>
          <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{node.label}</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 px-2.5 pb-1 pt-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              {iconNode}
            </div>
            <div className="min-w-0 flex flex-1 items-start justify-between gap-2">
              <div className="truncate pt-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100">{node.label}</div>
              {semanticBadge ? (
                <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {semanticBadge}
                </div>
              ) : null}
            </div>
          </div>

          {showBodyMeta ? (
            <div
              data-testid={`node-meta-${node.id}`}
              className="border-t border-slate-200/90 px-2.5 py-1 text-[9px] text-slate-500 dark:border-slate-700/90 dark:text-slate-400"
            >
              {node.accountType ? (
                <div className="truncate">
                  <span className="font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-300">Ledger</span>{' '}
                  {node.accountType}
                </div>
              ) : (
                <div className="truncate">{node.type}</div>
              )}
            </div>
          ) : null}

          {showFooter && statuses.length > 0 ? (
            <div
              data-testid={`node-status-${node.id}`}
              className="flex items-center gap-1.5 border-t border-slate-200/90 px-2.5 py-0.5 dark:border-slate-700/90"
            >
              {statuses.slice(0, 3).map((status) => (
                <div
                  key={`${node.id}-${status}`}
                  title={status}
                  aria-label={`${status} status`}
                  className="inline-flex items-center gap-1"
                >
                  <span className={`h-2 w-2 rounded-full ${statusDotClass(status, isDarkMode)}`} />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {showPorts
        ? [0, 1, 2, 3].map((portIdx) => (
            <button
              key={portIdx}
              type="button"
              className={`absolute z-50 rounded-full border shadow-sm transition-all ${
                connectState === 'source'
                  ? 'border-emerald-200 bg-emerald-500/25'
                  : connectState === 'candidate'
                    ? 'border-sky-200 bg-sky-500/25'
                    : 'border-white/80 bg-cyan-500/20'
              } hover:scale-110 dark:border-slate-800`}
              style={
                portIdx === 0
                  ? {
                      left: '50%',
                      top: -PORT_HALF,
                      transform: 'translateX(-50%)',
                      width: PORT_HIT_SIZE,
                      height: PORT_HIT_SIZE
                    }
                  : portIdx === 1
                    ? {
                        right: -PORT_HALF,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: PORT_HIT_SIZE,
                        height: PORT_HIT_SIZE
                      }
                    : portIdx === 2
                      ? {
                          left: '50%',
                          bottom: -PORT_HALF,
                          transform: 'translateX(-50%)',
                          width: PORT_HIT_SIZE,
                          height: PORT_HIT_SIZE
                        }
                      : {
                          left: -PORT_HALF,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: PORT_HIT_SIZE,
                          height: PORT_HIT_SIZE
                        }
              }
              data-testid={`node-port-${node.id}-${portIdx}`}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onPortClick(event, node.id, portIdx);
              }}
            >
              <span
                className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  connectState === 'source' ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
                style={{ width: PORT_DOT_SIZE, height: PORT_DOT_SIZE }}
              />
            </button>
          ))
        : null}
    </div>
  );
};

const DiagramNodeCard = React.memo(DiagramNodeCardComponent);
export default DiagramNodeCard;
