import React from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
) {
  const { className, variant = 'secondary', size = 'md', ...rest } = props;

  const base =
    'inline-flex items-center justify-center rounded-lg font-medium transition ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 ' +
    'disabled:opacity-50 disabled:pointer-events-none';

  const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-3.5 text-sm'
  };

  const variants: Record<Variant, string> = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
    secondary:
      'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost:
      'bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500'
  };

  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest} />
  );
}
