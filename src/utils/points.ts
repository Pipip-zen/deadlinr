/**
 * Points system for TaskTrack gamification.
 *
 * Rule:
 *  - Base points per completion: 10 pts
 *  - Early bird bonus  (completed ≥ 2 days before deadline): +5 pts
 *  - Last-minute penalty (completed on deadline day): -2 pts
 *  - Streak multiplier: +1 pt per every 3-day streak (capped at +10)
 */

export const BASE_POINTS = 10
export const EARLY_BIRD_BONUS = 5
export const LAST_MINUTE_PENALTY = 2
export const MAX_STREAK_BONUS = 10

export function calcPoints(deadline: Date | string, completedAt: Date | string, streak: number): number {
    const dl = new Date(deadline)
    const ca = new Date(completedAt)

    let points = BASE_POINTS

    const diffDays = Math.floor((dl.getTime() - ca.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays >= 2) {
        points += EARLY_BIRD_BONUS
    } else if (diffDays <= 0) {
        points -= LAST_MINUTE_PENALTY
    }

    const streakBonus = Math.min(Math.floor(streak / 3), MAX_STREAK_BONUS)
    points += streakBonus

    return Math.max(0, points)
}

/** Rank label based on total points */
export function rankLabel(totalPoints: number): string {
    if (totalPoints >= 500) return '🏆 Legend'
    if (totalPoints >= 300) return '💎 Diamond'
    if (totalPoints >= 150) return '🥇 Gold'
    if (totalPoints >= 75) return '🥈 Silver'
    if (totalPoints >= 25) return '🥉 Bronze'
    return '🌱 Newcomer'
}
