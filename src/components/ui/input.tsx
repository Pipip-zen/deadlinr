import * as React from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
    label?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, id, ...props }, ref) => (
        <div className="w-full space-y-1.5">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-foreground">
                    {label}
                </label>
            )}
            <input
                id={id}
                ref={ref}
                className={cn(
                    'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-destructive focus:ring-destructive',
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
)
Input.displayName = 'Input'
