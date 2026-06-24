import React, { useState } from "react";
import { Habit } from "../types";
import { Flame, Check, Plus, Trash2, Calendar, Target, Award, Sparkles } from "lucide-react";

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (name: string, frequency: "daily" | "weekly") => void;
  onToggleHabitDate: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (habitId: string) => void;
}

export default function HabitTracker({ habits, onAddHabit, onToggleHabitDate, onDeleteHabit }: HabitTrackerProps) {
  const [newHabitName, setNewHabitName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");

  // Get past 7 days formatted as YYYY-MM-DD
  // Assuming current local time is June 23, 2026
  const getPastNDays = (n: number) => {
    const dates = [];
    const baseDate = new Date("2026-06-23T12:00:00"); // Use local base
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      // Format e.g., "06-23" for simple display
      // And "2026-06-23" as target key
      dates.push({
        key: `${year}-${month}-${day}`,
        shortLabel: `${month}/${day}`,
        weekday: d.toLocaleDateString("en-US", { weekday: "narrow" }),
        isToday: i === 0,
      });
    }
    return dates;
  };

  const daysList = getPastNDays(7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    onAddHabit(newHabitName.trim(), frequency);
    setNewHabitName("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" id="habit-tracker-panel">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Automatic Habit Altar
          </h3>
          <p className="text-xs text-slate-400 mt-1">Strengthen daily behaviors to level up your scores</p>
        </div>
        <span className="text-xs font-mono py-1 px-2.5 bg-amber-950/40 text-amber-300 border border-amber-900/30 rounded-full flex items-center gap-1">
          <Award className="w-3.5 h-3.5" />
          Streaks Active
        </span>
      </div>

      {/* Habit Input Form */}
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="New habit, e.g., Read technical journals, Gym session..."
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          className="flex-grow bg-slate-950 text-slate-100 placeholder-slate-600 text-xs py-2 px-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as any)}
          className="bg-slate-950 text-slate-300 text-xs py-2 px-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shrink-0"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
        <button
          type="submit"
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium py-2 px-3 rounded-lg flex items-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Habits List Table */}
      {habits.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No active habits registered yet</p>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            Input a routine in the box above to trigger your habits timeline and monitor streaks correctly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700/60"
            >
              {/* Habit Meta */}
              <div className="flex-grow min-w-0" id={`habit-row-${habit.id}`}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100 text-sm truncate block">{habit.name}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {habit.frequency}
                  </span>
                </div>
                
                {/* Streak Count Display */}
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Flame className={`w-4 h-4 ${habit.streak > 0 ? "text-amber-500 fill-amber-500/20" : "text-slate-600"}`} />
                  <span className={habit.streak > 0 ? "text-amber-400 font-semibold" : "text-slate-500"}>
                    {habit.streak} Day {habit.streak === 1 ? "Streak" : "Streak"}
                  </span>
                </div>
              </div>

              {/* 7-Day Completion Grid */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <div className="text-slate-500 text-[10px] font-mono mr-1 uppercase flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Last 7 days
                </div>
                
                <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                  {daysList.map((day) => {
                    const isChecked = !!habit.history[day.key];
                    return (
                      <button
                        key={day.key}
                        onClick={() => onToggleHabitDate(habit.id, day.key)}
                        className={`w-7 h-9 rounded-md flex flex-col items-center justify-center transition-all ${
                          isChecked
                            ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30"
                            : "bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-800"
                        } ${day.isToday ? "ring-1 ring-indigo-500/40" : ""}`}
                        title={`${day.key}${day.isToday ? ' (Today)' : ''} : ${isChecked ? 'Completed' : 'Pending'}`}
                      >
                        <span className="text-[8px] font-mono uppercase tracking-tight text-slate-400">
                          {day.weekday}
                        </span>
                        <div className="mt-0.5">
                          {isChecked ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <span className="text-[9px] font-mono text-slate-600">
                              {day.shortLabel.split("/")[1]}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onDeleteHabit(habit.id)}
                  className="p-2 text-slate-600 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-all ml-1"
                  title="Remove Habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
