import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-primary text-white shadow-soft hover:opacity-95 focus-visible:ring-2 focus-visible:ring-brand-secondary/60',
  secondary:
    'bg-white text-brand-primary border border-border-soft hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-brand-secondary/50',
  ghost: 'bg-transparent text-brand-primary hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-brand-secondary/40',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs font-medium',
  md: 'h-10 px-4 text-sm font-medium',
  lg: 'h-11 px-5 text-sm font-semibold',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md transition duration-150 ease-smooth focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
