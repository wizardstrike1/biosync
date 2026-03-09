import { motion } from "framer-motion";
import { Ear, Wind, Eye, Hand, Activity, Flame } from "lucide-react";
import TestCard from "@/components/TestCard";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  EyeHistoryEntry,
  HearingHistoryEntry,
  MotorHistoryEntry,
  RespiratoryHistoryEntry,
  loadEyeHistory,
  loadHearingHistory,
  loadMotorHistory,
  loadRespiratoryHistory,
} from "@/lib/testHistory";
import { computeHealthScore } from "@/lib/healthScore";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const dayKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const computeDailyStreak = (createdAtValues: string[]) => {
  const completedDays = new Set<number>();

  createdAtValues.forEach((createdAt) => {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      completedDays.add(startOfLocalDay(date).getTime());
    }
  });

  if (completedDays.size === 0) {
    return { streak: 0, completedToday: false };
  }

  const sortedDays = [...completedDays]
    .map((value) => new Date(value))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = startOfLocalDay(new Date());
  const latest = startOfLocalDay(sortedDays[0]);
  const daysFromLatestToToday = Math.floor((today.getTime() - latest.getTime()) / MS_PER_DAY);

  if (daysFromLatestToToday > 1) {
    return { streak: 0, completedToday: false };
  }

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i += 1) {
    const prev = startOfLocalDay(sortedDays[i - 1]);
    const current = startOfLocalDay(sortedDays[i]);
    const gap = Math.floor((prev.getTime() - current.getTime()) / MS_PER_DAY);

    if (gap !== 1) {
      break;
    }

    streak += 1;
  }

  return {
    streak,
    completedToday: dayKey(latest) === dayKey(today),
  };
};

const tests = [
  {
    title: "Hearing Age",
    description: "Frequency response & hearing age estimation",
    icon: <Ear className="h-5 w-5 text-hearing" />,
    route: "/test/hearing",
  },
  {
    title: "Respiratory Health",
    description: "Exhale analysis & lung capacity",
    icon: <Wind className="h-5 w-5 text-respiratory" />,
    route: "/test/respiratory",
  },
  {
    title: "Eye Tracking & Blink",
    description: "Saccade accuracy & blink patterns",
    icon: <Eye className="h-5 w-5 text-eye-tracking" />,
    route: "/test/pupil",
  },
  {
    title: "Motor Control",
    description: "Reaction time & fine motor skills",
    icon: <Hand className="h-5 w-5 text-motor" />,
    route: "/test/motor",
  },
];

const Dashboard = () => {
  const { userId } = useAuth();
  const [hearingHistory, setHearingHistory] = useState<HearingHistoryEntry[]>([]);
  const [respiratoryHistory, setRespiratoryHistory] = useState<RespiratoryHistoryEntry[]>([]);
  const [motorHistory, setMotorHistory] = useState<MotorHistoryEntry[]>([]);
  const [eyeHistory, setEyeHistory] = useState<EyeHistoryEntry[]>([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [hearing, respiratory, motor, eye] = await Promise.all([
        loadHearingHistory(userId),
        loadRespiratoryHistory(userId),
        loadMotorHistory(userId),
        loadEyeHistory(userId),
      ]);

      if (!active) return;
      setHearingHistory(hearing);
      setRespiratoryHistory(respiratory);
      setMotorHistory(motor);
      setEyeHistory(eye);
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [userId]);

  const score = useMemo(
    () => computeHealthScore(hearingHistory, respiratoryHistory, motorHistory),
    [hearingHistory, respiratoryHistory, motorHistory],
  );

  const streak = useMemo(() => {
    const allCreatedAt = [
      ...hearingHistory.map((entry) => entry.createdAt),
      ...respiratoryHistory.map((entry) => entry.createdAt),
      ...motorHistory.map((entry) => entry.createdAt),
      ...eyeHistory.map((entry) => entry.createdAt),
    ];

    return computeDailyStreak(allCreatedAt);
  }, [eyeHistory, hearingHistory, motorHistory, respiratoryHistory]);

  const testCount = hearingHistory.length + respiratoryHistory.length + motorHistory.length + eyeHistory.length;

  return (
    <div className="px-5 pt-14 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-display font-bold text-foreground">BioSync</h1>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary animate-pulse-glow" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated rounded-2xl p-4 border border-border mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Streak</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{streak.streak} day{streak.streak === 1 ? "" : "s"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {streak.completedToday
                ? "Completed today. Keep the momentum."
                : "Complete one test today to keep your streak alive."}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
            <Flame className={`h-5 w-5 ${streak.streak > 0 ? "text-warning" : "text-muted-foreground"}`} />
          </div>
        </div>
      </motion.div>

      {/* Health Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="card-elevated rounded-3xl p-6 border border-border mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Health Score</p>
            <p className="text-5xl font-display font-bold text-gradient mt-1">{score.overall}</p>
            <p className="text-xs text-muted-foreground mt-1">{testCount} total tests recorded</p>
          </div>
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray="97.4"
                strokeDashoffset={97.4 * (1 - score.overall / 100)}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Tests */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Health Tests
      </h2>
      <div className="space-y-3">
        {tests.map((test) => (
          <TestCard
            key={test.title}
            title={test.title}
            description={test.description}
            icon={test.icon}
            route={test.route}
            status="ready"
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
