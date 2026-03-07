import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'

/** e.g. "Mar 7, 2026" */
export function formatDate(date: string | Date): string {
    return format(new Date(date), 'MMM d, yyyy')
}

/** e.g. "in 3 days" or "2 hours ago" */
export function fromNow(date: string | Date): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
}

/** e.g. "Mar 7, 2026 · 23:59" */
export function formatDeadline(date: string | Date): string {
    return format(new Date(date), 'MMM d, yyyy · HH:mm')
}

export function isOverdue(deadline: string | Date): boolean {
    return isPast(new Date(deadline))
}

/** Returns number of days until deadline (negative = overdue) */
export function daysUntil(deadline: string | Date): number {
    return differenceInDays(new Date(deadline), new Date())
}
