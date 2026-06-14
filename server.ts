import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS Middleware to allow requests from the Android WebView / APK (file:// or localhost origin)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // API Route: Translation Proxy
  app.post("/api/translate", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = `You are a professional Kadazan linguistic translator and dictionary master specializing in the standard coastal Kadazan dialect.
Your task is to translate any user input (word, phrase, or sentence) to/from Standard Kadazan, English, and Sabah Malay.

KEY DIRECTIVES:
1. Identify the input language (especially standard Malay words from the authoritative Kamus Dewan compiled by Dewan Bahasa dan Pustaka, English, or Kadazan) and generate an elite, educational, scholarly bilingual mapping.
2. If the concept is a complex or literary Kamus Dewan Malay term, construct an authentic Kadazan equivalent using proper morphological affixes (such as ko-, moki-, po-, -an, -on), compound structures, or descriptive phrases. Ensure 'kadazan' is NEVER empty, 'N/A', or 'Unknown'.
3. Formulate a highly natural, grammatically correct example sentence ('example') in Standard Coastal Kadazan incorporating the translated word/phrase.
4. Translate this example sentence perfectly to English ('exampleEnglish') and Standard/Sabah Malay ('exampleMalay').
5. In your linguistic explanation ('explanation'), explicitly highlight the classical or modern Kamus Dewan Malay root, how it aligns with the Kadazan translation, and a clear, simple guide on Kadazan pronunciation (e.g., glottal stops or double vowels). Do not mention machine-learning; act as an authoritative Sabahan dictionary.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate and provide standard definitions for: "${text}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "Accurate English translation or original word" },
              kadazan: { type: Type.STRING, description: "Standard Kadazan translation (NEVER empty or N/A)" },
              malay: { type: Type.STRING, description: "Sabah Malay translation" },
              category: { type: Type.STRING, description: "Category of the word/phrase (e.g., Action, Greeting, Food, Object, Nature, Custom, General)" },
              example: { type: Type.STRING, description: "Realistic standard Kadazan example sentence using the word" },
              exampleEnglish: { type: Type.STRING, description: "English translation of the example sentence" },
              exampleMalay: { type: Type.STRING, description: "Malay translation of the example sentence" },
              explanation: { type: Type.STRING, description: "Fascinating linguistic details, root words, or pronunciation guides of the Kadazan word" }
            },
            required: ["english", "kadazan", "malay", "category", "example", "exampleEnglish", "exampleMalay", "explanation"]
          }
        },
      });

      const textResult = response.text;
      if (textResult) {
        const parsed = JSON.parse(textResult);
        return res.json({
          english: parsed.english || text,
          kadazan: parsed.kadazan || '',
          malay: parsed.malay || '',
          category: parsed.category || 'Dictionary Lookup',
          imageUrl: 'https://images.unsplash.com/photo-1544640808-32ca72ac7f37?auto=format&fit=crop&q=80&w=600',
          example: parsed.example || '',
          exampleEnglish: parsed.exampleEnglish || '',
          exampleMalay: parsed.exampleMalay || '',
          explanation: parsed.explanation || 'Verified Standard Kadazan Definition.',
          success: true
        });
      } else {
        throw new Error("Empty response from Gemini API");
      }
    } catch (error: any) {
      console.error("Server translation error:", error);
      return res.status(500).json({
        error: "Failed to translate word",
        details: error.message || String(error)
      });
    }
  });

  // API Route: TTS Pronunciation Proxy
  app.post("/api/speech", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Pronounce the following text authentically as a native Kadazan speaker (similar to Malaysian/Indonesian phonetics but distinct to Sabah). Speak clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ base64Audio });
      } else {
        throw new Error("No audio payload returned from Gemini API");
      }
    } catch (error: any) {
      console.error("Server speech error:", error);
      return res.status(500).json({
        error: "Failed to generate pronunciation",
        details: error.message || String(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
