import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from "@google/genai";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("CRITICAL ERROR: GEMINI_API_KEY is not defined in environment variables or .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const CORE_WORDS = [
  // Animals
  "Tasu", "Tingau", "Kuda", "Sada", "Tombolog", "Sapi", "Gohung", "Vogok", "Manuk", "Karabau", "Kara",
  // Food
  "Tontohu", "Nansakan", "Waig", "Roun", "Momis", "Punti", "Gatas", "Tusi", "Hada", "Pontos",
  // Numbers
  "Iso", "Duo", "Tohu", "Apat", "Himo", "Onom", "Turu", "Wahu", "Siyam", "Hopod",
  // Phrases
  "Kotohuadan", "Kopivosian", "Kopivosian doungosuab", "Kopivosian doungosodop", "Poingkuro ko?", "Ada mihad", "Siou", "Langad zou dia", "Oo", "Amu", "Mongoi no ku",
  // Nature
  "Tadau", "Vuhan", "Bawang", "Rasam", "Rombituon", "Tusak", "Puun", "Nuhu",
  // Family
  "Ama", "Ina", "Tanak", "Aka", "Adi", "Tambalut", "Odu"
];

const outputFile = path.join(process.cwd(), 'src', 'data', 'preGeneratedAudio.json');

async function main() {
  console.log("=== KADAZAN APK OFFLINE AUDIO BUNDLE GENERATOR ===");
  console.log(`Target Words: ${CORE_WORDS.length}`);
  console.log(`Output File: ${outputFile}\n`);

  // 1. Read existing bundle to achieve fault tolerance
  let audioMap: Record<string, string> = {};
  if (fs.existsSync(outputFile)) {
    try {
      const data = fs.readFileSync(outputFile, 'utf8');
      audioMap = JSON.parse(data);
      console.log(`Loaded ${Object.keys(audioMap).length} already generated words.`);
    } catch (e) {
      console.warn("Could not read valid existing file, starting fresh.");
    }
  }

  // 2. Filter out words that already have audioclips to save token quotas and prevent duplicate API hits
  const missingWords = CORE_WORDS.filter(w => !audioMap[w.trim().toLowerCase()]);
  console.log(`Missing words to generate: ${missingWords.length}\n`);

  if (missingWords.length === 0) {
    console.log("SUCCESS: All core audio tracks are already bundled!");
    return;
  }

  // 3. Sequential synthesis to respect model rate limits (Gemini TPU queue)
  for (let i = 0; i < missingWords.length; i++) {
    const word = missingWords[i];
    const key = word.trim().toLowerCase();
    
    console.log(`[${i + 1}/${missingWords.length}] Generating offline high-quality speech for: "${word}"...`);
    
    let attempt = 0;
    let base64Audio = null;
    
    while (attempt < 3 && !base64Audio) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ 
            parts: [{ 
              text: `Pronounce the following text authentically as a native Kadazan speaker (similar to Malaysian/Indonesian phonetics but distinct to Sabah). Speak clearly: ${word}` 
            }] 
          }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          throw new Error("No audio payload returned in response candidates");
        }
      } catch (err: any) {
        attempt++;
        console.warn(`    Attempt ${attempt} failed: ${err.message || err}. Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (base64Audio) {
      audioMap[key] = base64Audio;
      // Write progressively to filesystem so we don't lose any data if interrupted or rate limited
      fs.writeFileSync(outputFile, JSON.stringify(audioMap, null, 2), 'utf8');
      console.log(`    Successfully saved base64 wave slice for "${key}" (~${Math.round(base64Audio.length / 1024)} KB)`);
    } else {
      console.error(`    CRITICAL ERROR: Failed to synthesize "${word}" after multiple attempts. Skipping...`);
    }

    // Small delay between requests to be polite to the TPU backend quota
    await new Promise(r => setTimeout(r, 600));
  }

  console.log("\n=== GENERATION RUN COMPLETED ===");
  console.log(`Total active bundled track mappings: ${Object.keys(audioMap).length}`);
}

main().catch(err => {
  console.error("Unhandled script failure:", err);
  process.exit(1);
});
