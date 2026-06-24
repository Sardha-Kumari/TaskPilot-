import React, { useState, useRef } from "react";
import { Mic, MicOff, Plus, Clipboard, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Task } from "../types";

interface TaskFormProps {
  onAddTask: (task: Omit<Task, "id" | "status">) => void;
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("2026-06-23");
  const [category, setCategory] = useState<Task["category"]>("Study");
  const [estimateDuration, setEstimateDuration] = useState<number>(60);
  const [urgency, setUrgency] = useState<Task["urgency"]>("medium");

  const [naturalText, setNaturalText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  const startSpeechRecognition = () => {
    setParseError("");
    setFeedbackMsg("");
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setParseError("Your browser doesn't natively support Speech Recognition. Please type your target text in the input box instead!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === "not-allowed") {
          setParseError("Microphone access is blocked in this container/preview. Please authorize microphone in browser settings or type in the Box below.");
        } else {
          setParseError(`Recording error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNaturalText(transcript);
        handleParseRequest(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setParseError("Failed to initialize speech recording: " + err.message);
      setIsRecording(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleParseRequest = async (textToParse: string) => {
    const text = textToParse.trim();
    if (!text) return;

    setIsParsing(true);
    setParseError("");
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/gemini/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) {
        throw new Error("Proxy server encountered parse issue.");
      }

      const { parsedTask } = await res.json();
      if (parsedTask) {
        if (parsedTask.title) setTitle(parsedTask.title);
        if (parsedTask.category) {
          const cat = parsedTask.category.charAt(0).toUpperCase() + parsedTask.category.slice(1).toLowerCase();
          if (["Work", "Study", "Personal", "Health", "Financial", "General"].includes(cat)) {
            setCategory(cat as Task["category"]);
          } else {
            setCategory("General");
          }
        }
        if (parsedTask.estimateDuration) setEstimateDuration(parsedTask.estimateDuration);
        if (parsedTask.dueDate) setDueDate(parsedTask.dueDate);
        if (parsedTask.urgency) setUrgency(parsedTask.urgency);

        setFeedbackMsg("✨ Gemini successfully parsed details! Review values below and click 'Secure Task'.");
      }
    } catch (err: any) {
      setParseError("AI Parsing failed: Please enter manual details or try again (" + err.message + ")");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      dueDate,
      category,
      estimateDuration: Number(estimateDuration) || 30,
      urgency,
    });

    // Reset Form
    setTitle("");
    setDescription("");
    setDueDate("2026-06-23");
    setCategory("Study");
    setEstimateDuration(60);
    setUrgency("medium");
    setNaturalText("");
    setFeedbackMsg("Task created successfully!");
    setTimeout(() => setFeedbackMsg(""), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="task-creation-panel">
      {/* Decorative colored glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Enlist AI Pilot Task
        </h3>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-900/30">
          Smart Form
        </span>
      </div>

      {/* Voice / Natural Language Helper */}
      <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          🎤 QUICK WORKFLOW: VOICE INPUT OR TYPE NATURALLY
        </label>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="e.g. 'Solve calculus prep review, due tomorrow, highly urgent'"
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              className="w-full bg-slate-900 text-slate-200 placeholder-slate-500 text-sm py-2 px-3 pr-10 rounded-lg border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleParseRequest(naturalText);
                }
              }}
            />
            {naturalText && (
              <button
                type="button"
                onClick={() => handleParseRequest(naturalText)}
                disabled={isParsing}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-400 hover:text-indigo-300"
                title="AI Parse Text"
              >
                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={isRecording ? stopSpeechRecognition : startSpeechRecognition}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
              isRecording
                ? "bg-red-500/25 text-red-200 border border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse"
                : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-slate-100"
            }`}
            title={isRecording ? "Stop recording voice" : "Press to speak task"}
          >
            {isRecording ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
          </button>
        </div>

        {isRecording && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Listening intently... speak now and stop when done.
          </p>
        )}

        {isParsing && (
          <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1.5 font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing transcript with Gemini Model...
          </p>
        )}

        {parseError && (
          <div className="mt-2 text-xs text-amber-400 flex items-start gap-1.5 p-2 rounded bg-amber-950/20 border border-amber-900/30">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {feedbackMsg && (
          <p className="text-xs text-emerald-400 mt-2 font-mono">
            {feedbackMsg}
          </p>
        )}
      </div>

      {/* Structured Fields Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-slate-400 mb-1">TASK TITLE*</label>
          <input
            id="title"
            type="text"
            required
            placeholder="Review organic chemistry chapters..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-sm py-2 px-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-medium text-slate-400 mb-1">TASK DESCRIPTION / DETAILS</label>
          <textarea
            id="description"
            placeholder="Focus heavily on nomenclature and reaction mechanisms. Bring reference notes."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 placeholder-slate-600 text-sm py-2 px-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dueDate" className="block text-xs font-medium text-slate-400 mb-1">DUE DATE</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-xs font-medium text-slate-400 mb-1">CATEGORY</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Work">💼 Work</option>
              <option value="Study">📚 Study</option>
              <option value="Personal">🏠 Personal</option>
              <option value="Health">🧘 Health</option>
              <option value="Financial">💵 Financial</option>
              <option value="General">🗓️ General</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="estimateDuration" className="block text-xs font-medium text-slate-400 mb-1">DURATION (MINS)</label>
            <input
              id="estimateDuration"
              type="number"
              min={5}
              max={480}
              value={estimateDuration}
              onChange={(e) => setEstimateDuration(Number(e.target.value) || 0)}
              className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="urgency" className="block text-xs font-medium text-slate-400 mb-1">URGENCY RADAR</label>
            <div className="grid grid-cols-3 gap-1">
              {["low", "medium", "high"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level as any)}
                  className={`py-2 text-[10px] font-semibold uppercase rounded-md transition-all border ${
                    urgency === level
                      ? level === "high"
                        ? "bg-red-500/20 text-red-400 border-red-500/50"
                        : level === "medium"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : "bg-slate-950/70 text-slate-500 border-transparent hover:bg-slate-900 hover:text-slate-400"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-900/30 flex items-center justify-center gap-1.5 mt-2"
          id="secure-task-button"
        >
          <Plus className="w-4.5 h-4.5" />
          Secure Task to Board
        </button>
      </form>
    </div>
  );
}
