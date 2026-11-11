import { cn } from '@/lib/utils';

export const Table = ({ className, ...props }) => (
  <div className="relative w-full overflow-auto">
    <table
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
);

export const TableHeader = ({ className, ...props }) => (
  <thead className={cn('[&_tr]:border-b', className)} {...props} />
);

export const TableBody = ({ className, ...props }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }) => (
  <tr
    className={cn(
      'border-b border-slate-200 transition-colors hover:bg-slate-50/70',
      className,
    )}
    {...props}
  />
);

export const TableHead = ({ className, ...props }) => (
  <th
    className={cn(
      'h-11 px-4 text-left align-middle font-semibold text-slate-600',
      className,
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }) => (
  <td className={cn('p-4 align-middle text-slate-800', className)} {...props} />
);

