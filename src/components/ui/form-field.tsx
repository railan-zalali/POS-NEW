import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
  hideLabel?: boolean;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, description, hideLabel, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const descId = `${inputId}-desc`;

    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={inputId} className={cn(hideLabel && 'sr-only')}>
          {label}
          {props.required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
        </Label>

        {description && (
          <p id={descId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : description ? descId : undefined}
          className={cn(
            'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
          )}
          {...props}
        />

        {error && (
          <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export { FormField };
