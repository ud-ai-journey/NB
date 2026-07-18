import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 image uploads

const PORT = 3000;

// Lazy initialize Google Gen AI safely to prevent startup crashes if keys are not configured
let aiInstance: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Configure it in the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper for model name
const MODEL_NAME = "gemini-3.5-flash";

interface AIResult {
  text: string;
  provider: "Gemini" | "OpenAI";
}

// Global failover AI caller supporting multimodal images
async function callAIEngine(
  systemInstruction: string,
  prompt: string | any[],
  responseSchema?: any,
  temperature = 0.7,
  image?: { mimeType: string; data: string }
): Promise<AIResult> {
  // 1. Try Gemini first
  try {
    console.log("Attempting Gemini API call...");
    const ai = getAIClient();

    let contents: any;
    if (typeof prompt === "string") {
      if (image) {
        contents = {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.data,
              },
            },
          ],
        };
      } else {
        contents = prompt;
      }
    } else {
      // Map message history to Gemini format
      contents = prompt.map((m: any, idx: number) => {
        const isLast = idx === prompt.length - 1;
        const parts: any[] = [{ text: m.text || "" }];
        if (isLast && image && m.role === "user") {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
        return {
          role: m.role === "user" ? "user" : "model",
          parts,
        };
      });
    }

    const config: any = {
      systemInstruction,
      temperature,
    };

    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config,
    });

    if (response && response.text) {
      return {
        text: response.text,
        provider: "Gemini",
      };
    }
    throw new Error("Empty response from Gemini");
  } catch (geminiError: any) {
    console.warn("Gemini API call failed, falling back to OpenAI. Error:", geminiError.message || geminiError);

    // 2. Fallback to OpenAI
    try {
      console.log("Attempting OpenAI API call...");
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not defined.");
      }

      const messages: any[] = [{ role: "system", content: systemInstruction }];

      if (typeof prompt === "string") {
        if (image) {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
            ],
          });
        } else {
          messages.push({ role: "user", content: prompt });
        }
      } else {
        // Map message history to OpenAI format
        prompt.forEach((m: any, idx: number) => {
          const isLast = idx === prompt.length - 1;
          const role = m.role === "user" ? "user" : "assistant";
          if (isLast && image && m.role === "user") {
            messages.push({
              role,
              content: [
                { type: "text", text: m.text || "" },
                { type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
              ],
            });
          } else {
            messages.push({
              role,
              content: m.text || "",
            });
          }
        });
      }

      const body: any = {
        model: "gpt-4o-mini",
        messages,
        temperature,
      };

      if (responseSchema) {
        body.response_format = { type: "json_object" };
        body.messages.push({
          role: "system",
          content: `CRITICAL: You MUST return a JSON object strictly matching this schema: ${JSON.stringify(responseSchema)}`,
        });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API failed with status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content) {
        return {
          text: content,
          provider: "OpenAI",
        };
      }
      throw new Error("Empty response from OpenAI");
    } catch (openAiError: any) {
      console.error("OpenAI API call also failed. Both LLM engines down.", openAiError);
      throw new Error(`AI System Unavailable. (Gemini: ${geminiError.message || geminiError}, OpenAI: ${openAiError.message || openAiError})`);
    }
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Generate Action Plan Route
app.post("/api/coaching/generate-plan", async (req, res) => {
  try {
    const { habitName, category, currentLevel, targetGoal, triggers, recentLogs } = req.body;

    if (!habitName || !category) {
      return res.status(400).json({ error: "habitName and category are required." });
    }

    let logsPrompt = "";
    if (recentLogs && recentLogs.length > 0) {
      logsPrompt = `
Here are the user's actual recently recorded cravings/slips for this habit:
${JSON.stringify(recentLogs.slice(0, 10), null, 2)}
Please analyze these actual logs. In your generated 'summary' and phased roadmap, explicitly refer to this data or trigger trends (for example, if they slip mostly at night due to boredom, or are highly successful at resisting during stress, customize your response to address these real patterns). Keep it compassionate.`;
    }

    const systemInstruction = `You are an expert cognitive behavioral therapist (CBT) and addiction recovery coach. 
Your goal is to generate a comprehensive, compassionate, and highly customized Action Plan to help a user reduce or overcome a harmful habit.
Ensure the mitigation strategies are creative, realistic, and tailored to the specific triggers and actual log history provided. 
Structure the plan strictly matching the JSON schema.`;

    const prompt = `Create an action plan for the habit: "${habitName}" (Category: ${category}).
Current level of usage: ${currentLevel || "Not specified"}.
Target/ideal level: ${targetGoal || "Complete cessation"}.
User's triggers/stress factors: ${triggers || "Boredom, stress"}.${logsPrompt}

Generate a supportive title, a brief summary explaining the habit loop, 3 strategic progressive phases for reduction/overcoming, 3 trigger mitigation and replacement strategies, and 3 actionable daily habits.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A highly motivating title for this action plan" },
        summary: { type: Type.STRING, description: "A 2-3 sentence CBT explanation of the user's habit loop and reward system" },
        phases: {
          type: Type.ARRAY,
          description: "3 progressive weekly or phased goals for reduction",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING, description: "Specific goals and actions for this phase" },
              duration: { type: Type.STRING, description: "e.g., 'Week 1', 'Phase 2'" }
            },
            required: ["title", "description", "duration"]
          }
        },
        triggerStrategies: {
          type: Type.ARRAY,
          description: "Actionable plans for high-risk situations",
          items: {
            type: Type.OBJECT,
            properties: {
              trigger: { type: Type.STRING, description: "The specific trigger scenario" },
              mitigation: { type: Type.STRING, description: "Cognitive reframe or environmental modification" },
              replacement: { type: Type.STRING, description: "Healthy, dopamine-equivalent habit replacement" }
            },
            required: ["trigger", "mitigation", "replacement"]
          }
        },
        dailyHabits: {
          type: Type.ARRAY,
          description: "3 positive, simple habits to replace the target behavior",
          items: { type: Type.STRING }
        },
        mindsetShift: { type: Type.STRING, description: "A simple mantra or cognitive reframe to remember during urges" }
      },
      required: ["title", "summary", "phases", "triggerStrategies", "dailyHabits", "mindsetShift"]
    };

    const aiResult = await callAIEngine(systemInstruction, prompt, responseSchema, 0.7);
    const jsonText = aiResult.text.trim();
    const data = JSON.parse(jsonText);
    data.aiProvider = aiResult.provider;
    res.json(data);
  } catch (error: any) {
    console.error("Error in generate-plan:", error);
    res.status(500).json({ error: error.message || "Failed to generate action plan" });
  }
});

// 2. Adaptive Coaching Chat Route
app.post("/api/coaching/chat", async (req, res) => {
  try {
    const { messages, habitContext, recentLogs, image } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    let adaptivityContext = "";
    if (recentLogs && recentLogs.length > 0) {
      adaptivityContext = `
Here is actual craving/slip data recorded by this user recently:
${JSON.stringify(recentLogs.slice(0, 6), null, 2)}
Please use this log history to deliver fully adaptive coaching. If they have had many slips, be comforting, analyze patterns, and help them strategize. If they have had high success ('surfed' or 'resisted'), praise their efforts and mention their success rate!`;
    }

    const systemInstruction = `You are a supportive, warm, and highly skilled habit change coach. 
You specialize in CBT, motivational interviewing, and mindfulness techniques (like Urge Surfing).
The user is working to break/reduce a habit: ${habitContext ? JSON.stringify(habitContext) : "a bad habit"}.${adaptivityContext}
Your tone should be:
- Empathetic and non-judgmental (never lecture or shame).
- Highly actionable, offering 1 practical tip or prompt at a time.
- Encouraging, treating slips as natural learning steps.
- Avoid writing long, dry walls of text. Keep responses focused, conversational, and split into readable short paragraphs (max 120-150 words).`;

    const aiResult = await callAIEngine(systemInstruction, messages, null, 0.7, image);
    res.json({ text: aiResult.text, aiProvider: aiResult.provider });
  } catch (error: any) {
    console.error("Error in coaching chat:", error);
    res.status(500).json({ error: error.message || "Failed to get chat response" });
  }
});

// 3. Analyze Urges Route
app.post("/api/coaching/analyze-urges", async (req, res) => {
  try {
    const { urges, habitName } = req.body;

    if (!urges || !Array.isArray(urges)) {
      return res.status(400).json({ error: "urges array is required." });
    }

    const systemInstruction = `You are a professional behavioral analyst.
Analyze the user's habit urge logs and provide an empathetic, data-driven synthesis of their patterns.
Identify primary high-risk times, key triggers, rate of success (surfed vs. slipped), and outline 3 concrete, personalized recommendations to improve success rate.
Ensure the feedback is strictly formatted as JSON.`;

    const prompt = `Analyze logs for habit: "${habitName || "General Habit"}".
Logs:
${JSON.stringify(urges, null, 2)}

Provide clear, structural analysis including risk factors, trigger breakdown, and actionable steps to bypass future cravings.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        timeAnalysis: { type: Type.STRING, description: "A summary of high-risk times or situations identified in the logs" },
        triggerInsights: { type: Type.STRING, description: "Psychological explanation of why these triggers are causing cravings" },
        statisticsSummary: { type: Type.STRING, description: "An encouraging summary of their success rates (e.g. 'You surfed 60% of urges')" },
        recommendations: {
          type: Type.ARRAY,
          description: "3 highly tailored behavioral therapy action items",
          items: { type: Type.STRING }
        }
      },
      required: ["timeAnalysis", "triggerInsights", "statisticsSummary", "recommendations"]
    };

    const aiResult = await callAIEngine(systemInstruction, prompt, responseSchema, 0.4);
    const jsonText = aiResult.text.trim();
    const data = JSON.parse(jsonText);
    data.aiProvider = aiResult.provider;
    res.json(data);
  } catch (error: any) {
    console.error("Error in analyze-urges:", error);
    res.status(500).json({ error: error.message || "Failed to analyze urges" });
  }
});

// 4. Quick Support / Urge Surfing Emergency Route
app.post("/api/coaching/quick-support", async (req, res) => {
  try {
    const { intensity, trigger, context, habitName } = req.body;

    const systemInstruction = `You are an emergency crisis support coach for breaking harmful habits.
The user is experiencing an ACUTE, immediate craving right now.
Deliver a 3-step practical 'Urge Surfing' or mindfulness meditation technique designed to guide them safely through the next 5-10 minutes.
Keep your response short, extremely direct, calming, and highly sensory (using deep breathing, grounding, body awareness, and physical anchors).
Ensure the result is formatted as JSON.`;

    const prompt = `The user is having an intense urge to engage in "${habitName || "their habit"}" right now.
Intensity: ${intensity || 7}/10.
Trigger: ${trigger || "Not specified"}.
Context: ${context || "Not specified"}.

Give them an immediate, grounding exercise to weather this urge.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING, description: "A calming, anchor-phrase to say immediately" },
        steps: {
          type: Type.ARRAY,
          description: "3 simple, consecutive steps to take over the next 5 minutes",
          items: { type: Type.STRING }
        },
        reframe: { type: Type.STRING, description: "A supportive reframe about how urges peak and dissolve like waves" }
      },
      required: ["headline", "steps", "reframe"]
    };

    const aiResult = await callAIEngine(systemInstruction, prompt, responseSchema, 0.6);
    const jsonText = aiResult.text.trim();
    const data = JSON.parse(jsonText);
    data.aiProvider = aiResult.provider;
    res.json(data);
  } catch (error: any) {
    console.error("Error in quick-support:", error);
    res.status(500).json({ error: error.message || "Failed to generate urge support" });
  }
});

// 5. Daily Reflection Route
app.post("/api/coaching/reflection", async (req, res) => {
  try {
    const { mood, complianceRate, reflectionText, currentHabits } = req.body;

    const systemInstruction = `You are a compassionate, weekly/daily check-in coach.
The user is reflecting on their habits. Give them highly personalized, encouraging feedback based on their current state and mood.
Validate their struggle if they failed, cheer them on if they succeeded, and provide one targeted tip. Keep it to 100 words max.`;

    const prompt = `Daily Reflection details:
Mood: ${mood}
Habit compliance/success rate today: ${complianceRate}/5
Reflection diary: "${reflectionText || "No journal notes provided."}"
Active habit goals: ${JSON.stringify(currentHabits || [])}

Give a direct, warm, supportive coach response.`;

    const aiResult = await callAIEngine(systemInstruction, prompt, null, 0.7);
    res.json({ text: aiResult.text, aiProvider: aiResult.provider });
  } catch (error: any) {
    console.error("Error in reflection coaching:", error);
    res.status(500).json({ error: error.message || "Failed to analyze reflection" });
  }
});

// ----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------
async function setupServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer();
