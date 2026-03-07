import * as React from 'react'
import { cn } from '@/utils/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    placeholder?: string
    options: { value: string; label: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, id, placeholder, options, ...props }, ref) => (
        <div className="w-full space-y-1.5">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-foreground">
                    {label}
                </label>
            )}
            <select
                id={id}
                ref={ref}
                className={cn(
                    'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-destructive focus:ring-destructive',
                    className
                )}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
)
Select.displayName = 'Select'
