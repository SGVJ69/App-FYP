
import { WordPair, QuizQuestion, SpellingChallenge } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface SentenceChallenge {
  english: string;
  kadazan: string;
  malay: string;
  distractors: string[];
}

export const STATIC_VOCABULARY: Record<string, WordPair[]> = {
  'Animals': [
    { english: 'Dog', kadazan: 'Tasu', malay: 'Anjing', example: 'Agayo ilo tasu.', exampleEnglish: 'That dog is big.', exampleMalay: 'Anjing itu besar.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600' },
    { english: 'Cat', kadazan: 'Tingau', malay: 'Kucing', example: 'Tingau ku diti.', exampleEnglish: 'This is my cat.', exampleMalay: 'Ini kucing saya.', category: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600' },
    { english: 'Horse', kadazan: 'Kuda', malay: 'Kuda', example: 'Agayo ilo kuda.', exampleEnglish: 'That horse is big.', exampleMalay: 'Kuda itu besar.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Horse_December_2014-1.jpg' },
    { english: 'Fish', kadazan: 'Sada', malay: 'Ikan', example: 'Aso sada id taang.', exampleEnglish: 'There is no fish in the market.', exampleMalay: 'Tiada ikan di pasar.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Oreochromis-niloticus-Nairobi.JPG/960px-Oreochromis-niloticus-Nairobi.JPG' },
    { english: 'Chicken', kadazan: 'Manuk', malay: 'Ayam', example: 'Panggulon ku ih manuk.', exampleEnglish: 'I will hit the chicken.', exampleMalay: 'Saya akan pukul ayam itu.', category: 'Animals', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Male_and_female_chicken_sitting_together.jpg' }
  ],
  'Food': [
    { english: 'Egg', kadazan: 'Tontohu', malay: 'Telur', example: 'Mangakan zou tontohu.', exampleEnglish: 'I am eating an egg.', exampleMalay: 'Saya makan telur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=600' },
    { english: 'Cooked Rice', kadazan: 'Nansakan', malay: 'Nasi', example: 'Aso nansakan di dogo.', exampleEnglish: 'I do not have cooked rice.', exampleMalay: 'Saya tiada nasi.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&q=80&w=600' },
    { english: 'Water', kadazan: 'Waig', malay: 'Air', example: 'Onuai zou waig ahuma.', exampleEnglish: 'Give me warm water.', exampleMalay: 'Beri saya air suam.', category: 'Food', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Glass_of_water.jpg/960px-Glass_of_water.jpg' },
    { english: 'Vegetable', kadazan: 'Roun', malay: 'Sayur', example: 'Amu zou mangakan roun.', exampleEnglish: 'I do not eat vegetables.', exampleMalay: 'Saya tidak makan sayur.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600' },
    { english: 'Sweet', kadazan: 'Momis', malay: 'Manis', example: 'Momis kopio kinotuan diti.', exampleEnglish: 'This vegetable is very sweet.', exampleMalay: 'Sayur ini sangat manis.', category: 'Food', imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600' },
    { english: 'Chili', kadazan: 'Hada', malay: 'Cili', example: 'Aagang kopio hada diti.', exampleEnglish: 'This chili is very red in color.', exampleMalay: 'Cili ini sangat merah warnanya.', category: 'Food', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Thai_peppers.jpg/960px-Thai_peppers.jpg' }
  ],
  'Numbers': [
    { english: 'One', kadazan: 'Iso', malay: 'Satu', example: 'Iso nopoh.', exampleEnglish: 'Only one.', exampleMalay: 'Satu sahaja.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/264653/ffffff?text=1&font=Playfair+Display' },
    { english: 'Two', kadazan: 'Duo', malay: 'Dua', example: 'Onuai zou duo.', exampleEnglish: 'Give me two.', exampleMalay: 'Beri saya dua.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/2a9d8f/ffffff?text=2&font=Playfair+Display' },
    { english: 'Three', kadazan: 'Tohu', malay: 'Tiga', example: 'Tohu tulun ti.', exampleEnglish: 'There are three people.', exampleMalay: 'Ada tiga orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e9c46a/000000?text=3&font=Playfair+Display' },
    { english: 'Four', kadazan: 'Apat', malay: 'Empat', example: 'Apat tasu ku.', exampleEnglish: 'I have four dogs.', exampleMalay: 'Saya ada empat anjing.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/f4a261/000000?text=4&font=Playfair+Display' },
    { english: 'Ten', kadazan: 'Hopod', malay: 'Sepuluh', example: 'Hopod tulun.', exampleEnglish: 'Ten people.', exampleMalay: 'Sepuluh orang.', category: 'Numbers', imageUrl: 'https://placehold.co/600x400/e76f51/ffffff?text=10&font=Playfair+Display' }
  ],
  'Phrases': [
    { english: 'Thank you', kadazan: 'Kotohuadan', malay: 'Terima kasih', example: 'Kotohuadan kio.', exampleEnglish: 'Thank you very much.', exampleMalay: 'Terima kasih banyak-banyak.', category: 'Phrases', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/US_ambassador_Kamala_Shirin_Lakhdhir_with_Kaamatan_pageants_during_a_visit_to_Likas_Hospital_of_Sabah.jpg/960px-US_ambassador_Kamala_Shirin_Lakhdhir_with_Kaamatan_pageants_during_a_visit_to_Likas_Hospital_of_Sabah.jpg' },
    { english: 'Welcome', kadazan: 'Kopivosian', malay: 'Selamat datang', example: 'Kopivosian id sodopon.', exampleEnglish: 'Welcome to tonight.', exampleMalay: 'Selamat datang malam ini.', category: 'Phrases', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/KAAMATAN_15.jpg/960px-KAAMATAN_15.jpg' },
    { english: 'Good morning', kadazan: 'Kopivosian doungosuab', malay: 'Selamat pagi', example: 'Kopivosian doungosuab songian.', exampleEnglish: 'Good morning everyone.', exampleMalay: 'Selamat pagi semua.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=600' },
    { english: 'How are you?', kadazan: 'Poingkuro ko?', malay: 'Apa khabar?', example: 'Poingkuro ko baino?', exampleEnglish: 'How are you today?', exampleMalay: 'Apa khabar hari ini?', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=600' },
    { english: 'I love you', kadazan: 'Langad zou dia', malay: 'Saya sayang awak', example: 'Langad zou dia kopio.', exampleEnglish: 'I love you so much.', exampleMalay: 'Saya sangat sayang awak.', category: 'Phrases', imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=600' }
  ],
  'Nature': [
    { english: 'Sun', kadazan: 'Tadau', malay: 'Matahari', example: 'Pana kinohodion tadau.', exampleEnglish: 'The sun is hot today.', exampleMalay: 'Matahari panas hari ini.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sun_icon%2C_yellow.svg/1024px-Sun_icon%2C_yellow.svg.png' },
    { english: 'Moon', kadazan: 'Vuhan', malay: 'Bulan', example: 'Avang kopio ih vuhan.', exampleEnglish: 'The moon is very bright.', exampleMalay: 'Bulan itu sangat terang.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/960px-FullMoon2010.jpg' },
    { english: 'River', kadazan: 'Bawang', malay: 'Sungai', example: 'Agayo Bawang Penampang.', exampleEnglish: 'Penampang River is big.', exampleMalay: 'Sungai Penampang besar.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Kinabatangan_River_%2814154417142%29.jpg/960px-Kinabatangan_River_%2814154417142%29.jpg' },
    { english: 'Tree', kadazan: 'Puun', malay: 'Pokok', example: 'Adalaan kawanit puun diti.', exampleEnglish: 'This tree is very tall.', exampleMalay: 'Pokok ini sangat tinggi.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Usamljeni_jasen_-_panoramio_%28cropped%29.jpg/960px-Usamljeni_jasen_-_panoramio_%28cropped%29.jpg' },
    { english: 'Mountain', kadazan: 'Nuhu', malay: 'Gunung', example: 'Nuhu Kinabalu.', exampleEnglish: 'Mount Kinabalu.', exampleMalay: 'Gunung Kinabalu.', category: 'Nature', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/960px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg' }
  ],
  'Family': [
    { english: 'Father', kadazan: 'Ama', malay: 'Bapa', example: 'Mongoi zou id ama ku.', exampleEnglish: 'I am going to my father.', exampleMalay: 'Saya pergi ke bapa saya.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&q=80&w=600' },
    { english: 'Mother', kadazan: 'Ina', malay: 'Ibu', example: 'Koupusan ku ih ina ku.', exampleEnglish: 'I love my mother.', exampleMalay: 'Saya sayang ibu saya.', category: 'Family', imageUrl: './images/mother.jpg' },
    { english: 'Child', kadazan: 'Tanak', malay: 'Anak', example: 'Totoloo nodi ih tanak.', exampleEnglish: 'The child is crying.', exampleMalay: 'Anak itu menangis.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1544365558-35aa4afcf11f?auto=format&fit=crop&q=80&w=600' },
    { english: 'Sibling', kadazan: 'Tobpinai', malay: 'Keluarga/Adik-beradik', example: 'Kotiop tobpinai ku diti.', exampleEnglish: 'My siblings are many.', exampleMalay: 'Adik-beradik saya ramai.', category: 'Family', imageUrl: './images/siblings.jpg' },
    { english: 'Grandparent', kadazan: 'Odu', malay: 'Nenek/Datuk', example: 'Minsoi odu id kampung.', exampleEnglish: 'Grandparent went to the village.', exampleMalay: 'Nenek ke kampung.', category: 'Family', imageUrl: 'https://images.unsplash.com/photo-1626315869436-d68aeb165eed?auto=format&fit=crop&q=80&w=600' }
  ]
};

export const STATIC_QUIZZES: Record<string, QuizQuestion[]> = {
  'Animals': [
    { question: 'What is "Dog" in Kadazan?', options: ['Tingau', 'Tasu', 'Manuk', 'Kuda'], correctAnswer: 'Tasu', explanation: 'Tasu means Dog (Anjing).' },
    { question: 'What is "Cat" in Kadazan?', options: ['Tingau', 'Tasu', 'Sada', 'Kuda'], correctAnswer: 'Tingau', explanation: 'Tingau means Cat (Kucing).' },
    { question: 'What is "Horse" in Kadazan?', options: ['Sada', 'Tingau', 'Kuda', 'Manuk'], correctAnswer: 'Kuda', explanation: 'Kuda means Horse (Kuda).' },
    { question: 'What is "Fish" in Kadazan?', options: ['Manuk', 'Tasu', 'Tingau', 'Sada'], correctAnswer: 'Sada', explanation: 'Sada means Fish (Ikan).' }
  ],
  'Food': [
    { question: 'What is "Cooked Rice" in Kadazan?', options: ['Waig', 'Roun', 'Nansakan', 'Hada'], correctAnswer: 'Nansakan', explanation: 'Nansakan means Cooked Rice (Nasi).' },
    { question: 'What is "Water" in Kadazan?', options: ['Momis', 'Waig', 'Nansakan', 'Hada'], correctAnswer: 'Waig', explanation: 'Waig means Water (Air).' },
    { question: 'What is "Vegetable" in Kadazan?', options: ['Roun', 'Hada', 'Nansakan', 'Waig'], correctAnswer: 'Roun', explanation: 'Roun means Vegetable (Sayur).' },
    { question: 'What is "Sweet" in Kadazan?', options: ['Momis', 'Waig', 'Roun', 'Hada'], correctAnswer: 'Momis', explanation: 'Momis means Sweet (Manis).' }
  ],
  'Numbers': [
    { question: 'What is "One" in Kadazan?', options: ['Duo', 'Tohu', 'Iso', 'Apat'], correctAnswer: 'Iso', explanation: 'Iso means One (Satu).' },
    { question: 'What is "Two" in Kadazan?', options: ['Iso', 'Duo', 'Apat', 'Tohu'], correctAnswer: 'Duo', explanation: 'Duo means Two (Dua).' },
    { question: 'What is "Three" in Kadazan?', options: ['Tohu', 'Duo', 'Iso', 'Apat'], correctAnswer: 'Tohu', explanation: 'Tohu means Three (Tiga).' },
    { question: 'What is "Four" in Kadazan?', options: ['Apat', 'Tohu', 'Duo', 'Iso'], correctAnswer: 'Apat', explanation: 'Apat means Four (Empat).' }
  ],
  'Phrases': [
    { question: 'How do you say "Thank you" in Kadazan?', options: ['Kopivosian', 'Poingkuro ko?', 'Kotohuadan', 'Langad zou dia'], correctAnswer: 'Kotohuadan', explanation: 'Kotohuadan means Thank you (Terima kasih).' },
    { question: 'How do you say "Welcome"?', options: ['Kotohuadan', 'Kopivosian', 'Poingkuro ko?', 'Langad zou dia'], correctAnswer: 'Kopivosian', explanation: 'Kopivosian means Welcome (Selamat datang).' },
    { question: 'How do you say "How are you"?', options: ['Kopivosian doungosuab', 'Poingkuro ko?', 'Kotohuadan', 'Langad zou dia'], correctAnswer: 'Poingkuro ko?', explanation: 'Poingkuro ko? means How are you? (Apa khabar?).' },
    { question: 'How do you say "Good morning"?', options: ['Kopivosian doungosuab', 'Kotohuadan', 'Poingkuro ko?', 'Kopivosian'], correctAnswer: 'Kopivosian doungosuab', explanation: 'Kopivosian doungosuab means Good morning (Selamat pagi).' }
  ],
  'Nature': [
    { question: 'What is "Sun" in Kadazan?', options: ['Vuhan', 'Bawang', 'Nuhu', 'Tadau'], correctAnswer: 'Tadau', explanation: 'Tadau means Sun (Matahari).' },
    { question: 'What is "Moon" in Kadazan?', options: ['Tadau', 'Bawang', 'Vuhan', 'Puun'], correctAnswer: 'Vuhan', explanation: 'Vuhan means Moon (Bulan).' },
    { question: 'What is "River" in Kadazan?', options: ['Puun', 'Nuhu', 'Tadau', 'Bawang'], correctAnswer: 'Bawang', explanation: 'Bawang means River (Sungai).' },
    { question: 'What is "Mountain" in Kadazan?', options: ['Vuhan', 'Nuhu', 'Tadau', 'Puun'], correctAnswer: 'Nuhu', explanation: 'Nuhu means Mountain (Gunung).' }
  ],
  'Family': [
    { question: 'What is "Father" in Kadazan?', options: ['Ina', 'Tanak', 'Ama', 'Odu'], correctAnswer: 'Ama', explanation: 'Ama means Father (Bapa).' },
    { question: 'What is "Mother" in Kadazan?', options: ['Ama', 'Tanak', 'Tobpinai', 'Ina'], correctAnswer: 'Ina', explanation: 'Ina means Mother (Ibu).' },
    { question: 'What is "Child" in Kadazan?', options: ['Odu', 'Ama', 'Tanak', 'Ina'], correctAnswer: 'Tanak', explanation: 'Tanak means Child (Anak).' },
    { question: 'What is "Grandparent" in Kadazan?', options: ['Odu', 'Tobpinai', 'Ina', 'Tanak'], correctAnswer: 'Odu', explanation: 'Odu means Grandparent (Nenek/Datuk).' }
  ]
};

export const STATIC_SENTENCES: SentenceChallenge[] = [
  { english: 'Thank you very much.', kadazan: 'Kotohuadan kio.', malay: 'Terima kasih banyak-banyak.', distractors: ['Tasu', 'Waig', 'Ama'] },
  { english: 'I have four dogs.', kadazan: 'Apat tasu ku.', malay: 'Saya ada empat anjing.', distractors: ['Tingau', 'Hada', 'Vuhan'] },
  { english: 'Penampang River is big.', kadazan: 'Agayo Bawang Penampang.', malay: 'Sungai Penampang besar.', distractors: ['Puun', 'Tadau', 'Tohu'] },
  { english: 'The child is crying.', kadazan: 'Totoloo nodi ih tanak.', malay: 'Anak itu menangis.', distractors: ['Tobpinai', 'Ama', 'Odu'] },
  { english: 'The sun is hot today.', kadazan: 'Pana kinohodion tadau.', malay: 'Matahari panas hari ini.', distractors: ['Vuhan', 'Nuhu', 'Bawang'] },
  { english: 'The moon is very bright.', kadazan: 'Avang kopio ih vuhan.', malay: 'Bulan itu sangat terang.', distractors: ['Tadau', 'Puun', 'Nuhu'] },
  { english: 'I love my mother.', kadazan: 'Koupusan ku ih ina ku.', malay: 'Saya sayang ibu saya.', distractors: ['Ama', 'Tanak', 'Tobpinai'] }
];

export const generateImage = async (prompt: string): Promise<string> => {
  return 'https://images.unsplash.com/photo-1596423736561-392d4f29d28e?auto=format&fit=crop&q=80&w=800';
};

let ai: GoogleGenAI | null = null;
const audioCache = new Map<string, string>();

function getGenAI() {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

const fetchPromiseCache = new Map<string, Promise<string | undefined>>();

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  if (audioCache.has(text)) {
    return audioCache.get(text);
  }
  if (fetchPromiseCache.has(text)) {
    return fetchPromiseCache.get(text);
  }
  
  const promise = (async () => {
    try {
      const aiClient = getGenAI();
      const response = await aiClient.models.generateContent({
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
        audioCache.set(text, base64Audio);
        return base64Audio;
      }
    } catch (e) {
      console.error("Gemini TTS error:", e);
    }
    return undefined;
  })();
  
  fetchPromiseCache.set(text, promise);
  
  try {
    await promise;
  } finally {
    fetchPromiseCache.delete(text);
  }
  
  return promise;
};

export const getVocabulary = async (category: string): Promise<WordPair[]> => {
  try {
     const docRef = doc(db, 'content', 'vocabulary');
     const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
       const data = docSnap.data();
       if (data[category]) {
          return data[category];
       }
     }
  } catch(e) {
     console.error('Error fetching vocabulary:', e);
  }
  return STATIC_VOCABULARY[category] || STATIC_VOCABULARY['Animals'];
};

export const getSpellingChallenge = async (excludeWord?: string): Promise<SpellingChallenge> => {
  const categories = Object.keys(STATIC_VOCABULARY).filter(cat => cat !== 'Phrases');
  
  // Collect from Firestore if available
  let allWords: WordPair[] = [];
  try {
    const docRef = doc(db, 'content', 'vocabulary');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      categories.forEach(c => {
         if (data[c]) allWords.push(...data[c]);
      });
    }
  } catch (e) {
    console.error('Error fetching spelling words:', e);
  }

  if (allWords.length === 0) {
     allWords = categories.flatMap(c => STATIC_VOCABULARY[c]);
  }

  let filteredWords = excludeWord ? allWords.filter(w => w.kadazan !== excludeWord) : allWords;
  if (filteredWords.length === 0) filteredWords = allWords; // fallback
  const word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  return {
    english: word.english,
    kadazan: word.kadazan,
    hint: `Translation: ${word.malay}`, 
    imageUrl: word.imageUrl
  };
};

export const generateQuiz = async (category: string): Promise<QuizQuestion[]> => {
  try {
     const docRef = doc(db, 'content', 'quizzes');
     const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
       const data = docSnap.data();
       if (data[category]) {
          return data[category];
       }
     }
  } catch(e) {
      console.error('Error fetching quizzes:', e);
  }
  return STATIC_QUIZZES[category] || STATIC_QUIZZES['Animals'];
};

export const checkSentence = async (english: string, userKadazan: string): Promise<{ correct: boolean; feedback: string; correction?: string }> => {
  const challenge = STATIC_SENTENCES.find(s => s.english === english);
  const correctKadazan = challenge ? challenge.kadazan : '';
  const isCorrect = userKadazan.trim().toLowerCase().replace(/[.,!?]/g, '') === correctKadazan.toLowerCase().replace(/[.,!?]/g, '');
  
  return Promise.resolve({ 
    correct: isCorrect, 
    feedback: isCorrect ? '✅ Otopot! (Correct!)' : '❌ Ada kooti! (Not quite!)',
    correction: isCorrect ? undefined : correctKadazan
  });
};

// Re-export interface if necessary. Or remove if already defined above.
// Handled above.

export const getSentenceBuilderChallenge = async (completedCount: number = 0): Promise<SentenceChallenge> => {
  return Promise.resolve(STATIC_SENTENCES[Math.floor(completedCount / 10) % STATIC_SENTENCES.length]);
};
