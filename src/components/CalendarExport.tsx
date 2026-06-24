import React, { useState } from "react";
import { Task } from "../types";
import { Calendar, Download, FileText, CheckCircle2, ChevronLeft, ChevronRight, Share2 } from "lucide-react";

interface CalendarExportProps {
  tasks: Task[];
}

export default function CalendarExport({ tasks }: CalendarExportProps) {
  const [selectedDate, setSelectedDate] = useState<string>("2026-06-23");
  const [exportError, setExportError] = useState<string>("");

  const monthWeeks = [
    // June 2026 weeks. June 1 is a Monday. Wait, let's create calendar structure
    [null, 1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12, 13],
    [14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, null, null, null, null],
  ];

  const getFormattedDateString = (dayNum: number) => {
    return `2026-06-${String(dayNum).padStart(2, "0")}`;
  };

  const activeTasksForDay = (dayNum: number | null) => {
    if (!dayNum) return [];
    const dateStr = getFormattedDateString(dayNum);
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  // Generate .ics calendar download file
  const handleExportICS = () => {
    if (tasks.length === 0) {
      setExportError("⚠️ No tasks available to export.");
      setTimeout(() => setExportError(""), 3500);
      return;
    }

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TaskPilot AI//Productivity Assistant//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    tasks.forEach((task) => {
      // Format YYYY-MM-DD -> YYYYMMDD
      const dateRaw = task.dueDate.replace(/-/g, "");
      const dateFormatted = dateRaw || "20260623";
      
      const uid = `task-${task.id}@taskpilotai.internal`;
      const escapedSummary = task.title.replace(/[,;]/g, "\\$&");
      const escapedDesc = (task.description || `${task.category} task. Duration: ${task.estimateDuration} min`).replace(/[,;]/g, "\\$&");

      icsContent.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:20260623T080000Z`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `DTEND;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:${escapedSummary}`,
        `DESCRIPTION:${escapedDesc}`,
        `STATUS:${task.status === "completed" ? "COMPLETED" : "NEEDS-ACTION"}`,
        "END:VEVENT"
      );
    });

    icsContent.push("END:VCALENDAR");

    const fullText = icsContent.join("\r\n");
    const blob = new Blob([fullText], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `TaskPilotAI_Schedule_2026.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedDate);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" id="calendar-integration">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Calendar & Schedule Pilot
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Browse assignments, map constraints, and export tasks dynamically to external ecosystem calendars
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 self-start md:self-center">
          {exportError && (
            <span className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-900/30 px-2 py-0.5 rounded-lg animate-pulse">
              {exportError}
            </span>
          )}
          <button
            onClick={handleExportICS}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-2 justify-center shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export iCal (.ics)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Month View Matrix */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-semibold text-slate-200">
              June 2026
            </span>
            <div className="flex items-center gap-1">
              <button disabled className="p-1 rounded text-slate-600 hover:text-slate-400">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled className="p-1 rounded text-slate-600 hover:text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-slate-500 uppercase font-semibold mb-2">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5" id="calendar-grid-cells">
            {monthWeeks.flat().map((day, idx) => {
              if (day === null) {
                return (
                  <div key={`empty-${idx}`} className="aspect-square bg-slate-900/10 rounded-lg"></div>
                );
              }

              const dateStr = getFormattedDateString(day);
              const dayTasks = activeTasksForDay(day);
              const isSelected = selectedDate === dateStr;
              const hasHighUrgencyTask = dayTasks.some((t) => t.urgency === "high" && t.status === "pending");
              const isToday = day === 23; // local day June 23

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-lg flex flex-col justify-between p-1.5 relative transition-all border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                      : isToday
                      ? "bg-slate-900/90 text-slate-100 border-indigo-500/80"
                      : "bg-slate-900 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850"
                  }`}
                >
                  <span className={`text-[10px] font-mono font-medium ${isToday && !isSelected ? "text-indigo-400 font-bold" : ""}`}>
                    {day}
                  </span>

                  <div className="flex items-center gap-0.5 justify-end w-full">
                    {dayTasks.length > 0 && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasHighUrgencyTask ? "bg-red-500 animate-pulse" : isSelected ? "bg-white" : "bg-indigo-400"
                        }`}
                        title={`${dayTasks.length} task(s)`}
                      ></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Box */}
        <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                📅 Date Agenda
              </span>
              <span className="text-xs text-indigo-400 font-mono font-semibold">
                {selectedDate === "2026-06-23" ? "Today" : selectedDate}
              </span>
            </div>

            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-lg bg-slate-950/50 border border-slate-850/60">
                <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No tasks timetabled for this date.</p>
                <p className="text-[10px] text-slate-600 mt-1">Select other calendar squares to view scheduled plans.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDateTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                      t.status === "completed"
                        ? "bg-slate-900/50 border-slate-900 text-slate-500 opacity-80"
                        : t.urgency === "high"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="mt-0.5">
                      {t.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span
                          className={`w-2 h-2 rounded-full block mt-1.5 shrink-0 ${
                            t.urgency === "high"
                              ? "bg-red-500"
                              : t.urgency === "medium"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-grow">
                      <span className={`text-xs font-semibold block truncate ${t.status === "completed" ? "line-through" : "text-slate-200"}`}>
                        {t.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                        <span>{t.category}</span>
                        <span>•</span>
                        <span>{t.estimateDuration}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              Schedules are portable (iCal Format)
            </span>
            <span className="text-slate-400">{tasks.length} total synced tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
