import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Define Gemini Client lazily if the key is available
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use body parsing middleware for JSON
  app.use(express.json());

  // API 1: Oracle calibration endpoint
  app.post('/api/oracle/calibrate', async (req, res) => {
    try {
      const { reflectionText, sessionCount, totalMinutes, activeTaskTitle } = req.body;

      if (!reflectionText || typeof reflectionText !== 'string' || !reflectionText.trim()) {
        res.status(400).json({ error: 'Reflection speech text is required for calibration.' });
        return;
      }

      // Check if GEMINI_API_KEY is set, if not, perform a highly authentic minimalist fallback
      if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY is missing. Using local model emulation mode.');
        
        // Let's hold a library of beautiful Oracle responses to match input keywords
        const text = reflectionText.toLowerCase();
        let fallbackResponse = "";
        
        if (text.includes('distract') || text.includes('phone') || text.includes('social') || text.includes('scrolling')) {
          fallbackResponse = `**Oracle Analysis**: High environmental noise detected. 
          
**Calibration status**: Divergent focus cues present.
          
**System Directive**: The digital realm is a current simulator designed to capture attention. Remove the sensory trigger entirely from view. Commit to one simple 15-minute high-density tick. Silence is not empty; it is a vacuum of potential.`;
        } else if (text.includes('tired') || text.includes('exhaust') || text.includes('burnout') || text.includes('sleep')) {
          fallbackResponse = `**Oracle Analysis**: Cognitive depletion identified. 
          
**Calibration status**: Physiological state below optimal concentration threshold.
          
**System Directive**: Continuing high friction exercises with a drained core produces diminished returns. Calibrate deep state recovery. Drink exactly one glass of pure water. Step outside into ambient solar light for 180 seconds. Let your vision extend to the furthest horizon.`;
        } else if (text.includes('anxious') || text.includes('stress') || text.includes('fear') || text.includes('worry')) {
          fallbackResponse = `**Oracle Analysis**: High internal frequency pressure.
          
**Calibration status**: Emotional background noise overrides analytical execute loops.
          
**System Directive**: Fear is simply anticipation running uncalibrated simulation code. Ground your tactile feedback immediately. Hold your desk surface for 10 seconds. Focus strictly on any one physical, physical texture. Breathe in deep and exhale at half speed. Break your main topic into sub-items containing no more than three sentences.`;
        } else {
          fallbackResponse = `**Oracle Analysis**: Attentional transition cycle active.
          
**Calibration status**: System is searching for a stable alignment axis. Current logged study ticks stand at ${sessionCount || 0} intervals, with ${totalMinutes || 0} minutes registered. Current focus node: "${activeTaskTitle || 'Indeterminate focus'}".
          
**System Directive**: True concentration is not an effort of forcing energy; it is the graceful elimination of secondary choice vectors. Clear your desk surface, sound standard white ambience generator, and allow your hands to align onto the physical task before you.`;
        }

        res.json({
          response: fallbackResponse,
          emulated: true,
          timestamp: Date.now()
        });
        return;
      }

      // Call the Google GenAI SDK
      const ai = getGeminiClient();
      
      const promptContext = `
User has spoken or written their reflections/barriers: "${reflectionText}"
Context:
- Current active task topic (if any): "${activeTaskTitle || 'No active topic'}"
- Total focus session intervals today: ${sessionCount || 0}
- Total focus minutes accumulated: ${totalMinutes || 0}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptContext,
        config: {
          systemInstruction: `You are "The Oracle", an ultra-minimalist, quiet, analytical cognitive mentor.
Your essence: Pure zen wisdom, quiet analytical precision, and calming system calibration.
Voice characteristics:
1. Extremely concise and minimalist.
2. Structure your replies using simple markdown blocks like "**Oracle Analysis**", "**Calibration status**", and "**System Directive**".
3. Highly objective, clinical yet peaceful. No cheerful exclamation points, no standard AI marketing phrases (e.g. "Sure, I can help with that!", "Absolutely! Let's get started", "In summary").
4. Treat focus as a cybernetic cognitive machine requiring micro-calibration and adjustment.
5. Provide 2-3 specific, actionable system-level directives in bullet points to reduce attentional friction.

Analyze the user's current reflections or barriers. Maintain an eye-safe, spacious vibe in formatting. Keep it to under 120 words total.`,
          temperature: 0.7,
        }
      });

      res.json({
        response: response.text || "Oracle connection was silent.",
        emulated: false,
        timestamp: Date.now()
      });

    } catch (err: any) {
      console.error('Oracle endpoint error:', err);
      res.status(500).json({ error: err.message || 'Calibration sequence failed' });
    }
  });

  // API 2: Foky AI Chatbot endpoint
  app.post('/api/foky/chat', async (req, res) => {
    try {
      const { messages, mode, temperature } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Messages array is required.' });
        return;
      }

      const lastUserMsg = messages[messages.length - 1]?.content || '';

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY is missing. Using Foky local AI fallback mode.');
        
        const lower = lastUserMsg.toLowerCase();
        let reply = "";

        if (lower.includes('schedule') || lower.includes('plan') || lower.includes('routine')) {
          reply = "Here is Foky's **High-Performance 2-Hour Pomodoro Schedule** 🎯:\n\n1. **Block A (25m)**: Deep Focus on your primary goal.\n2. **Break A (5m)**: Water & physical stretch.\n3. **Block B (25m)**: Practice problems or revision.\n4. **Break B (5m)**: Eye reset (look out window).\n5. **Block C (25m)**: Summarize key takeaways & notes.\n\nReady to get started? Set your timer to **25 mins**!";
        } else if (lower.includes('quiz') || lower.includes('test') || lower.includes('memory')) {
          reply = "🧠 **Foky Active Recall Challenge!**\n\nBefore you dive into your next focus block, answer this quick question in your head:\n\n*\"What is the single most important concept or sub-goal you need to master in the next 25 minutes?\"*\n\nOnce you have a crystal-clear answer, start your timer!";
        } else if (lower.includes('stats') || lower.includes('performance') || lower.includes('summary')) {
          reply = "📊 **Foky Focus Insight**\n\nEvery minute you spend in silent focus trains your prefrontal cortex to resist distractions! Consistency > intensity.\n\nPro Tip: Completing 3 focus sessions today (75 mins total) puts you in the top 10% of productive students for the day. Keep up the amazing momentum!";
        } else if (lower.includes('procrastinat') || lower.includes('lazy') || lower.includes('start')) {
          reply = "Hey! Procrastination is super normal when a task feels overwhelming. 🧠\n\nHere is Foky's 5-minute trick to start:\n\n1. **The 5-Minute Rule**: Tell yourself you'll only study for 5 minutes. If you want to stop after 5 mins, you can.\n2. **Clear the Desk**: Put away your phone or put it in Do Not Disturb.\n3. **Pick 1 Small Subtask**: Don't think about the whole exam or project—just open page 1 or write 1 sentence!\n\nWant to start a quick **15-min Spark Sprint** timer right now?";
        } else if (lower.includes('break') || lower.includes('rest') || lower.includes('tired')) {
          reply = "Great job working hard! Taking smart breaks is key to keeping your brain sharp. 🌿\n\nHere are 3 quick break ideas:\n- **Physical Reset**: Stand up, stretch your arms, and drink a glass of water.\n- **Eye Relief (20-20-20 Rule)**: Look at something 20 feet away for 20 seconds.\n- **Mindful Pause**: Take 5 slow, deep breaths.\n\nAvoid scrolling social media on breaks—it drains your dopamine! Ready for your next focus block when you are. ✨";
        } else if (lower.includes('focus') || lower.includes('concentrat') || lower.includes('distract')) {
          reply = "Let's lock in! ⚡ To boost focus right now:\n\n1. **Single-tasking**: Close extra tabs and phone notifications.\n2. **Set a clear micro-goal**: Tell yourself *'In this block, I will finish chapter 2.'*\n3. **Use FocusTick Timer**: Hit start and let the tick guide your attention.\n\nYou've got this! I'm right here cheering you on. 🎯";
        } else {
          reply = `Hi! I'm **Foky**, your AI Study Companion! 🤖✨\n\nI can help you:\n- Beat procrastination & build momentum\n- Plan optimal focus blocks & pomodoro schedules\n- Give effective study break ideas\n- Stay motivated throughout your study day\n\nHow is your focus going right now, or what are you studying today?`;
        }

        res.json({
          reply,
          emulated: true,
          timestamp: Date.now()
        });
        return;
      }

      // Format conversation history for Gemini
      const ai = getGeminiClient();
      
      // Determine persona prompt based on mode
      let personaInstruction = "Warm, enthusiastic, articulate, and supportive (like a smart study buddy).";
      if (mode === 'coach') {
        personaInstruction = "Strict, highly structured, direct, high-accountability focus coach. No excuses, actionable directives.";
      } else if (mode === 'socratic') {
        personaInstruction = "Socratic tutor style. Ask guiding questions to help the user think through problems step-by-step.";
      } else if (mode === 'exam') {
        personaInstruction = "Exam specialist. Focus heavily on active recall, spaced repetition, flashcard creation, and test-taking strategies.";
      }

      const systemInstruction = `You are "Foky", an AI study companion and productivity coach built into the FocusTick study workspace app.
Your mission is to help users stay motivated, conquer procrastination, organize their study goals, choose the right focus blocks, take refreshing breaks, and maintain high mental clarity.

Persona Mode (${mode || 'friendly'}):
- ${personaInstruction}
- Use clear formatting, bullet points, and clean bolding where helpful.
- Keep responses concise and engaging (usually 80-150 words).
- Use relevant emojis sparingly (e.g. ✨, 📚, ⏱️, 🎯, 🧠, 🌿) to feel friendly.
- Never use generic robotic filler like "As an AI model..." or "Sure thing! Here is what you requested."
- If the user asks about FocusTick, remind them they can pick Focus Quests (like 15m Spark Sprint, 25m Scholar Shield, 50m Zenith Marathon) or toggle Dark/Light mode.`;

      // Pass full conversation history
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: contents,
        config: {
          systemInstruction,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        }
      });

      res.json({
        reply: response.text || "Foky is listening silently! Try sending your question again.",
        emulated: false,
        timestamp: Date.now()
      });

    } catch (err: any) {
      console.error('Foky chat endpoint error:', err);
      res.status(500).json({ error: err.message || 'Foky chat failed' });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
