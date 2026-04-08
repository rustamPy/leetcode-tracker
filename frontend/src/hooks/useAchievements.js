import { useMemo } from "react";
import { useLeetCode } from "./useLeetCode";
import { api, userSubmissions } from "../services/api";

const DAY_MS = 86_400_000;

function dayKey(tsSeconds) {
    const d = new Date(Number(tsSeconds) * 1000);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function computeStreak(submissions) {
    if (!submissions?.length) return 0;
    const days = new Set(submissions.map(s => dayKey(s.timestamp)));
    const now = Date.now();
    const todayKey = dayKey(now / 1000);
    const yKey = dayKey((now - DAY_MS) / 1000);
    if (!days.has(todayKey) && !days.has(yKey)) return 0;
    let streak = 0;
    let cursor = days.has(todayKey) ? now : now - DAY_MS;
    while (days.has(dayKey(cursor / 1000))) {
        streak++;
        cursor -= DAY_MS;
    }
    return streak;
}

const ACHIEVEMENTS = [
    {
        id: "first_step",
        icon: "🌱",
        name: "First Step",
        desc: "Add your first problem to the board",
        check: ({ tasks }) => tasks.length >= 1,
    },
    {
        id: "century",
        icon: "💯",
        name: "Centurion",
        desc: "Solve 100+ problems on LeetCode",
        check: ({ solved }) => (solved?.total ?? 0) >= 100,
    },
    {
        id: "medium_master",
        icon: "⚙️",
        name: "Medium Master",
        desc: "Solve 50+ Medium problems",
        check: ({ solved }) => (solved?.medium ?? 0) >= 50,
    },
    {
        id: "hard_climber",
        icon: "🏔️",
        name: "Hard Climber",
        desc: "Conquer 10+ Hard problems",
        check: ({ solved }) => (solved?.hard ?? 0) >= 10,
    },
    {
        id: "week_warrior",
        icon: "🔥",
        name: "Week Warrior",
        desc: "Maintain a 7-day solving streak",
        check: ({ streak }) => streak >= 7,
    },
    {
        id: "month_grinder",
        icon: "⚡",
        name: "Month Grinder",
        desc: "Maintain a 30-day solving streak",
        check: ({ streak }) => streak >= 30,
    },
    {
        id: "polyglot",
        icon: "🧠",
        name: "Polyglot",
        desc: "Solve problems in 3+ languages",
        check: ({ submissions }) =>
            new Set((submissions ?? []).map(s => s.lang)).size >= 3,
    },
    {
        id: "board_pro",
        icon: "✅",
        name: "Board Pro",
        desc: "Complete 10+ tasks on your board",
        check: ({ tasks }) =>
            tasks.filter(t => t.status === "completed").length >= 10,
    },
    {
        id: "top_dog",
        icon: "🏆",
        name: "Top Dog",
        desc: "Rank in the top 25% in contests",
        check: ({ contest }) => {
            const pct = contest?.topPercentage ?? 100;
            return pct > 0 && pct <= 25;
        },
    },
];

export function useAchievements() {
    const { data } = useLeetCode();
    const tasks = api.getTasks();
    const submissions = data?.submissions ?? userSubmissions;
    const solved = data?.solved ?? {};
    const contest = data?.contest ?? {};

    return useMemo(() => {
        const streak = computeStreak(submissions);
        const ctx = { tasks, submissions, solved, contest, streak };
        const achievements = ACHIEVEMENTS.map(a => ({ ...a, earned: a.check(ctx) }));
        return { streak, achievements };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, tasks.length]);
}
