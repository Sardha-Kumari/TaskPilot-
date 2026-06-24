export interface SubStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  category: "Work" | "Study" | "Personal" | "Health" | "Financial" | "General";
  estimateDuration: number; // in minutes
  urgency: "high" | "medium" | "low";
  status: "pending" | "completed";
  aiPriority?: "high" | "medium" | "low";
  aiExplanation?: string;
  substeps?: SubStep[];
}

export interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  streak: number;
  history: { [date: string]: boolean }; // tracks checked status per date e.g., "2026-06-23": true
  createdAt: string;
}

export interface DailyPlanItem {
  time: string;
  title: string;
  type: string; // "task" | "habit" | "break" | "meal" | "leisure"
  details: string;
}

export interface DailyPlanResponse {
  plan: DailyPlanItem[];
  motivation: string;
}

export interface ProductivityReport {
  score: number;
  insightSummary: string;
  achievements: string[];
  highRiskInsights: string;
  recommendations: string[];
  habitStreaksFeedback: string;
}
