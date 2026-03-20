import * as React from 'react';
import { cn } from '@/lib/utils';

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
          '[clip:rect(0,0,0,0)]',
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);
VisuallyHidden.displayName = 'VisuallyHidden';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  className?: string;
}

const LiveRegion: React.FC<LiveRegionProps> = ({ message, politeness = 'polite', className }) => {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={cn(
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        '[clip:rect(0,0,0,0)]',
        className,
      )}
    >
      {message}
    </div>
  );
};

export { VisuallyHidden, LiveRegion };
