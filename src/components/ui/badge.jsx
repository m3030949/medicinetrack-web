import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-teal-100 text-teal-800',
        secondary: 'border-transparent bg-slate-100 text-slate-800',
        destructive: 'border-transparent bg-red-100 text-red-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        outline: 'border-slate-300 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export const Badge = ({ className, variant, ...props }) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

