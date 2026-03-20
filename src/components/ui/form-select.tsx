import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormSelectProps {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  error?: string;
  description?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}

const FormSelect = React.forwardRef<HTMLButtonElement, FormSelectProps>(
  (
    {
      label,
      value,
      onValueChange,
      placeholder,
      children,
      error,
      description,
      id,
      required,
      disabled,
      hideLabel,
      className,
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const descId = `${selectId}-desc`;

    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={selectId} className={cn(hideLabel && 'sr-only')}>
          {label}
          {required && (
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

        <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            aria-label={label}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : description ? descId : undefined}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
              error ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring',
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1">
                <ChevronUp className="h-4 w-4" />
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1">
                <ChevronDown className="h-4 w-4" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {error && (
          <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormSelect.displayName = 'FormSelect';

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'FormSelectItem';

export { FormSelect, SelectItem };
