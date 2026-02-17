import React from 'react';
import { cn } from './cn';

export function Chip(
  props: React.HTMLAttributes<HTMLSpanElement> & {
    tone?: 'default' | 'good' | 'warn';
  }
) {
  const { className, tone = 'default', ...rest } = props;

  const tones: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    warn: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
  };

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}
      {...rest}
    />
  );
}
