import React, { useState, useEffect, useRef } from "react";
import { Task } from "../types";
import { 
  AlertTriangle, 
  Sparkles, 
  FileText, 
  Mail, 
  Timer, 
  Copy, 
  Check, 
  RefreshCw, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Loader2, 
  BookOpen, 
  Send,
  Coffee,
  CheckCircle2,
  ListTodo
} from "lucide-react";

interface RescueCenterProps {
  tasks: Task[];
  onToggleTaskStatus?: (id: string) => void;
  onAddTaskSubsteps?: (taskId: string, steps: string[]) => void;
}

export default function RescueCenter({ tasks, onToggleTaskStatus, onAddTaskSubsteps }: RescueCenterProps) {
  // Current active tasks (pending first)
  const activeTasks = tasks.filter(t => t.status === "pending");
  const fallbackTasks = tasks; // all tasks if no pending is available
  const listToUse = activeTasks.length > 0 ? activeTasks : fallbackTasks;

  // Selected Task to Rescue
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const selectedTask = tasks.find(t => t.id === selectedTaskId) || (listToUse.length > 0 ? listToUse[0] : null);

  useEffect(() => {
    if (selectedTask && !selectedTaskId) {
      setSelectedTaskId(selectedTask.id);
    }
  }, [selectedTask, selectedTaskId]);

  // Rescue modes: 'quickstart' | 'extension' | 'pomodoro'
  const [activeMode, setActiveMode] = useState<"quickstart" | "extension" | "pomodoro">("quickstart");

  // State for AI Draft Quickstart
  const [draftPrompt, setDraftPrompt] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [copiedDraft, setCopiedDraft] = useState(false);

  // State for AI Extension Request
  const [recipient, setRecipient] = useState("Professor / Teacher");
  const [reason, setReason] = useState("Severe Fatigue & Backlog");
  const [tone, setTone] = useState("Extremely Polite & Apologetic");
  const [isGeneratingExtension, setIsGeneratingExtension] = useState(false);
  const [generatedExtension, setGeneratedExtension] = useState("");
  const [copiedExtension, setCopiedExtension] = useState(false);

  // State for Pomodoro Focus Sprint
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins by default
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerPreset, setTimerPreset] = useState<25 | 15 | 5>(25);
  const [completedSprints, setCompletedSprints] = useState(0);
  const [timerAlert, setTimerAlert] = useState<string>("");

  // Focus Timer Tick Loop
  useEffect(() => {
    let timerId: any = null;
    if (isTimerRunning && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setCompletedSprints(prev => prev + 1);
      setTimerAlert("🎉 FOCUS SPRINT COMPLETE! Superb job. Take a short 3-5 minute breather to oxygenate your mind, then reload!");
      setTimeout(() => setTimerAlert(""), 8000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isTimerRunning, timeLeft]);

  // Adjust timer on preset change
  const handlePresetChange = (mins: 25 | 15 | 5) => {
    setIsTimerRunning(false);
    setTimerPreset(mins);
    setTimeLeft(mins * 60);
    setTotalDuration(mins * 60);
  };

  // Format seconds -> mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  // Trigger: AI Task Starter Quickstart Draft
  const handleGenerateQuickstartDraft = async () => {
    if (!selectedTask) return;
    setIsGeneratingDraft(true);
    setGeneratedDraft("");
    try {
      const res = await fetch("/api/gemini/rescue-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: selectedTask.title,
          taskDescription: selectedTask.description,
          category: selectedTask.category,
          userNote: draftPrompt,
        }),
      });

      if (!res.ok) throw new Error("Server error generating quickstart outline.");
      const data = await res.json();
      setGeneratedDraft(data.draft);
    } catch (err: any) {
      setGeneratedDraft(`⚠️ AI Generation Error:\n${err.message}\n\nPlease verify your network or Gemini API Key configured in your console.`);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Trigger: AI Extension Request Email
  const handleGenerateExtensionRequest = async () => {
    if (!selectedTask) return;
    setIsGeneratingExtension(true);
    setGeneratedExtension("");
    try {
      const res = await fetch("/api/gemini/rescue-extension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: selectedTask.title,
          category: selectedTask.category,
          recipient,
          reason,
          tone,
        }),
      });

      if (!res.ok) throw new Error("Server error writing extension request.");
      const data = await res.json();
      setGeneratedExtension(data.extensionText);
    } catch (err: any) {
      setGeneratedExtension(`⚠️ AI Extension Generator Error:\n${err.message}\n\nPlease check your server logs.`);
    } finally {
      setIsGeneratingExtension(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          })
          .catch((err) => {
            console.warn("Clipboard API writeText failed, using fallback:", err);
            fallbackCopyToClipboard(text, setCopied);
          });
      } else {
        fallbackCopyToClipboard(text, setCopied);
      }
    } catch (e) {
      console.warn("Clipboard access error, using fallback:", e);
      fallbackCopyToClipboard(text, setCopied);
    }
  };

  const fallbackCopyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Prevent scrolling to bottom of page
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        console.warn("Fallback execCommand copy failed.");
      }
    } catch (err) {
      console.error("Fallback copy failed entirely:", err);
    }
  };

  // Get productivity-enhancing focus tips based on category
  const getFocusAudioTip = (category: string) => {
    switch (category) {
      case "Study":
        return {
          frequency: "40 Hz (Gamma)",
          description: "Recommended: Scientific Gamma Binaural Beats. Best for complex rule integration, mathematical proofs, and literature memorization.",
          sound: "Binaural Focus Waves"
        };
      case "Work":
        return {
          frequency: "14 Hz (Beta)",
          description: "Recommended: Lofi/Synthwave with non-vocal low-frequency drive. Keeps the analytical prefrontal cortex fully aligned without language conflict.",
          sound: "Lofi Coding Beats"
        };
      case "Financial":
        return {
          frequency: "Brown Noise",
          description: "Recommended: Pure Deep Brown Noise. Masks background room noise to allow hyper-focus on details and decrease computational strain.",
          sound: "Steady Brownian Flow"
        };
      default:
        return {
          frequency: "Alpha Waves (10 Hz)",
          description: "Recommended: Ambient nature textures or classical piano. Calm, reassuring patterns that quieten deadline-induced anxiety.",
          sound: "Ethereal Ambient Piano"
        };
    }
  };

  return (
    <div className="space-y-6" id="rescue-command-center">
      {/* Welcome Banner */}
      <div className="bg-[#1e1b4b] border border-indigo-900 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/50">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                The 11th-Hour Emergency Rescue
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Stop panicking and take immediate, concrete action. Choose your tightest deadline, and let the AI generate drafts, prepare polite polite extension letters, and guide you through an anti-procrastination Pomodoro system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-red-955/40 text-red-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border border-red-900/50 shrink-0 font-mono">
            🚒 ACTIVE LIFESAVER PROTOCOL ENGAGED
          </div>
        </div>
      </div>

      {/* Main Core Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Column: Select Task and Action Buttons */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Section 1: Choose Your Emergency Task */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <label htmlFor="emergency-task-dropdown" className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1">
              <ListTodo className="w-4 h-4 text-red-400" />
              1. Select Task in Danger
            </label>

            {tasks.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-950 border border-slate-850">
                <p className="text-xs text-slate-500">No tasks currently logged. Click on Dashboard and add a task first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  id="emergency-task-dropdown"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-sm py-2 px-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                >
                  {listToUse.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.status === "completed" ? "✅ [Done] " : "⚠️ "}
                      {t.title} ({t.category})
                    </option>
                  ))}
                </select>

                {selectedTask && (
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase font-mono text-slate-500">
                      <span>Due Date: <strong className="text-slate-300">{selectedTask.dueDate}</strong></span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        selectedTask.urgency === "high" ? "bg-red-950/60 text-red-400 border border-red-900/30" : "bg-slate-900"
                      }`}>{selectedTask.urgency} urgency</span>
                    </div>
                    <div className="font-semibold text-slate-200">{selectedTask.title}</div>
                    {selectedTask.description && (
                      <div className="text-slate-400 leading-relaxed text-[11px] line-clamp-3">
                        {selectedTask.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Choose Your AI Action */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
              2. Select Rescue Action
            </span>

            {/* Quickstart Tab */}
            <button
              onClick={() => setActiveMode("quickstart")}
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left ${
                activeMode === "quickstart"
                  ? "bg-red-500/10 border-red-500/30 text-white shadow-md shadow-red-950/10"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                activeMode === "quickstart" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-slate-900 border-slate-800 text-slate-400"
              }`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Smart Quick-Draft</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Skip blank pages: Make detailed layouts & contents</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            {/* Extension Tab */}
            <button
              onClick={() => setActiveMode("extension")}
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left ${
                activeMode === "extension"
                  ? "bg-red-500/10 border-red-500/30 text-white shadow-md shadow-red-950/10"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                activeMode === "extension" ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-slate-900 border-slate-850 text-slate-400"
              }`}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Negotiate Extension</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Write polite formal extension emails automatically</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>

            {/* Pomodoro Tab */}
            <button
              onClick={() => setActiveMode("pomodoro")}
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all border text-left ${
                activeMode === "pomodoro"
                  ? "bg-[#1e1b4b] border-indigo-500/30 text-white shadow-md shadow-indigo-950/10"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                activeMode === "pomodoro" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-slate-900 border-slate-850 text-slate-400"
              }`}>
                <Timer className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold block">Anti-Procrastination Sprint</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Physical countdown space with audio instructions</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
          </div>

        </div>

        {/* Right Side Column: Active Action Execution Board */}
        <div className="lg:col-span-8">
          
          {!selectedTask ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full">
              <Sparkles className="w-12 h-12 text-red-400/20 mb-4" />
              <h4 className="text-slate-200 font-bold">No Task Active</h4>
              <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
                To launch the Lifesaver command console, make sure you have loaded some tasks in your dashboard first!
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-full min-h-[500px]">
              
              {/* Card Header displaying current task in action */}
              <div className="p-4 border-b border-slate-800 bg-[#070d19]/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                  <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Execution Target: <strong className="text-slate-200 font-normal">"{selectedTask.title}"</strong>
                  </span>
                </div>
                <span className="bg-slate-950 text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                  {selectedTask.category}
                </span>
              </div>

              {/* ACTION CONTENT: QUICKSTART OUTLINE GENERATOR */}
              {activeMode === "quickstart" && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-red-400" />
                      <h3 className="font-bold text-slate-100 text-sm uppercase font-mono tracking-wider">
                        Smart Quick-Draft & Starter Scaffolding
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Facing writer's block? AI will research and compose a customized starting layout, document brief, calculations table, research draft, or structural outline.
                    </p>

                    <div>
                      <label htmlFor="draftPrompt" className="block text-[10px] font-mono font-bold text-slate-500 uppercase mb-1">
                        ADD CUSTOM CRITERIA OR SPECIFIC FOCUS (OPTIONAL)
                      </label>
                      <input
                        id="draftPrompt"
                        type="text"
                        placeholder="e.g. 'focus on nomenclature formulas', 'draft specifically in a professional client summary layout'"
                        value={draftPrompt}
                        onChange={(e) => setDraftPrompt(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                      />
                    </div>

                    <button
                      onClick={handleGenerateQuickstartDraft}
                      disabled={isGeneratingDraft}
                      className="bg-red-650 hover:bg-red-600 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-2 justify-center w-fit cursor-pointer"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating draft scaffolding...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-white/10" />
                          <span>Generate Initial Draft / Outline</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Generated Output Display */}
                  <div className="flex-1 flex flex-col mt-4">
                    {isGeneratingDraft ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 rounded-xl border border-dashed border-red-950/40 text-center">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
                        <span className="text-xs font-mono text-slate-400">Gemini is synthesizing structure parameters...</span>
                        <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Generating detailed markdown layouts for quick copying.</p>
                      </div>
                    ) : generatedDraft ? (
                      <div className="flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-red-400" />
                            Draft Synthesized Successfully
                          </span>
                          <button
                            onClick={() => copyToClipboard(generatedDraft, setCopiedDraft)}
                            className="text-[10px] font-mono hover:text-white text-slate-400 flex items-center gap-1 bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-md hover:bg-slate-800 transition-all font-semibold"
                          >
                            {copiedDraft ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>Copy Draft Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Textarea viewing the draft markdown */}
                        <textarea
                          readOnly
                          value={generatedDraft}
                          className="w-full flex-grow bg-transparent text-slate-200 text-xs font-mono leading-relaxed resize-none focus:outline-none min-h-[220px]"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/50 rounded-xl border border-dashed border-slate-850 text-center">
                        <FileText className="w-10 h-10 text-slate-700 mb-2" />
                        <span className="text-xs text-slate-500 font-semibold">Ready to draft</span>
                        <p className="text-[10px] text-slate-650 max-w-xs mt-1">Make a selection and trigger generation above to bypass typing friction!</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ACTION CONTENT: EMAIL REQUEST WRITER */}
              {activeMode === "extension" && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-red-400" />
                      <h3 className="font-bold text-slate-100 text-sm uppercase font-mono tracking-wider">
                        Client/Supervisor Extension Request Negotiator
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Need a diplomatic out? Gemini writes polite, highly persuasive letters/emails to get deadlines extended.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="recipient-select" className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                          RECIPIENT TYPE
                        </label>
                        <select
                          id="recipient-select"
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                        >
                          <option value="Professor / Academic Instructor">📚 Professor / Teacher</option>
                          <option value="Client / Stakeholder">💼 Client / Stakeholder</option>
                          <option value="Manager / Project Supervisor">🏢 Manager / Boss</option>
                          <option value="Colleague / Partner">🏠 Partner / Team Member</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="reason-select" className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                          EMERGENCY REASON
                        </label>
                        <select
                          id="reason-select"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                        >
                          <option value="Overlapping severe workloads">💼 Severe Fatigue / Overlap</option>
                          <option value="Health flareup / medical issue">🧘 Health / Medical Issue</option>
                          <option value="Urgent family matter / dependency">🏠 Family Emergency</option>
                          <option value="Technical block / software bug">💻 Major Technical Blocker</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="tone-select" className="block text-[9px] font-mono font-bold text-slate-500 uppercase mb-1">
                          PERSUASION TONE
                        </label>
                        <select
                          id="tone-select"
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="w-full bg-slate-950 text-slate-200 text-xs py-2 px-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500/40"
                        >
                          <option value="Polite, apologetic yet confident">✨ Polite & Apologetic</option>
                          <option value="Highly Urgent & Professional">🔥 Urgent & Professional</option>
                          <option value="Earnest, detailing learning friction">📖 Earnest Study Friction</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateExtensionRequest}
                      disabled={isGeneratingExtension}
                      className="bg-red-650 hover:bg-red-600 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-2 justify-center w-fit cursor-pointer"
                    >
                      {isGeneratingExtension ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Drafting diplomatic communication...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Generate Extension request letter</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Email Output Frame */}
                  <div className="flex-1 flex flex-col mt-4">
                    {isGeneratingExtension ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 rounded-xl border border-dashed border-red-950/40 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                        <span className="text-xs font-mono text-slate-400">Formulating empathetic arguments...</span>
                        <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Double-checking professional guidelines.</p>
                      </div>
                    ) : generatedExtension ? (
                      <div className="flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-4">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-900">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                            ✉️ PROPOSED EMAIL DRAFT
                          </span>
                          <button
                            onClick={() => copyToClipboard(generatedExtension, setCopiedExtension)}
                            className="text-[10px] font-mono hover:text-white text-slate-400 flex items-center gap-1 bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-md hover:bg-slate-800 transition-all font-semibold"
                          >
                            {copiedExtension ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>Copy Message</span>
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={generatedExtension}
                          className="w-full flex-grow bg-transparent text-slate-200 text-xs font-mono leading-relaxed resize-none focus:outline-none min-h-[180px]"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/50 rounded-xl border border-dashed border-slate-850 text-center">
                        <Mail className="w-10 h-10 text-slate-700 mb-2" />
                        <span className="text-xs text-slate-500 font-semibold">Letter generation ready</span>
                        <p className="text-[10px] text-slate-650 max-w-xs mt-1">Select circumstances above and tap generate.</p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ACTION CONTENT: POMODORO FOCUS TIMER */}
              {activeMode === "pomodoro" && (
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  {timerAlert && (
                    <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs py-3 px-4 rounded-xl flex items-center gap-2 animate-bounce">
                      <Sparkles className="w-4 h-4 text-emerald-450 shrink-0" />
                      <span>{timerAlert}</span>
                    </div>
                  )}
                  
                  {/* Timer UI Display */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-slate-950 border border-slate-850">
                    
                    {/* Circle Timer dial */}
                    <div className="relative w-44 h-44 flex flex-col items-center justify-center border-4 border-slate-850 rounded-full bg-slate-900 shrink-0 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
                      <div className="text-slate-500 text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5">
                        {isTimerRunning ? "🚨 FOCUS BREWING" : "STANDBY"}
                      </div>
                      <div className="text-4xl font-extrabold text-white font-mono tracking-tight select-none">
                        {formatTime(timeLeft)}
                      </div>
                      <div className="text-[8px] font-mono text-indigo-400 mt-1 uppercase font-bold px-2 py-0.5 rounded bg-indigo-950/50 border border-indigo-900/30">
                        {timerPreset}m Block
                      </div>

                      {/* Progress dynamic ring background */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                          cx="88"
                          cy="88"
                          r="82"
                          fill="none"
                          stroke="#312e81"
                          strokeWidth="3"
                          className="opacity-30"
                        />
                        <circle
                          cx="88"
                          cy="88"
                          r="82"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                          strokeDasharray={2 * Math.PI * 82}
                          strokeDashoffset={2 * Math.PI * 82 * (1 - timeLeft / totalDuration)}
                          className="transition-all duration-1000"
                        />
                      </svg>
                    </div>

                    {/* Presets and play controls */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-2">
                          SELECT FOCUS METHOD SPRINT
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: "25m Sprint", mins: 25 },
                            { label: "15m Blitz", mins: 15 },
                            { label: "5m Anti-Procrastinate", mins: 5 },
                          ].map((x) => (
                            <button
                              key={x.mins}
                              onClick={() => handlePresetChange(x.mins as any)}
                              className={`py-1.5 text-[10px] font-bold uppercase rounded-md text-center transition-all border ${
                                timerPreset === x.mins
                                  ? "bg-indigo-650 text-white border-indigo-500/50 shadow-md"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                              }`}
                            >
                              {x.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsTimerRunning(!isTimerRunning)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isTimerRunning ? "bg-red-650 hover:bg-red-600 shadow-lg shadow-red-950/40" : "bg-emerald-650 hover:bg-emerald-600 shadow-lg shadow-emerald-950/40"
                          }`}
                        >
                          {isTimerRunning ? (
                            <>
                              <Pause className="w-4 h-4 text-white fill-white" />
                              <span>Pause Sprint</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 text-white fill-white" />
                              <span>Acquire Hyper-Focus</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handlePresetChange(timerPreset)}
                          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800"
                          title="Reset Timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 bg-indigo-950/20 px-3 py-2 rounded-lg border border-indigo-900/30">
                        <Coffee className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-[10px] font-mono text-indigo-300 leading-snug">
                          🏆 Cycles Complete: <strong>{completedSprints} Session(s)</strong>. Establish healthy rhythm checks.
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Physics & Audio alignment tips based on selected task category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                          RECOMMENDED NEURO-BETA AUDIO WAVES
                        </span>
                        <div className="font-bold text-xs text-indigo-300 mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                          {getFocusAudioTip(selectedTask.category).sound} ({getFocusAudioTip(selectedTask.category).frequency})
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                          {getFocusAudioTip(selectedTask.category).description}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block mb-1">
                          POMODORO BEAT PROCRASTINATION MILESTONES
                        </span>
                        
                        <div className="space-y-2 mt-2">
                          <label className="flex items-start gap-2 text-[11px] text-slate-350 cursor-pointer">
                            <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-3.5 h-3.5" />
                            <span>Read task details/rules or instructions.</span>
                          </label>
                          <label className="flex items-start gap-2 text-[11px] text-slate-350 cursor-pointer">
                            <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-3.5 h-3.5" />
                            <span>Set up drafting environment (IDE / Notebook).</span>
                          </label>
                          <label className="flex items-start gap-2 text-[11px] text-slate-350 cursor-pointer">
                            <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-1 focus:ring-indigo-500 w-3.5 h-3.5" />
                            <span>Work nonstop until the block countdown finishes!</span>
                          </label>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
