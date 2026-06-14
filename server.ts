import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { GoogleGenAI, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      const systemPrompt = `You are a professional Kadazan linguistic translator and dictionary.
Translate the input word or phrase to/from Standard Kadazan, English, and Sabah Malay.
Determine the language of the input, locate or construct the accurate translation, and provide the result strictly in this JSON format:
{
  "english": "English equivalent",
  "kadazan": "Standard Kadazan translation (correctly spelled)",
  "malay": "Standard Malay equivalent",
  "category": "General Category (e.g. Action, Greeting, Food, Object, Nature, Emotion, Custom)",
  "example": "A realistic, grammatically correct standard Kadazan sentence using the word",
  "exampleEnglish": "English translation of the Kadazan example sentence",
  "exampleMalay": "Malay translation of the Kadazan example sentence",
  "explanation": "A concise, friendly, high-quality note explaining the pronunciation, cultural context, or grammatical details (like prefixes/suffixes used) of the Kadazan word."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate and analyze this word or phrase: "${text}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
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
