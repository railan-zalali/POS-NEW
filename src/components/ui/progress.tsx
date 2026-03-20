import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  max = 100,
  'aria-label': ariaLabel,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { 'aria-label'?: string }) {
  const percentage = max > 0 ? Math.round(((value || 0) / max) * 100) : 0;
  const numericValue = value ?? 0;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      role="progressbar"
      aria-label={ariaLabel || 'Progress'}
      aria-valuenow={numericValue}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        'relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
