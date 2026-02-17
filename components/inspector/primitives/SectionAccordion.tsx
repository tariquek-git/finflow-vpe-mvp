import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type SectionAccordionProps = {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  testId?: string;
};

const SectionAccordion: React.FC<SectionAccordionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  actions,
  testId
}) => {
  return (
    <section className="inspector-section">
      <div className="inspector-section-head">
        <button
          type="button"
          onClick={onToggle}
          data-testid={testId}
          aria-expanded={isOpen}
          className="inspector-toggle flex min-w-0 flex-1 items-center justify-between gap-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon ? <span className="text-cyan-600 dark:text-cyan-300">{icon}</span> : null}
            <span className="ui-section-title truncate">{title}</span>
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {actions ? <div className="ml-1 flex items-center gap-1">{actions}</div> : null}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isOpen ? 'pointer-events-auto grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="inspector-body pt-2.5">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(SectionAccordion);
