import { useMemo, useState, useEffect } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

import { useLeaderboard, useRealtimeLeaderboard } from '@/hooks/useLeaderboard'
import { useClasses } from '@/hooks/useClasses'
import { useAuthStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { Select } from '@/components/ui/select'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { LeaderboardEntry } from '@/hooks/useLeaderboard'

// ── Medal badges for top 3 ────────────────────────────────────
const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

// ── Column helper ─────────────────────────────────────────────
const col = createColumnHelper<LeaderboardEntry>()

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ChevronsUpDown size={14} className="text-muted-foreground" />
    return sorted === 'asc'
        ? <ChevronUp size={14} className="text-primary" />
        : <ChevronDown size={14} className="text-primary" />
}

// ── Row component (animated) ──────────────────────────────────
function LeaderboardRow({
    row,
    isMe,
}: {
    row: ReturnType<ReturnType<typeof useReactTable<LeaderboardEntry>>['getRowModel']>['rows'][number]
    isMe: boolean
}) {
    return (
        <motion.tr
            key={row.original.user_id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`border-b border-border transition-colors ${isMe ? 'bg-primary/8 font-semibold' : 'hover:bg-muted/40'
                }`}
        >
            {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
            ))}
        </motion.tr>
    )
}

// ── Main leaderboard component ────────────────────────────────
function LeaderboardContent() {
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null
    const myClassId = profile?.classId ?? null

    const [selectedClassId, setSelectedClassId] = useState<string | null>(myClassId)

    const { data: classes = [], isLoading: loadingClasses } = useClasses()

    // If no class selected and classes loaded, pick the first one
    useEffect(() => {
        if (!selectedClassId && classes.length > 0) {
            setSelectedClassId(classes[0].id)
        }
    }, [classes, selectedClassId])

    const { data: entries = [], isLoading: loadingLeaderboard } = useLeaderboard(selectedClassId)
    useRealtimeLeaderboard(selectedClassId)
    const isLoading = loadingClasses || loadingLeaderboard

    const [sorting, setSorting] = useState<SortingState>([])

    // Find current user's entry in the fetched top-50 list
    const myEntry = entries.find((e) => e.user_id === userId) ?? null
    // Show sticky row when user is found but ranked low (not in top 10 visible rows)
    const showStickyRow = myEntry !== null && myEntry.rank > 10


    const columns = useMemo(
        () => [
            col.accessor('rank', {
                header: 'Rank',
                enableSorting: false,
                cell: ({ getValue }) => {
                    const rank = getValue()
                    return MEDALS[rank] ? (
                        <span className="text-xl">{MEDALS[rank]}</span>
                    ) : (
                        <span className="text-muted-foreground">{rank}</span>
                    )
                },
            }),
            col.accessor('name', {
                header: 'Student',
                enableSorting: false,
                cell: ({ row }) => (
                    <div className="flex items-center gap-3">
                        <Avatar
                            src={row.original.avatar_url}
                            fallback={row.original.name ?? '?'}
                            size="sm"
                        />
                        <span className="truncate max-w-[160px]">
                            {row.original.name ?? 'Anonymous'}
                            {row.original.user_id === userId && (
                                <span className="ml-1.5 text-xs text-primary">(you)</span>
                            )}
                        </span>
                    </div>
                ),
            }),
            col.accessor('total_points', {
                header: 'Points',
                enableSorting: true,
                cell: ({ getValue }) => (
                    <span className="font-bold text-primary">{getValue().toLocaleString()}</span>
                ),
            }),
            col.accessor('streak_count', {
                header: '🔥 Streak',
                enableSorting: true,
                cell: ({ getValue }) => {
                    const s = getValue()
                    return (
                        <span className={s > 0 ? 'font-semibold text-amber-500' : 'text-muted-foreground'}>
                            {s > 0 ? `${s} days` : '—'}
                        </span>
                    )
                },
            }),
        ],
        [userId]
    )

    const table = useReactTable({
        data: entries,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Leaderboard 🏆</h1>
                    <p className="text-sm text-muted-foreground">
                        Class rankings · updates in real-time
                    </p>
                </div>
                {classes.length > 0 && (
                    <div className="w-full sm:w-64">
                        <Select
                            options={classes.map((c) => ({
                                value: c.id,
                                label: c.id === myClassId ? `${c.name} (My Class)` : c.name,
                            }))}
                            value={selectedClassId ?? ''}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                    Loading leaderboard…
                </div>
            ) : entries.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    No data yet — complete some tasks to get on the board! 🎯
                </p>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <table className="w-full">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b border-border bg-muted/40">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                                                }`}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <SortIcon sorted={header.column.getIsSorted()} />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {table.getRowModel().rows.map((row) => (
                                    <LeaderboardRow
                                        key={row.original.user_id}
                                        row={row}
                                        isMe={row.original.user_id === userId}
                                    />
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>

                    {/* Sticky current-user row if ranked outside top 10 */}
                    {showStickyRow && myEntry && (
                        <div className="sticky bottom-0 border-t-2 border-primary bg-primary/10">
                            <table className="w-full">
                                <tbody>
                                    <tr className="font-semibold">
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {myEntry.rank}+
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3 text-sm">
                                                <Avatar src={myEntry.avatar_url} fallback={myEntry.name ?? '?'} size="sm" />
                                                <span>{myEntry.name ?? 'You'} <span className="text-primary text-xs">(you)</span></span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-primary">
                                            {myEntry.total_points.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-amber-500 font-semibold">
                                            {myEntry.streak_count > 0 ? `${myEntry.streak_count} days` : '—'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function LeaderboardPage() {
    return (
        <ErrorBoundary>
            <LeaderboardContent />
        </ErrorBoundary>
    )
}
