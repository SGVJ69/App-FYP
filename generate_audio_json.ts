import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("No API Key");
  process.exit(1);
}

const aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const words = [
  "Tasu", "Tingau", "Tombolog", "Sada", "Manuk",
  "Tontohu", "Nansakan", "Waig", "Roun", "Momis", "Hada",
  "Iso", "Duo", "Tohu", "Apat", "Hopod",
  "Kotohuadan", "Kopivosian", "Kopivosian doungosuab", "Poingkuro ko?", "Langad zou dia",
  "Tadau", "Vuhan", "Bawang", "Puun", "Nuhu",
  "Ama", "Ina", "Tanak", "Tobpinai", "Odu",
  "Kotohuadan kio.", "Apat tasu ku.", "Agayo Bawang Penampang.",
  "Totoloo nodi ih tanak.", "Pana kinohodion tadau.", "Avang kopio ih vuhan.",
  "Koupusan ku ih ina ku."
];

async function generate() {
  const result: Record<string, string> = {};
  for (const word of words) {
    if (result[word]) continue;
    console.log(`Generating for: ${word}`);
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Pronounce the following text authentically as a native Kadazan speaker (similar to Malaysian/Indonesian phonetics but distinct to Sabah). Speak clearly: ${word}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        result[word] = base64Audio;
      }
    } catch (e: any) {
       console.error("Failed", word, e.message || e);
    }
    await new Promise(r => setTimeout(r, 1000)); // rate limit just in case
  }
  
  fs.writeFileSync(path.resolve('public/audio_data.json'), JSON.stringify(result));
  console.log('✅ Wrote audio_data.json');
}

generate();
