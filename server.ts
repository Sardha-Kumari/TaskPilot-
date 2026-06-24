import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for lazy loading Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it via the AI Studio Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ENDPOINT 1: AI Task Prioritization
app.post("/api/gemini/prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: "Invalid tasks provided." });
    }

    if (tasks.length === 0) {
      return res.json({ prioritizedTasks: [] });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert productivity coach. Below is a list of tasks with titles, descriptions, due dates, and custom durations.
Analyze their deadlines, estimated duration, and descriptions to prioritize them.
Return a valid JSON array where each object has:
- id: the original task's id
- priority: one of "high", "medium", or "low"
- reasoning: a clean, concise 1-sentence explanation of why it has this priority.

Tasks to prioritize:
${JSON.stringify(tasks, null, 2)}

Provide ONLY the raw JSON array in your response, starting with [ and ending with ]. Do not include markdown code block syntax (like \`\`\`json).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              priority: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["id", "priority", "reasoning"],
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json({ prioritizedTasks: parsedData });
  } catch (error: any) {
    console.warn("Gemini prioritization failed, activating high-fidelity rule-based coach fallback:", error);
    const fallbackTasks = (req.body.tasks || []).map((t: any) => {
      let priority = "low";
      let reasoning = "Local Backup Strategy: Standard routine prioritization.";
      const isHighUrgency = t.urgency === "high";
      const isMediumUrgency = t.urgency === "medium";
      let daysDiff = 999;
      if (t.dueDate) {
        try {
          const due = new Date(t.dueDate).getTime();
          const current = new Date("2026-06-23").getTime();
          daysDiff = (due - current) / (1000 * 60 * 60 * 24);
        } catch (e) {}
      }
      if (isHighUrgency || daysDiff <= 2) {
        priority = "high";
        reasoning = `Local Emergency Brain: High urgency or tight deadline (${daysDiff <= 0 ? 'due today' : daysDiff.toFixed(0) + ' days left'}). Focus immediately!`;
      } else if (isMediumUrgency || daysDiff <= 5) {
        priority = "medium";
        reasoning = `Local Emergency Brain: Moderate urgency and safe deadline (${daysDiff.toFixed(0)} days left). Proceed on normal cadence.`;
      } else {
        priority = "low";
        reasoning = "Local Emergency Brain: Long runway. Periodically monitor to avoid compounding task debt.";
      }
      return { id: t.id, priority, reasoning };
    });
    return res.json({ prioritizedTasks: fallbackTasks });
  }
});

// ENDPOINT 2: AI Plan Generation
app.post("/api/gemini/plan", async (req, res) => {
  try {
    const { tasks, habits, params } = req.body;
    const ai = getGeminiClient();

    const prompt = `Configure a custom daily study/work hourly timetable.
Tasks: ${JSON.stringify(tasks || [])}
Habits to track/maintain: ${JSON.stringify(habits || [])}
User parameters: ${JSON.stringify(params || {})}

Ensure all major urgent tasks are fit in, standard break intervals are added, and the plan is hyper-realistic. 
Return a JSON object with:
- plan: an array of hourly schedule blocks. Each block has:
  - time: string representing time slot (e.g. "09:00 AM - 10:30 AM")
  - title: title of the activity
  - type: 'task' | 'habit' | 'break' | 'meal' | 'leisure'
  - details: brief micro-instruction for focusing on this block (keep to 1 sentence)
- motivation: A 2-sentence encouraging AI quote specifically curated for this setup.

Return ONLY correct JSON matching this structure. Do not embed in markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  details: { type: Type.STRING },
                },
                required: ["time", "title", "type", "details"],
              },
            },
            motivation: { type: Type.STRING },
          },
          required: ["plan", "motivation"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Gemini daily plan failed, activating timetable synthesizer fallback:", error);
    const fallbackTasks = req.body.tasks || [];
    const fallbackHabits = req.body.habits || [];
    const plan: any[] = [];
    
    plan.push({
      time: "08:30 AM - 09:00 AM",
      title: "Oxygenate & Strategic Prep",
      type: "break",
      details: "Set daily intent, review goals, and hydrate before the work cycle begins."
    });

    if (fallbackTasks.length > 0) {
      plan.push({
        time: "09:00 AM - 10:30 AM",
        title: `Deep Focus: ${fallbackTasks[0].title}`,
        type: "task",
        details: "Top priority task sprint. Eliminate notifications and focus on core components."
      });
    } else {
      plan.push({
        time: "09:00 AM - 10:30 AM",
        title: "Deep Work Session I",
        type: "task",
        details: "Work on primary objectives without digital distractions."
      });
    }

    plan.push({
      time: "10:30 AM - 10:45 AM",
      title: "Tactical Respite & Hydration",
      type: "break",
      details: "Step away from screen, let eyes relax, and stretch your core muscles."
    });

    if (fallbackTasks.length > 1) {
      plan.push({
        time: "10:45 AM - 12:15 PM",
        title: `Deep Focus: ${fallbackTasks[1].title}`,
        type: "task",
        details: "Secondary focus sprint. Solve the hardest cognitive blocker now."
      });
    } else {
      plan.push({
        time: "10:45 AM - 12:15 PM",
        title: "Continuous Deep Work Session II",
        type: "task",
        details: "Drive projects forward using continuous execution patterns."
      });
    }

    plan.push({
      time: "12:15 PM - 01:00 PM",
      title: "Lunch & Recharging",
      type: "meal",
      details: "Choose protein-rich fuel to sustain cognitive focus throughout the afternoon."
    });

    if (fallbackHabits.length > 0) {
      plan.push({
        time: "01:00 PM - 01:30 PM",
        title: `Habit Integration: ${fallbackHabits[0].name || "Daily Routines"}`,
        type: "habit",
        details: "Engage in positive routines to maintain compounding streaks."
      });
    } else {
      plan.push({
        time: "01:00 PM - 01:30 PM",
        title: "Positive Habit Loop",
        type: "habit",
        details: "Complete small, repetitive micro-tasks that build physical and mental health."
      });
    }

    if (fallbackTasks.length > 2) {
      plan.push({
        time: "01:30 PM - 03:00 PM",
        title: `Resolution Sprint: ${fallbackTasks[2].title}`,
        type: "task",
        details: "Resolve minor tasks or complete detailed documentation reviews."
      });
    } else {
      plan.push({
        time: "01:30 PM - 03:00 PM",
        title: "Afternoon Flow Sprint",
        type: "task",
        details: "Process administrative checklists, code updates, or communication replies."
      });
    }

    plan.push({
      time: "03:00 PM - 03:15 PM",
      title: "Coffee/Tea Breather",
      type: "break",
      details: "Take a fast physical walk or do light breathing exercises."
    });

    plan.push({
      time: "03:15 PM - 04:30 PM",
      title: "Wrap-up & Workspace Cleanse",
      type: "leisure",
      details: "Organize files, check tomorrow's schedule, and decompress gracefully."
    });

    return res.json({
      plan,
      motivation: "Emergency local backup model active: Success is the sum of small, hyper-focused efforts repeated day in and day out. Keep striving!"
    });
  }
});

// ENDPOINT 3: AI Decompose Task
app.post("/api/gemini/decompose", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Task title is required to decompose." });
    }

    const ai = getGeminiClient();
    const prompt = `Break down the following complex task into 3-6 tiny, easily actionable, sequential bite-sized sub-steps:
Task Title: "${title}"
Description: "${description || "None provided"}"

Return a JSON array of strings containing only the clear sub-step action lines. Format: ["step 1", "step 2", ...]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsedData = JSON.parse(response.text || "[]");
    return res.json({ steps: parsedData });
  } catch (error: any) {
    console.warn("Gemini task decompose failed, returning structured fallback sub-steps:", error);
    const steps = [
      "Define requirements: Read all task specifications, criteria, and deadlines clearly.",
      "Skeletal draft: Outline your initial draft layout or compile a simple step-by-step checklist.",
      "Execution block: Block out a dedicated 25-minute Pomodoro cycle to complete the hardest part.",
      "Review and refine: Double check for typos, perform light self-audit, and submit before the deadline."
    ];
    return res.json({ steps });
  }
});

// ENDPOINT 4: AI Voice Parsing of New Tasks
app.post("/api/gemini/voice-parse", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Voice transcript content is empty." });
    }

    const ai = getGeminiClient();
    const prompt = `You are a smart micro-parser. Take this naturally spoken audio transcript and parse it into structured task details.
Transcript: "${transcript}"

Determine:
1. Title: A clean, concise title for the task
2. Category: Choose either "Work", "Study", "Personal", "Health", or "Financial" (default to "General" if not matching)
3. EstimateDuration: Estimated minutes of execution (default to 30 if not mentioned)
4. RelativeDeadline: YYYY-MM-DD or empty if not mentioned (calculate relative to current date 2026-06-23)
5. Urgency: 'high' if sounding urgent ('asap', 'tomorrow', 'today', 'immediately'), 'medium', or 'low'.

Return JSON strictly matching:
{
  "title": "...",
  "category": "...",
  "estimateDuration": 30,
  "dueDate": "YYYY-MM-DD or empty string",
  "urgency": "high" | "medium" | "low"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            estimateDuration: { type: Type.INTEGER },
            dueDate: { type: Type.STRING },
            urgency: { type: Type.STRING },
          },
          required: ["title", "category", "estimateDuration", "dueDate", "urgency"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({ parsedTask: parsedData });
  } catch (error: any) {
    console.warn("Gemini voice parsing failed, executing regex micro-parser:", error);
    const text = (req.body.transcript || "").toLowerCase();
    let category = "Personal";
    if (text.includes("work") || text.includes("report") || text.includes("meeting") || text.includes("office") || text.includes("client")) {
      category = "Work";
    } else if (text.includes("study") || text.includes("exam") || text.includes("homework") || text.includes("assignment") || text.includes("class") || text.includes("lecture")) {
      category = "Study";
    } else if (text.includes("health") || text.includes("gym") || text.includes("workout") || text.includes("run") || text.includes("doctor") || text.includes("meds")) {
      category = "Health";
    } else if (text.includes("pay") || text.includes("bill") || text.includes("rent") || text.includes("bank") || text.includes("tax") || text.includes("card")) {
      category = "Financial";
    }

    let urgency = "medium";
    if (text.includes("asap") || text.includes("urgent") || text.includes("immediately") || text.includes("today") || text.includes("tomorrow") || text.includes("emergency") || text.includes("now")) {
      urgency = "high";
    } else if (text.includes("later") || text.includes("sometime") || text.includes("next week")) {
      urgency = "low";
    }

    let estimateDuration = 45;
    const durationMatch = text.match(/(\d+)\s*(min|minute|hour)/);
    if (durationMatch) {
      const val = parseInt(durationMatch[1], 10);
      if (durationMatch[2].startsWith("hour")) {
        estimateDuration = val * 60;
      } else {
        estimateDuration = val;
      }
    }

    let dueDate = "2026-06-23";
    if (text.includes("tomorrow")) {
      dueDate = "2026-06-24";
    } else if (text.includes("next week") || text.includes("in a week")) {
      dueDate = "2026-06-30";
    }

    let title = (req.body.transcript || "").trim();
    if (title.length > 60) {
      title = title.substring(0, 57) + "...";
    }
    if (!title) {
      title = "Voice Task";
    }

    return res.json({
      parsedTask: {
        title,
        category,
        estimateDuration,
        dueDate,
        urgency
      }
    });
  }
});

// ENDPOINT 5: AI Productivity & Streak Analytics Report
app.post("/api/gemini/report", async (req, res) => {
  try {
    const { tasks, habits } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are an elite level performance coach analyzing dynamic user dashboard stats.
Current logged tasks: ${JSON.stringify(tasks || [])}
Habits & streak tracking: ${JSON.stringify(habits || [])}

Calculate & evaluate:
1. A realistic productivity score out of 100 based on completed tasks, on-time items, and active habits.
2. A high-risk tasks breakdown describing items nearing their deadlines.
3. Specific personalized study/work optimizations for students or professionals.
4. Habit loop feedback (streaks analysis, prompt actions).

Return JSON structure exactly:
{
  "score": 85,
  "insightSummary": "Detailed multi-sentence performance summary of the past week.",
  "achievements": ["achievement item 1", "achievement item 2"],
  "highRiskInsights": "Detail specific tasks which require instant intervention because they are overdue or due very soon.",
  "recommendations": ["A professional study planning recommendation text 1", "Actionable routine recommendation 2"],
  "habitStreaksFeedback": "Feedback addressing habit consistency and encouraging sustainable loops to hit targets."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            insightSummary: { type: Type.STRING },
            achievements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            highRiskInsights: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            habitStreaksFeedback: { type: Type.STRING },
          },
          required: ["score", "insightSummary", "achievements", "highRiskInsights", "recommendations", "habitStreaksFeedback"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Gemini report failed, producing rule-based coach insights:", error);
    const fallbackTasks = req.body.tasks || [];
    const fallbackHabits = req.body.habits || [];
    const totalCount = fallbackTasks.length;
    const completedCount = fallbackTasks.filter((t: any) => t.status === "completed").length;
    const activeHabitsCount = fallbackHabits.length;
    
    let score = 50;
    if (totalCount > 0) {
      score = Math.round((completedCount / totalCount) * 40) + 40;
    }
    if (activeHabitsCount > 0) {
      score += Math.min(activeHabitsCount * 4, 15);
    }
    score = Math.min(score, 98);

    const insightSummary = `Emergency Local Insights Mode: Your calculated productivity rating is currently ${score}%. You have completed ${completedCount} of your ${totalCount} active tasks. Sustaining daily habit streaks keeps your neural pathways primed for action.`;
    
    const achievements = [
      "Tactical Resilience: Formulating emergency timetables under high cognitive strain.",
      "Momentum Catalyst: Preserving positive habit loops and completion patterns."
    ];

    const highRiskInsights = totalCount > 0 
      ? `You have ${totalCount - completedCount} pending tasks. Prioritize items with High Urgency indicators or due dates within 48 hours to avoid deadline collisions.`
      : "No critical pending items logged in your local console. Workload is perfectly stabilized!";

    const recommendations = [
      "The 5-Minute Trick: Commit to working on your primary blocker task for just 5 minutes to break procrastination paralysis.",
      "Batch Administration: Schedule a single 45-minute afternoon block to process minor tasks, emails, and updates."
    ];

    const habitStreaksFeedback = "Consistency is much more powerful than intensity. Focus on completing your habits daily, even if only for 2 minutes, to keep streaks unbroken.";

    return res.json({
      score,
      insightSummary,
      achievements,
      highRiskInsights,
      recommendations,
      habitStreaksFeedback
    });
  }
});

// ENDPOINT 6: AI Task Starter Quickstart Draft
app.post("/api/gemini/rescue-draft", async (req, res) => {
  try {
    const { taskTitle, taskDescription, category, userNote } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required." });
    }
    const ai = getGeminiClient();
    const prompt = `The user is in a severe eleventh-hour rush to finish this task.
Create highly detailed, structured, professional layout or starting materials (e.g. outline, starter code skeleton, complete literature summary paragraph, document template structure, financial list, etc.) to help them skip the blank page phase and beat anxiety.
Task information:
- Title: "${taskTitle}"
- Category: "${category}"
- Context: "${taskDescription || "None provided"}"
- Custom user emphasis: "${userNote || "None specified"}"

Write extensive, premium quality starter content of around 300-500 words. Keep it strictly focused and usable. Format in clean markdown format. Return a JSON object with:
- draft: The complete compiled template/draft in markdown format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            draft: { type: Type.STRING },
          },
          required: ["draft"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Gemini rescue draft failed, creating starter scaffold template:", error);
    const categoryName = req.body.category || "General Task";
    const draft = `## 🚒 EMERGENCY QUICKSTART SCAFFOLD: "${req.body.taskTitle}"

This layout was auto-generated to bypass initial procrastination blockages and give you immediate momentum.

### 📋 1. Core Objectives
- Solve the main blocker for **${req.body.taskTitle}** immediately.
- Draft the initial rough template and verify formatting.
- Keep the scope restricted to the essential features required for submission.

### ⏱️ 2. Action Step Milestones (25-Minute Blitzes)
1. **Blitz 1 (First 25m):** Create the primary folder or document section. Put down the absolute simplest sentence or basic layout.
2. **Blitz 2 (Next 25m):** Compose the middle part (core arguments, calculations, code functions, or descriptions). Ignore perfectionism.
3. **Blitz 3 (Final 25m):** Proofread, format headers, double-check compliance with instructions, and package for submission.

### ✏️ 3. Boilerplate Template / Starting Arguments
*Use the lines below as your immediate starting point:*

> "Regarding **${req.body.taskTitle}** (Category: ${categoryName}), this document outlines the core deliverables, operational constraints, and priority outcomes required. The initial draft focuses on solving the primary functional blocker..."

*Next steps:* Expand on this sentence with your specific notes: **${req.body.taskDescription || "No notes provided"}**. Remember, a done draft beats an unsubmitted masterpiece!`;

    return res.json({ draft });
  }
});

// ENDPOINT 7: AI Extension Request Email
app.post("/api/gemini/rescue-extension", async (req, res) => {
  try {
    const { taskTitle, category, recipient, reason, tone } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required." });
    }
    const ai = getGeminiClient();
    const prompt = `Write a polite, highly persuasive, and professionally-composed message/email to a supervisor or peer to request an extension on a deadline for a task.
Task: "${taskTitle}" (${category})
Recipient: ${recipient}
Reason/excuse: ${reason}
Tone: ${tone}

Do NOT output bracket placeholders if possible, or make them clean. Include:
1. Subject line
2. Professional salutation
3. Earnest explanation of the blockage
4. Reassuring plan for completion (e.g. proposing a realistic new date or milestones)
5. Polite closing

Return a JSON object with:
- extensionText: The complete formatted letter/email text in markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extensionText: { type: Type.STRING },
          },
          required: ["extensionText"],
        },
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.warn("Gemini rescue extension failed, generating polite email draft:", error);
    const categoryName = req.body.category || "General Task";
    const extensionText = `### ✉️ PROPOSED EMAIL DRAFT (LOCAL BACKUP)

**Subject:** Request for Extension / Schedule Sync — "${req.body.taskTitle}"

Dear ${req.body.recipient || "Supervisor/Team"},

I hope this message finds you well.

I am writing to request a brief extension on the deadline for our upcoming task, **"${req.body.taskTitle}"**, which is currently scheduled for completion. 

Unfortunately, due to **${req.body.reason || "unexpected technical overhead"}**, I am experiencing temporary friction that directly impacts the overall quality of this deliverable. In order to ensure that my work meets professional and rigorous standards, I would deeply appreciate some additional time.

**Proposed Completion Plan:**
- I am actively working on the core components and aim to finalize the complete draft by this weekend.
- I can provide an interim status update or outline by tomorrow morning to demonstrate progress.

I sincerely apologize for any inconvenience or scheduling friction this adjustment may cause. Thank you very much for your understanding, flexibility, and support.

Kind regards,

[Your Name]
TaskPilot Assistant`;

    return res.json({ extensionText });
  }
});

// Setup dev server or static file hosting
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TaskPilot AI dynamic full-stack hub executing on port ${PORT}`);
  });
}

start();
