import * as React from 'react'
import { cn } from '@/utils/cn'

interface AvatarProps {
    src?: string | null
    fallback?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-24 w-24 text-2xl',
}

export function Avatar({ src, fallback, size = 'md', className }: AvatarProps) {
    const [imgError, setImgError] = React.useState(false)
    const initials = fallback
        ? fallback
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '?'

    return (
        <div
            className={cn(
                'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
                sizes[size],
                className
            )}
        >
            {src && !imgError ? (
                <img
                    src={src}
                    alt={fallback ?? 'avatar'}
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span className="flex h-full w-full items-center justify-center font-semibold text-muted-foreground">
                    {initials}
                </span>
            )}
        </div>
    )
}
