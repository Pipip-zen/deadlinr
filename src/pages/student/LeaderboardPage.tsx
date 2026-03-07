import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAppStore } from '@/lib/store'
import { rankLabel } from '@/utils/points'

export default function LeaderboardPage() {
    const { data: board, isLoading } = useLeaderboard()
    const userId = useAppStore((s) => s.userId)

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Leaderboard 🏆</h1>

            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

            <ol className="space-y-2">
                {board?.map((entry, idx) => {
                    const profile = (entry as any).profiles
                    const isMe = entry.user_id === userId
                    return (
                        <li
                            key={entry.user_id}
                            className={`flex items-center rounded-xl border px-4 py-3 ${isMe ? 'border-primary bg-primary/5' : 'border-border bg-card'
                                }`}
                        >
                            <span className="w-8 text-lg font-bold text-muted-foreground">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                            </span>
                            <div className="flex-1">
                                <p className="font-medium">
                                    {profile?.name ?? 'Anonymous'} {isMe && '(you)'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {rankLabel(entry.total_points)} · 🔥 {profile?.streak_count ?? 0}
                                </p>
                            </div>
                            <span className="font-bold text-primary">{entry.total_points} pts</span>
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
