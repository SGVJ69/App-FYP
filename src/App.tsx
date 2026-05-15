
import React, { useState, useEffect, useRef } from 'react';
import { Screen, WordPair, QuizQuestion, SpellingChallenge, UserProgress } from './types';
import { Layout } from './components/Layout';
import { AdminPanel } from './components/AdminPanel';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { 
  getVocabulary, 
  generateQuiz, 
  checkSentence, 
  getSpellingChallenge, 
  generateImage, 
  getSentenceBuilderChallenge,
  SentenceChallenge
} from './services/geminiService';

const playSound = (type: 'correct' | 'wrong' | 'click') => {
   const audio = new Audio(
       type === 'correct' ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3' :
       type === 'wrong' ? 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3' :
       'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
   );
   audio.play().catch(e => console.log('Audio error:', e));
};

const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffe436', '#ff4d4d', '#00d2ff', '#00e676']
    });
};

const Mascot = ({ state }: { state: 'neutral' | 'happy' | 'sad' }) => {
  const getIcon = () => {
    if (state === 'happy') return 'fa-face-laugh-beam text-emerald-500';
    if (state === 'sad') return 'fa-face-frown text-red-500';
    return 'fa-face-smile text-amber-500';
  };
  return (
     <div className="flex flex-col items-center animate-bounce">
       <i className={`fas ${getIcon()} text-5xl mb-2 drop-shadow-md`}></i>
       <div className="bg-white/80 px-2 py-1 rounded-full text-[10px] font-black uppercase text-slate-700 tracking-wider">Sabah Mascot</div>
     </div>
  );
};


// Verified High-Quality Unsplash Images
const CATEGORIES = [
  { 
    name: 'Animals', 
    image: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?auto=format&fit=crop&q=80&w=600', // Group of animals
    subtitle: 'TAYAM'
  },
  { 
    name: 'Food', 
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600', // Asian cooking/food
    subtitle: 'TAAKANON'
  },
  { 
    name: 'Numbers', 
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600', // Abacus
    subtitle: 'NOMBO'
  },
  { 
    name: 'Phrases', 
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600', // Friends/Speaking
    subtitle: 'BOROS-BOROS'
  },
  { 
    name: 'Nature', 
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=600', // Forest
    subtitle: 'KOSOLIMPUUNAN'
  },
  { 
    name: 'Family', 
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=600', // Family
    subtitle: 'TAMPATAN'
  }
];

// Mount Kinabalu (Gunung) background
const DEFAULT_HOME_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/960px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.LOGIN);
  const [homeImageUrl, setHomeImageUrl] = useState(DEFAULT_HOME_IMAGE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Data States
  const [vocabulary, setVocabulary] = useState<WordPair[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [spellingChallenge, setSpellingChallenge] = useState<SpellingChallenge | null>(null);
  const [sentenceChallenge, setSentenceChallenge] = useState<SentenceChallenge | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalScore: 0,
    quizzesCompleted: 0,
    spellingCompleted: 0,
    sentencesCompleted: 0,
    streak: 0,
    lastActiveDate: null,
    badges: []
  });
  
  // Gamification & Health
  const [hearts, setHearts] = useState(5);
  const [mascotState, setMascotState] = useState<'neutral' | 'happy' | 'sad'>('neutral');

  // Memory Game State
  const [memoryCards, setMemoryCards] = useState<{ id: string, text: string, type: 'kadazan' | 'english', wordPairId: string, isFlipped: boolean, isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [memoryScore, setMemoryScore] = useState(0);
  
  // Loading & Progress
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Pokionuo Wisomon... (Please Wait...)');
  
  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  // Feedback State
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Spelling Input
  const [userSpelling, setUserSpelling] = useState('');
  
  // Sentence Builder State (Duolingo Style)
  const [availableWords, setAvailableWords] = useState<{id: string, text: string}[]>([]);
  const [selectedWords, setSelectedWords] = useState<{id: string, text: string}[]>([]);
  const [sentenceResult, setSentenceResult] = useState<{ correct: boolean; feedback: string; correction?: string } | null>(null);
  
  // Caches
  const vocabularyCache = useRef<Record<string, WordPair[]>>({});
  const quizCache = useRef<Record<string, QuizQuestion[]>>({});

  useEffect(() => {
    // Check if user is logged in natively
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const progressRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(progressRef);
          
          const today = new Date().toISOString().split('T')[0];
          
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProgress;
            let newStreak = data.streak || 0;
            const updatedBadges = data.badges || [];
            
            if (data.lastActiveDate !== today) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (data.lastActiveDate === yesterday.toISOString().split('T')[0]) {
                 newStreak += 1;
              } else {
                 newStreak = 1;
              }
            }
            
            const updatedData = { 
              ...data, 
              streak: newStreak, 
              lastActiveDate: today, 
              badges: updatedBadges,
              role: data.role || (currentUser.email === 'admin@kadazan.com' ? 'admin' : 'user'),
              email: data.email || currentUser.email || ''
            };
            setUserProgress(updatedData);
            if (updatedData.lastActiveDate !== data.lastActiveDate || !data.role) {
               await setDoc(progressRef, updatedData, { merge: true });
            }
          } else {
            const initialProgress: UserProgress = { 
              totalScore: 0, 
              quizzesCompleted: 0, 
              spellingCompleted: 0, 
              sentencesCompleted: 0, 
              memoryCompleted: 0,
              streak: 1, 
              lastActiveDate: today, 
              badges: [],
              role: currentUser.email === 'admin@kadazan.com' ? 'admin' : 'user',
              email: currentUser.email || ''
            };
            await setDoc(progressRef, initialProgress);
            setUserProgress(initialProgress);
          }
          setHearts(5); // Reset daily hearts
        } catch (e) {
          console.error("Failed to load progress:", e);
        }
        if (currentScreen === Screen.LOGIN) {
          setCurrentScreen(Screen.HOME);
        }
      } else {
        setUserProgress({ 
          totalScore: 0, 
          quizzesCompleted: 0, 
          spellingCompleted: 0, 
          sentencesCompleted: 0, 
          memoryCompleted: 0,
          streak: 0, 
          lastActiveDate: '', 
          badges: [] 
        });
        setCurrentScreen(Screen.LOGIN);
      }
    });
    
    return () => unsubscribe();
  }, [currentScreen]);

  const updateProgress = async (updates: Partial<UserProgress>) => {
    if (!user) return;
    
    const newProgress = { ...userProgress };
    for (const key in updates) {
      if (key !== 'badges' && key !== 'lastActiveDate') {
        (newProgress as any)[key] += (updates as any)[key];
      }
    }
    
    // Check for badges
    const newBadges = [...(newProgress.badges || [])];
    if (newProgress.totalScore >= 100 && !newBadges.includes('Word Explorer')) {
      newBadges.push('Word Explorer');
      triggerConfetti();
      playSound('correct');
    }
    if (newProgress.sentencesCompleted >= 30 && !newBadges.includes('Grammar Master')) {
      newBadges.push('Grammar Master');
      triggerConfetti();
      playSound('correct');
    }
    if (newProgress.spellingCompleted >= 100 && !newBadges.includes('Spelling Master')) {
       newBadges.push('Spelling Master');
       triggerConfetti();
       playSound('correct');
    }
    
    newProgress.badges = newBadges;
    
    setUserProgress(newProgress);
    try {
      const progressRef = doc(db, 'users', user.uid);
      await setDoc(progressRef, newProgress, { merge: true });
    } catch (e) {
      console.error("Failed to update progress:", e);
    }
  };

  const handleStartVocabulary = async (category: string) => {
    setSelectedCategory(category);
    if (vocabularyCache.current[category]) {
      setVocabulary(vocabularyCache.current[category]);
      setCurrentScreen(Screen.VOCABULARY);
      return;
    }
    try {
      const data = await getVocabulary(category);
      vocabularyCache.current[category] = data;
      setVocabulary(data);
      setCurrentScreen(Screen.VOCABULARY);
    } catch (error: any) {
      alert("Slow internet connection. Please try again.");
    }
  };

  const handleStartSpelling = async () => {
    try {
      const challenge = await getSpellingChallenge(spellingChallenge?.kadazan);
      setSpellingChallenge(challenge);
      setUserSpelling('');
      setFeedbackMsg('');
      setCurrentScreen(Screen.SPELLING);
    } catch (error: any) {
      alert("Service unavailable. Please try again.");
    }
  };

  const handleStartQuiz = async (category: string) => {
    setSelectedCategory(category);
    if (quizCache.current[category]) {
      setQuiz(quizCache.current[category]);
      setQuizIndex(0);
      setScore(0);
      setFeedbackMsg('');
      setCurrentScreen(Screen.QUIZ);
      return;
    }
    try {
      const data = await generateQuiz(category);
      quizCache.current[category] = data;
      setQuiz(data);
      setQuizIndex(0);
      setScore(0);
      setFeedbackMsg('');
      setCurrentScreen(Screen.QUIZ);
    } catch (error: any) {
      alert("Service unavailable. Please try again.");
    }
  };

  const handleStartSentences = async () => {
    try {
      const challenge = await getSentenceBuilderChallenge(userProgress.sentencesCompleted || 0);
      setSentenceChallenge(challenge);
      
      // Prepare words: Correct words + Distractors -> Shuffled
      const correctWords = challenge.kadazan.split(' ');
      const allWords = [...correctWords, ...challenge.distractors];
      
      // Shuffle
      for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
      }
      
      setAvailableWords(allWords.map((w, i) => ({ id: `word-${i}`, text: w })));
      setSelectedWords([]);
      setSentenceResult(null);
      setMascotState('neutral');
      setCurrentScreen(Screen.SENTENCES);
    } catch (error) {
      console.error(error);
      alert("Failed to load sentence challenge.");
    }
  };

  // --- Sentence Builder Logic ---
  const handleWordSelect = (wordId: string) => {
    playSound('click');
    const word = availableWords.find(w => w.id === wordId);
    if (word) {
      setAvailableWords(prev => prev.filter(w => w.id !== wordId));
      setSelectedWords(prev => [...prev, word]);
    }
  };

  const handleWordDeselect = (wordId: string) => {
    playSound('click');
    const word = selectedWords.find(w => w.id === wordId);
    if (word) {
      setSelectedWords(prev => prev.filter(w => w.id !== wordId));
      setAvailableWords(prev => [...prev, word]);
    }
  };

  const handleMemoryCardClick = (id: string) => {
    if (flippedCards.length === 2) return;
    const card = memoryCards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;

    playSound('click');
    setMemoryCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const card1 = memoryCards.find(c => c.id === newFlipped[0]);
      const card2 = memoryCards.find(c => c.id === newFlipped[1]);

      if (card1 && card1 && card1.wordPairId === card2?.wordPairId && card1.type !== card2.type) {
        // Match!
        setTimeout(() => {
          playSound('correct');
          setMascotState('happy');
          setMemoryCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, isMatched: true } : c));
          setFlippedCards([]);
          setMemoryScore(s => s + 1);
          if (memoryScore + 1 === memoryCards.length / 2) {
            triggerConfetti();
            updateProgress({ totalScore: 50, memoryCompleted: 20 });
            setFeedbackMsg('KOPISIAN! Memory Match Complete! 🎉');
          }
        }, 800);
      } else {
        // No match
        setTimeout(() => {
          playSound('wrong');
          setMascotState('sad');
          setHearts(h => Math.max(0, h - 1));
          setMemoryCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c));
          setFlippedCards([]);
        }, 1200);
      }
    }
  };

  const handleSentenceBuilderCheck = async () => {
    if (!sentenceChallenge) return;
    const userSentence = selectedWords.map(w => w.text).join(' ');
    
    setLoading(true);
    try {
      const result = await checkSentence(sentenceChallenge.english, userSentence);
      if (result.correct) {
        playSound('correct');
        setMascotState('happy');
        updateProgress({ totalScore: 30, sentencesCompleted: 10 });
      } else {
        playSound('wrong');
        setMascotState('sad');
        setHearts(h => Math.max(0, h - 1));
      }
      setSentenceResult(result);
    } catch (e) {
      // Fallback simple check if API fails
      const isMatch = userSentence.toLowerCase().replace(/[.,!?]/g, '') === sentenceChallenge.kadazan.toLowerCase().replace(/[.,!?]/g, '');
      if (isMatch) {
         playSound('correct');
         setMascotState('happy');
         updateProgress({ totalScore: 30, sentencesCompleted: 10 });
      } else {
         playSound('wrong');
         setMascotState('sad');
         setHearts(h => Math.max(0, h - 1));
      }
      setSentenceResult({
        correct: isMatch,
        feedback: isMatch ? "Correct structure!" : "Keep trying!",
        correction: isMatch ? undefined : sentenceChallenge.kadazan
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Spelling & Quiz Logic ---
  const checkSpelling = () => {
    if (!spellingChallenge) return;
    if (userSpelling.trim().toLowerCase() === spellingChallenge.kadazan.toLowerCase()) {
      playSound('correct');
      setMascotState('happy');
      updateProgress({ totalScore: 20, spellingCompleted: 10 });
      setFeedbackMsg('KOPISIAN! (Excellent!) 🎉');
      setTimeout(() => {
        setMascotState('neutral');
        handleStartSpelling();
      }, 1500);
    } else {
      playSound('wrong');
      setHearts(h => Math.max(0, h - 1));
      setMascotState('sad');
      setFeedbackMsg('Ada kooti! (Not quite!)');
    }
  };

  const handleQuizAnswer = (answer: string) => {
    if (answer === quiz[quizIndex].correctAnswer) {
      playSound('correct');
      setMascotState('happy');
      setScore(s => s + 1);
      updateProgress({ totalScore: 10 });
      setFeedbackMsg('✅ OTOPOT! (Correct!) ' + quiz[quizIndex].explanation);
    } else {
      playSound('wrong');
      setMascotState('sad');
      setHearts(h => Math.max(0, h - 1));
      setFeedbackMsg('❌ ADA KOOTI! (Not quite!) ' + quiz[quizIndex].explanation);
    }
  };

  const nextQuizItem = () => {
    setFeedbackMsg('');
    setMascotState('neutral');
    if (quizIndex < quiz.length - 1) {
      setQuizIndex(q => q + 1);
    } else {
      updateProgress({ quizzesCompleted: 1 });
      if (score === quiz.length) {
         triggerConfetti();
      }
      alert(`Quiz Completed! Results: ${score}/${quiz.length}`);
      setCurrentScreen(Screen.DASHBOARD);
    }
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }
    
    setLoading(true);
    setLoadingText(isRegistering ? 'Registering...' : 'Logging in...');
    
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setCurrentScreen(Screen.HOME);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setLoading(true);
    setLoadingText('Logging in with Google...');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setCurrentScreen(Screen.HOME);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const renderScreen = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-10 animate-in fade-in duration-500" aria-live="polite">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 border-b-8 border-amber-400 rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-t-8 border-red-600 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-sun text-5xl text-amber-500 animate-pulse"></i>
            </div>
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-black text-4xl tracking-tighter uppercase">{loadingText}</p>
            <p className="text-red-600 font-bold text-sm mt-3 tracking-[0.3em] uppercase italic">Standard Kadazan Educational System</p>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case Screen.LOGIN:
        return (
          <div className="flex flex-col items-center py-6 sm:py-10 page-fade-in w-full max-w-sm mx-auto">
             <div className="relative mb-6 w-full">
               <div className="absolute -inset-6 bg-gradient-to-tr from-amber-400 via-red-600 to-black rounded-[4rem] blur-xl opacity-30 animate-pulse"></div>
               <div className="relative bg-white p-3 rounded-[3.5rem] shadow-2xl border-4 border-amber-100 overflow-hidden">
                 <img 
                    src={homeImageUrl}
                    className="w-full h-48 sm:h-56 object-cover rounded-[3rem]" 
                    alt="Mount Kinabalu" 
                    referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-[3rem] pointer-events-none"></div>
                 <div className="absolute bottom-6 left-8 right-8 text-white">
                    <p className="text-amber-400 text-[10px] sm:text-xs font-black tracking-[0.4em] uppercase mb-1 drop-shadow-md">K-LEARN</p>
                    <h2 className="text-3xl sm:text-4xl font-black leading-tight italic kadazan-title drop-shadow-lg">Kopivosian</h2>
                 </div>
               </div>
             </div>
             <div className="w-full bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900 border-b-[10px] mb-6 space-y-6">
                <div className="text-center mb-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">{isRegistering ? 'Create Account' : 'Login to Learn'}</h3>
                  <p className="text-amber-600 font-black text-xs tracking-widest mt-1">SABAH HERITAGE</p>
                </div>

                {authError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                    <p className="text-sm font-bold text-red-700">{authError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 pl-4">Email</label>
                    <input 
                      type="email" 
                      placeholder="ngaran@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border-[3px] border-slate-200 rounded-[2rem] px-6 py-4 font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner" 
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 pl-4">Password</label>
                     <input 
                       type="password" 
                       placeholder="••••••••" 
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full bg-slate-50 border-[3px] border-slate-200 rounded-[2rem] px-6 py-4 font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner" 
                     />
                  </div>
                </div>

                <button 
                  onClick={handleAuthSubmit}
                  disabled={loading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2.5rem] font-black text-xl shadow-xl hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-4 group border-b-[6px] border-black mt-2 disabled:opacity-70 disabled:active:scale-100"
                >
                  <span>{isRegistering ? 'DAFTAR (REGISTER)' : 'TUMAMONG (LOGIN)'}</span>
                  {!loading && <i className="fas fa-arrow-right text-amber-400 group-hover:translate-x-2 transition-transform"></i>}
                </button>

                <div className="flex items-center space-x-4 my-2">
                  <div className="flex-1 border-t-2 border-slate-200"></div>
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">or</span>
                  <div className="flex-1 border-t-2 border-slate-200"></div>
                </div>

                <button 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-4 bg-white text-slate-800 border-[3px] border-slate-200 rounded-[2.5rem] font-black text-lg shadow-md hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:active:scale-100"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" referrerPolicy="no-referrer" alt="Google" className="w-6 h-6" />
                  <span>Sign in with Google</span>
                </button>
             </div>
             
             <p className="text-slate-500 font-bold text-sm bg-white/80 px-6 py-2 rounded-full border border-slate-200 shadow-sm">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"} <span onClick={() => setIsRegistering(!isRegistering)} className="text-red-600 cursor-pointer hover:underline font-black">{isRegistering ? 'Login Here' : 'Register Here'}</span>
             </p>
          </div>
        );

      case Screen.HOME:
        return (
          <div className="flex flex-col items-center py-4">
             <div className="relative mb-8 w-full max-w-sm">
               <div className="absolute -inset-6 bg-gradient-to-tr from-amber-400 via-red-600 to-black rounded-[4rem] blur-3xl opacity-20 animate-pulse"></div>
               <div className="relative bg-white p-3 rounded-[3.5rem] shadow-2xl border-4 border-amber-100 shadow-amber-200/50 overflow-hidden">
                 <img 
                    src={homeImageUrl}
                    className="w-full h-80 object-cover rounded-[3rem]" 
                    alt="Kadazan cultural scene" 
                    referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent rounded-[3rem] pointer-events-none"></div>
                 <div className="absolute bottom-10 left-8 right-8 text-white">
                    <p className="text-amber-400 text-xs font-black tracking-[0.4em] uppercase mb-2">POGIOM KOHUNAN (Seeking Knowledge)</p>
                    <p className="text-2xl font-black leading-tight italic">"Kotohuadan (Thank you) for honoring our ancestors' words."</p>
                 </div>
               </div>
             </div>
             <h1 className="text-[3.5rem] sm:text-7xl font-black text-slate-900 mb-4 tracking-tighter text-center kadazan-title uppercase leading-none">Kopivosian! <br /><span className="text-2xl sm:text-4xl tracking-normal opacity-80 capitalize">(Welcome!)</span></h1>
             <p className="text-xl text-slate-600 font-bold text-center mb-10 max-w-xs leading-relaxed">
                Learn the Standard Kadazan language through the beauty of Sabah's heritage.
             </p>
             <div className="w-full max-w-xs flex flex-col gap-4">
               <button 
                 onClick={() => setCurrentScreen(Screen.DASHBOARD)}
                 className="w-full py-6 bg-black text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-5 group border-b-8 border-red-600"
               >
                 <span className="flex flex-col items-center">TIMPU BAINO! <span className="text-xs text-amber-400/80 uppercase tracking-widest">(The Time Is Now)</span></span>
                 <i className="fas fa-arrow-right text-amber-400 group-hover:translate-x-3 transition-transform"></i>
               </button>
               <button 
                 onClick={() => setCurrentScreen(Screen.ABOUT)}
                 className="w-full py-5 bg-white text-black border-4 border-black rounded-[2rem] font-black text-xl shadow-md hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-4 group"
               >
                 <span>OUR HERITAGE</span>
                 <i className="fas fa-book-open text-red-600 group-hover:scale-110 transition-transform"></i>
               </button>
               {userProgress?.role === 'admin' && (
                 <button 
                   onClick={() => setCurrentScreen(Screen.ADMIN)}
                   className="w-full py-5 bg-amber-400 text-black border-4 border-black rounded-[2rem] font-black text-xl shadow-md hover:bg-amber-500 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                 >
                   <span>ADMIN PANEL</span>
                   <i className="fas fa-users-cog text-black group-hover:scale-110 transition-transform"></i>
                 </button>
               )}
             </div>
          </div>
        );

      case Screen.ADMIN:
        return (
          <AdminPanel onBack={() => setCurrentScreen(Screen.HOME)} />
        );

      case Screen.DASHBOARD:
        return (
          <div className="space-y-12 page-fade-in duration-700">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2">
                 <p className="text-red-600 font-black uppercase text-xs tracking-[0.5em] mb-1">Baino (Today)</p>
                  <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter kadazan-title italic flex flex-col gap-1 sm:gap-2 relative mb-2">
                   <span>Monguhup</span>
                   <span className="text-sm sm:text-xl text-slate-500 font-bold not-italic tracking-normal">(Learning / Helping)</span>
                 </h2>
              </div>
              <div className="flex flex-col gap-2 relative z-20 items-end">
                <div className="flex items-center gap-3 bg-white p-2 sm:p-3 rounded-2xl border-2 border-slate-200 shadow-sm mt-2 group relative">
                   <div className="flex items-center gap-2 text-orange-500 font-black cursor-help" title="Complete a lesson to add to your fire streak!">
                     <i className="fas fa-fire text-lg"></i>
                     <span className="text-sm">{userProgress.streak || 0}</span>
                     <span className="text-xs text-slate-500 uppercase tracking-widest ml-1 hidden sm:inline">Streak</span>
                   </div>
                   <div className="absolute top-full right-0 mt-2 bg-slate-900 text-white text-xs font-bold leading-relaxed p-3 rounded-xl w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-700">
                     Complete a lesson every day to increase your fire streak!
                   </div>
                </div>
                <button 
                  onClick={() => setCurrentScreen(Screen.PROGRESS)} 
                  className="bg-amber-400 text-black px-4 py-2 rounded-2xl font-black shadow-md border-b-4 border-amber-600 hover:translate-y-1 hover:border-b-2 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <i className="fas fa-medal text-lg"></i>
                  <span>PROGRESS</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4">
               {CATEGORIES.slice(0, 4).map((cat, idx) => (
                 <button 
                    key={idx}
                    onClick={() => handleStartVocabulary(cat.name)}
                    className="aspect-square relative rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 hover:shadow-sm transition-all group shadow-xl active:scale-95 traditional-card border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-black p-0"
                 >
                    <img src={cat.image} referrerPolicy="no-referrer" alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    
                    <div className="relative z-10 p-4 sm:p-8 h-full flex flex-col justify-end items-start text-white w-full">
                      <h3 className="font-black text-xl sm:text-3xl tracking-tighter leading-none mb-2 drop-shadow-lg text-left">{cat.name}</h3>
                      <p className="text-amber-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm border border-amber-400/30 text-left line-clamp-1">{cat.subtitle}</p>
                    </div>
                 </button>
               ))}
               
               {/* Spelling Card */}
               <button onClick={handleStartSpelling} className="aspect-square bg-red-600 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-black rounded-[2rem] sm:rounded-[3.5rem] p-4 sm:p-8 flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 hover:border-b-4 hover:border-r-4 transition-all group shadow-lg active:scale-95 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white text-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-3xl shadow-xl group-hover:rotate-12 transition-transform relative z-10 self-start">
                    <i className="fas fa-spell-check"></i>
                  </div>
                  <div className="text-left relative z-10">
                    <h3 className="font-black text-white text-lg sm:text-2xl tracking-tighter leading-none mb-1">Spelling</h3>
                    <p className="text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-widest line-clamp-1">MONULIS</p>
                  </div>
               </button>

               {/* Grammar Card */}
               <button onClick={handleStartSentences} className="aspect-square bg-amber-400 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-black rounded-[2rem] sm:rounded-[3.5rem] p-4 sm:p-8 flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 hover:border-b-4 hover:border-r-4 transition-all group shadow-lg active:scale-95 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-black text-amber-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-3xl shadow-xl group-hover:rotate-[-12deg] transition-transform relative z-10 self-start">
                    <i className="fas fa-feather"></i>
                  </div>
                  <div className="text-left relative z-10">
                    <h3 className="font-black text-black text-lg sm:text-2xl tracking-tighter leading-none mb-1">Grammar</h3>
                    <p className="text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-widest line-clamp-1">MONOMBULI</p>
                  </div>
               </button>

               {/* Memory Game Card */}
               <button 
                 onClick={() => {
                   playSound('click');
                   setCurrentScreen(Screen.MEMORY_THEMES);
                 }} 
                 className="aspect-square sm:col-span-2 col-span-2 bg-slate-900 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-black rounded-[2rem] sm:rounded-[3.5rem] p-4 sm:p-8 flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 hover:border-b-4 hover:border-r-4 transition-all group shadow-lg active:scale-95 relative overflow-hidden"
               >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Tikar_anyaman.jpg/800px-Tikar_anyaman.jpg" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" referrerPolicy="no-referrer" alt="Tribal pattern" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-red-600/90 to-transparent"></div>
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/80 to-transparent"></div>
                  
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-black text-amber-400 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-3xl shadow-xl group-hover:rotate-12 transition-transform relative z-10 self-start border-2 border-amber-400">
                    <i className="fas fa-gamepad"></i>
                  </div>
                  <div className="text-left relative z-10 flex gap-4 items-center justify-between w-full mt-4">
                    <div>
                      <h3 className="font-black text-white text-lg sm:text-3xl tracking-tighter leading-none mb-1 drop-shadow-md">Memory Match</h3>
                      <p className="text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-widest drop-shadow-md">PISOSONGOT</p>
                    </div>
                    <div className="text-white opacity-80 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                       <div className="flex gap-1 animate-pulse">
                         <i className="fas fa-puzzle-piece text-amber-300"></i>
                         <i className="fas fa-puzzle-piece text-red-400"></i>
                         <i className="fas fa-puzzle-piece text-emerald-400"></i>
                       </div>
                    </div>
                  </div>
               </button>
            </div>

            <div className="bg-black rounded-[2rem] sm:rounded-[4rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-2xl border-4 border-amber-400">
               <div className="absolute -right-10 sm:-right-20 -top-10 sm:-top-20 w-40 sm:w-80 h-40 sm:h-80 opacity-10 rotate-[15deg] pointer-events-none">
                  <i className="fas fa-mountain text-[10rem] sm:text-[20rem] text-white"></i>
               </div>
               <div className="relative z-10">
                  <h3 className="text-3xl sm:text-5xl font-black mb-3 sm:mb-5 tracking-tighter italic">"Kotohuadan"</h3>
                  <p className="text-slate-300 font-bold text-sm sm:text-lg leading-relaxed mb-4 sm:mb-10">
                    Always remember to say "Kotohuadan" to show respect in our Standard Kadazan community.
                  </p>
               </div>
            </div>
          </div>
        );

      case Screen.PROGRESS:
        return (
          <div className="space-y-8 page-fade-in">
             <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 flex flex-col gap-4 shadow-sm">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner relative">
                            <i className="fas fa-spell-check text-xl"></i>
                         </div>
                         <div>
                           <h4 className="font-black text-lg text-slate-900 leading-none">Spelling Exercises</h4>
                           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Level {Math.min(userProgress.spellingCompleted, 100) < 34 ? 1 : Math.min(userProgress.spellingCompleted, 100) < 67 ? 2 : 3} • Words written correctly</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {Math.min(userProgress.spellingCompleted, 100) === 100 && <i className="fas fa-trophy text-amber-400 text-xl animate-pulse drop-shadow-md"></i>}
                        <span className="text-2xl font-black text-black">{Math.min(userProgress.spellingCompleted, 100)}%</span>
                      </div>
                   </div>
                   <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(userProgress.spellingCompleted, 100)}%` }}
                      ></div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 flex flex-col gap-4 shadow-sm">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner relative">
                            <i className="fas fa-feather-pointed text-xl"></i>
                         </div>
                         <div>
                           <h4 className="font-black text-lg text-slate-900 leading-none">Sentences Built</h4>
                           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Level {Math.min(userProgress.sentencesCompleted, 100) < 34 ? 1 : Math.min(userProgress.sentencesCompleted, 100) < 67 ? 2 : 3} • Grammar mastered</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {Math.min(userProgress.sentencesCompleted, 100) === 100 && <i className="fas fa-trophy text-amber-400 text-xl animate-pulse drop-shadow-md"></i>}
                        <span className="text-2xl font-black text-black">{Math.min(userProgress.sentencesCompleted, 100)}%</span>
                      </div>
                   </div>
                   <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(userProgress.sentencesCompleted, 100)}%` }}
                      ></div>
                   </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 flex flex-col gap-4 shadow-sm">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-inner relative">
                            <i className="fas fa-puzzle-piece text-xl"></i>
                         </div>
                         <div>
                           <h4 className="font-black text-lg text-slate-900 leading-none">Memory Games</h4>
                           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Level {Math.min(userProgress.memoryCompleted || 0, 100) < 34 ? 1 : Math.min(userProgress.memoryCompleted || 0, 100) < 67 ? 2 : 3} • Focus & matched words</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {Math.min(userProgress.memoryCompleted || 0, 100) === 100 && <i className="fas fa-trophy text-amber-400 text-xl animate-pulse drop-shadow-md"></i>}
                        <span className="text-2xl font-black text-black">{Math.min(userProgress.memoryCompleted || 0, 100)}%</span>
                      </div>
                   </div>
                   <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(userProgress.memoryCompleted || 0, 100)}%` }}
                      ></div>
                   </div>
                </div>
             </div>

             <button 
                onClick={() => setCurrentScreen(Screen.DASHBOARD)} 
                className="w-full py-6 bg-slate-100 text-slate-800 rounded-[2rem] font-black text-lg border-2 border-slate-200 shadow-sm hover:bg-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group active:scale-95"
             >
                <i className="fas fa-arrow-left text-slate-400 group-hover:-translate-x-1 transition-transform"></i>
                <span>Back to Dashboard</span>
             </button>
          </div>
        );

      case Screen.VOCABULARY:
        if (!selectedCategory) return null;
        return (
          <div className="space-y-10 page-fade-in">
            <div className="flex flex-col gap-2">
               <p className="text-amber-600 font-black uppercase text-xs tracking-[0.4em]">{selectedCategory}</p>
               <h2 className="text-5xl font-black text-slate-900 tracking-tighter kadazan-title uppercase italic leading-none">Boros-Boros</h2>
            </div>
            <div className="grid gap-6">
              {vocabulary.map((v, i) => (
                <div key={i} className="bg-white p-4 sm:p-7 rounded-[2rem] sm:rounded-[3.5rem] border-2 border-slate-100 flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-10 group hover:border-amber-400 transition-all shadow-md relative overflow-hidden traditional-card">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden flex-shrink-0 border-4 border-white shadow-xl bg-slate-100 p-0 relative">
                    <img src={v.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain bg-transparent group-hover:scale-110 transition-transform duration-1000" alt={v.english} />
                    <div className="absolute inset-0 linangkit-accent opacity-5"></div>
                  </div>
                  <div className="flex-grow text-center sm:text-left flex flex-col">
                    <p className="text-red-600 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] mb-1">{v.english}</p>
                    <p className="text-2xl sm:text-4xl font-black text-black tracking-tighter leading-none mb-1">{v.kadazan}</p>
                    <p className="text-sm sm:text-lg font-bold text-amber-600 tracking-tight leading-none mb-2 italic">({v.malay})</p>
                    
                    {v.example && (
                      <div className="mt-4 space-y-2 p-3 sm:p-4 bg-slate-50 rounded-[1.5rem] sm:rounded-2xl border border-slate-100">
                        <p className="text-sm sm:text-base text-slate-800 font-bold leading-relaxed italic opacity-90">"{v.example}"</p>
                        <p className="text-xs sm:text-sm text-amber-600 font-bold italic border-t border-slate-200 pt-1">"{v.exampleMalay}"</p>
                        <p className="text-[10px] sm:text-sm text-slate-400 font-medium italic">"{v.exampleEnglish}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case Screen.SPELLING:
        if (!spellingChallenge) return null;
        return (
          <div className="flex flex-col items-center py-6 space-y-8 sm:space-y-14 page-fade-in">
             <div className="relative w-full max-w-sm px-4 sm:px-0">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-black rounded-[2.5rem] sm:rounded-[4.5rem] rotate-3 shadow-2xl"></div>
              <div className="relative w-full aspect-square bg-slate-100 p-2 sm:p-4 rounded-[2rem] sm:rounded-[4rem] overflow-hidden border-4 sm:border-8 border-white shadow-xl group">
                <img src={spellingChallenge.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain bg-slate-100 p-4 sm:p-8 group-hover:scale-105 transition-transform duration-[2s]" alt="Spelling Subject" />
                <div className="absolute inset-0 bg-black/5"></div>
                <div className="absolute inset-x-0 bottom-0 coral-accent h-6 opacity-40"></div>
              </div>
            </div>
            
            <div className="text-center px-4">
               <h3 className="text-4xl sm:text-6xl font-black text-black tracking-tighter uppercase mb-4 sm:mb-6 kadazan-title italic">{spellingChallenge.english}</h3>
               <div className="bg-amber-400 px-4 sm:px-8 py-2 sm:py-3.5 rounded-full sm:rounded-[1.5rem] inline-block border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_rgba(0,0,0,1)]">
                  <p className="text-black font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em]">HINT: {spellingChallenge.hint}</p>
               </div>
            </div>

            <div className="w-full max-w-sm space-y-6 sm:space-y-10 px-4">
               <input 
                type="text" 
                value={userSpelling}
                onChange={(e) => setUserSpelling(e.target.value)}
                placeholder="BOROS KADAZAN..."
                className="w-full p-6 sm:p-10 bg-white border-4 border-black rounded-[2rem] sm:rounded-[3.5rem] text-center text-2xl sm:text-4xl font-black tracking-[0.2em] focus:ring-12 focus:ring-red-100 focus:outline-none uppercase transition-all shadow-[6px_6px_0px_rgba(214,40,40,1)] sm:shadow-[12px_12px_0px_rgba(214,40,40,1)] text-black placeholder:text-slate-200"
               />
               <button 
                onClick={checkSpelling}
                className="w-full py-6 sm:py-8 bg-black text-white rounded-[2rem] sm:rounded-[3.5rem] font-black text-xl sm:text-3xl shadow-2xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-4 sm:gap-8 group border-b-4 sm:border-b-8 border-amber-400"
               >
                 <span>VALIDATE BOROS</span>
                 <i className="fas fa-pen-nib text-xl sm:text-3xl group-hover:rotate-[-15deg] transition-transform"></i>
               </button>
            </div>

            {feedbackMsg && (
              <div className={`w-full max-w-sm flex flex-col p-8 rounded-[3.5rem] text-center font-black animate-in slide-in-from-bottom-10 ${feedbackMsg.includes('KOPISIAN') ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'} border-4 border-black shadow-[15px_15px_0px_rgba(0,0,0,1)]`}>
                <p className="text-3xl leading-tight uppercase tracking-tight mb-6">{feedbackMsg}</p>
                {feedbackMsg.includes('KOPISIAN') ? (
                  <button onClick={handleStartSpelling} className="w-full py-4 bg-white text-emerald-900 rounded-[2rem] font-black text-xl hover:bg-slate-100 border-b-4 border-emerald-900 active:scale-95 transition-all">NEXT WORD</button>
                ) : (
                  <div className="flex flex-col gap-6">
                     <div className="bg-red-900/30 p-4 rounded-3xl">
                       <p className="text-xs uppercase tracking-[0.3em] text-red-200 mb-2">Right Answer:</p>
                       <p className="text-4xl text-white tracking-widest">{spellingChallenge.kadazan}</p>
                     </div>
                     <div className="flex gap-4">
                       <button onClick={() => { setFeedbackMsg(''); setUserSpelling(''); }} className="flex-1 py-4 bg-white text-red-900 rounded-[2rem] font-black hover:bg-slate-100 border-b-4 border-red-900 active:scale-95 transition-all">RETRY</button>
                       <button onClick={handleStartSpelling} className="flex-1 py-4 bg-black text-white rounded-[2rem] font-black hover:bg-slate-800 border-b-4 border-slate-900 active:scale-95 transition-all">NEXT</button>
                     </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case Screen.MEMORY_THEMES:
        return (
          <div className="space-y-8 page-fade-in w-full max-w-4xl mx-auto">
            <div className="text-center">
               <p className="text-emerald-600 font-black uppercase text-xs tracking-[0.5em] mb-2 sm:mb-4">Memory Game</p>
               <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter kadazan-title italic flex flex-col gap-1 sm:gap-2 relative mb-6">
                 <span>Pilion Tois</span>
                 <span className="text-xl sm:text-2xl text-slate-400 mt-1">Choose Theme</span>
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-2 bg-emerald-400 rounded-full"></div>
               </h2>
               <p className="text-slate-500 font-bold max-w-md mx-auto">Select a category to play the memory match game.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-8">
               {CATEGORIES.slice(0, 4).map((cat, idx) => (
                 <button 
                    key={idx}
                    onClick={() => {
                        playSound('click');
                        setLoading(true);
                        getVocabulary(cat.name).then(data => {
                          const words = data.slice(0, 6);
                          let cards: any[] = [];
                          words.forEach((w, idx) => {
                            cards.push({ id: `k-${idx}`, text: w.kadazan, type: 'kadazan', wordPairId: w.english, isFlipped: false, isMatched: false });
                            cards.push({ id: `e-${idx}`, text: w.english, type: 'english', wordPairId: w.english, isFlipped: false, isMatched: false });
                          });
                          // Shuffle
                          cards = cards.sort(() => Math.random() - 0.5);
                          setMemoryCards(cards);
                          setFlippedCards([]);
                          setMemoryScore(0);
                          setMascotState('neutral');
                          setLoading(false);
                          setCurrentScreen(Screen.MEMORY_GAME);
                        }).catch(() => setLoading(false));
                    }}
                    className="aspect-square relative rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden flex flex-col justify-between hover:translate-x-1 hover:translate-y-1 hover:shadow-sm transition-all group shadow-xl active:scale-95 traditional-card border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-black p-0"
                 >
                    <img src={cat.image} referrerPolicy="no-referrer" alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 opacity-20 linangkit-accent"></div>
                    
                    <div className="relative z-10 w-full p-4 sm:p-8 flex justify-between items-start">
                       <h3 className="text-white font-black text-2xl sm:text-4xl tracking-tighter shadow-sm">{cat.name}</h3>
                    </div>
                    
                    <div className="relative z-10 p-4 sm:p-8 flex justify-between items-end w-full">
                       <span className="text-white/90 font-bold text-[10px] sm:text-xs tracking-[0.2em]">{cat.subtitle}</span>
                       <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg group-hover:bg-amber-400 group-hover:-translate-y-2 transition-all">
                          <i className="fas fa-play ml-1"></i>
                       </div>
                    </div>
                 </button>
               ))}
            </div>
            
            <button 
               onClick={() => setCurrentScreen(Screen.DASHBOARD)} 
               className="w-full mt-8 py-6 bg-slate-100 text-slate-800 rounded-[2rem] font-black text-lg border-2 border-slate-200 shadow-sm hover:bg-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-2 group active:scale-95"
            >
               <i className="fas fa-arrow-left text-slate-400 group-hover:-translate-x-1 transition-transform"></i>
               <span>Back to Dashboard</span>
            </button>
          </div>
        );

      case Screen.MEMORY_GAME:
        if (memoryCards.length === 0) return null;
        return (
          <div className="space-y-12 page-fade-in flex flex-col items-center max-w-lg mx-auto w-full">
            <div className="flex justify-between items-center w-full px-4 text-center">
              <div>
                <p className="text-emerald-600 font-black uppercase text-xs tracking-[0.5em] mb-1">Memory Match</p>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter kadazan-title italic flex flex-col gap-1 sm:gap-2 relative mb-2">
                  <span>Pisosongot</span>
                </h2>
              </div>
              <Mascot state={mascotState} />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full px-2">
              {memoryCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleMemoryCardClick(card.id)}
                  disabled={card.isMatched || card.isFlipped || flippedCards.length === 2}
                  className={`aspect-square relative rounded-[1rem] sm:rounded-[2rem] border-[3px] border-slate-900 transition-all duration-300 transform-style-3d shadow-md
                    ${card.isMatched ? 'opacity-0 scale-90 pointer-events-none' : 'hover:scale-105 active:scale-95'}
                  `}
                >
                  <div className={`absolute inset-0 w-full h-full backface-hidden flex items-center justify-center rounded-[1rem] sm:rounded-[2rem] bg-indigo-500 transition-transform duration-500 border-[3px] border-black ${card.isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cross-stripes.png')] opacity-20"></div>
                    <i className="fas fa-question text-white/50 text-2xl sm:text-4xl"></i>
                  </div>
                  
                  <div className={`absolute inset-0 w-full h-full backface-hidden flex items-center justify-center p-2 rounded-[1rem] sm:rounded-[2rem] bg-white border-[3px] border-black transition-transform duration-500 rotate-y-180 ${card.isFlipped ? 'rotate-y-0' : ''}`}>
                    <span className="text-xs sm:text-sm font-black text-slate-900 break-words text-center">{card.text}</span>
                  </div>
                </button>
              ))}
            </div>

            {memoryScore === memoryCards.length / 2 && (
              <div className="w-full flex-col flex items-center gap-4 mt-8 animate-in slide-in-from-bottom-10">
                <div className="bg-emerald-100 p-6 rounded-[2rem] border-4 border-emerald-500 shadow-[8px_8px_0px_#10b981] w-full text-center">
                  <h3 className="text-2xl font-black text-emerald-800 mb-2">{feedbackMsg}</h3>
                  <button 
                    onClick={() => setCurrentScreen(Screen.DASHBOARD)} 
                    className="mt-4 bg-emerald-600 text-white px-8 py-4 rounded-xl font-black border-b-4 border-emerald-900 hover:translate-y-1 hover:border-b-2 active:scale-95 transition-all text-sm uppercase tracking-widest w-full"
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case Screen.QUIZ:
        if (!selectedCategory || quiz.length === 0) return null;
        const currentQ = quiz[quizIndex];
        return (
          <div className="space-y-12 page-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 bg-white px-6 sm:px-12 py-5 sm:py-7 rounded-[2rem] sm:rounded-[3rem] border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_rgba(0,0,0,1)]">
               <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.4em]">WISOMON {quizIndex + 1}</span>
               <div className="w-full sm:flex-grow sm:mx-12 h-3 sm:h-5 bg-slate-100 rounded-full border border-slate-200 p-[2px] sm:p-1">
                  <div className="h-full bg-red-600 transition-all duration-[1.5s] rounded-full shadow-[0_0_10px_rgba(214,40,40,0.5)]" style={{ width: `${((quizIndex + 1) / quiz.length) * 100}%` }}></div>
               </div>
               <span className="text-[10px] sm:text-xs font-black text-red-600">SCORE: {score * 10}</span>
            </div>
            
            <div className="bg-white p-6 sm:p-16 rounded-[2.5rem] sm:rounded-[4.5rem] shadow-2xl border-2 border-slate-100 relative overflow-hidden traditional-card">
               <h3 className="text-2xl sm:text-4xl font-black text-black text-center mb-10 sm:mb-16 leading-tight tracking-tight kadazan-title italic">"{currentQ.question}"</h3>
               <div className="grid gap-4 sm:gap-6">
                 {currentQ.options.map((opt, i) => (
                   <button 
                    key={i}
                    disabled={!!feedbackMsg}
                    onClick={() => handleQuizAnswer(opt)}
                    className={`w-full p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 text-center font-black text-xl sm:text-2xl transition-all transform active:scale-95 ${
                      feedbackMsg 
                      ? opt === currentQ.correctAnswer 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl sm:shadow-2xl translate-y-[-4px] sm:translate-y-[-6px]' 
                        : 'bg-white border-slate-100 text-slate-200'
                      : 'border-amber-100 hover:border-black hover:bg-amber-50 text-slate-800 shadow-sm'
                    }`}
                   >
                     {opt}
                   </button>
                 ))}
               </div>
            </div>
            
            {feedbackMsg && (
              <div className="animate-in slide-in-from-bottom-14 duration-500">
                <div className={`p-6 sm:p-12 rounded-[2rem] sm:rounded-[3.5rem] mb-6 sm:mb-10 text-center shadow-2xl border-4 ${feedbackMsg.includes('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-600' : 'bg-red-50 text-red-900 border-red-600'}`}>
                  <p className="font-black text-xl sm:text-3xl leading-tight uppercase tracking-tight">{feedbackMsg}</p>
                </div>
                <button 
                  onClick={nextQuizItem}
                  className="w-full py-6 sm:py-8 bg-black text-white rounded-[2rem] sm:rounded-[3.5rem] font-black text-xl sm:text-3xl shadow-2xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-4 sm:gap-8 group border-b-4 sm:border-b-8 border-red-600"
                >
                  <span>{quizIndex === quiz.length - 1 ? 'COLLECT REWARD' : 'NEXT CHALLENGE'}</span>
                  <i className="fas fa-bolt text-amber-400 group-hover:scale-125 transition-transform"></i>
                </button>
              </div>
            )}
          </div>
        );

      case Screen.SENTENCES:
        if (!sentenceChallenge) return null;
        return (
          <div className="space-y-8 sm:space-y-12 page-fade-in">
            <div className="flex flex-col items-center">
               <div className="w-20 h-20 sm:w-32 sm:h-32 bg-black text-amber-400 rounded-[2.5rem] sm:rounded-[4rem] flex items-center justify-center text-4xl sm:text-6xl mb-6 sm:mb-8 shadow-2xl rotate-[-6deg] border-4 border-white animate-float">
                  <i className="fas fa-feather-pointed"></i>
               </div>
               <h2 className="text-4xl sm:text-6xl font-black text-black tracking-tighter kadazan-title uppercase italic leading-none">Monguhup</h2>
            </div>
            
            {/* Display Target Sentence (English) */}
            <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-slate-100 shadow-xl traditional-card relative overflow-hidden">
               <div className="absolute top-0 left-0 bg-red-600 text-white px-4 sm:px-6 py-1 sm:py-2 rounded-br-xl sm:rounded-br-2xl font-black text-[8px] sm:text-[10px] tracking-widest uppercase">TRANSLATE THIS</div>
               <p className="text-2xl sm:text-3xl text-slate-800 font-black italic tracking-tighter leading-snug text-center mt-6 sm:mt-4">"{sentenceChallenge.english}"</p>
               <p className="text-center text-amber-600 font-bold text-xs sm:text-sm mt-2 opacity-80">({sentenceChallenge.malay})</p>
            </div>
            
            {/* Selected Words Area (Answer Slot) */}
            <div className="min-h-[100px] sm:min-h-[140px] bg-slate-100 border-b-4 border-slate-200 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 flex flex-wrap gap-2 sm:gap-3 items-center justify-center transition-all">
              {selectedWords.length === 0 && (
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Tap words to build sentence</span>
              )}
              {selectedWords.map((word) => (
                <button 
                  key={word.id}
                  onClick={() => handleWordDeselect(word.id)}
                  className="bg-white text-black border-b-4 border-slate-900 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 font-black text-lg sm:text-xl shadow-md hover:translate-y-[2px] hover:border-b-2 active:scale-95 transition-all animate-in zoom-in"
                >
                  {word.text}
                </button>
              ))}
            </div>
            
            {/* Word Bank */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-2 sm:px-0">
               {availableWords.map((word) => (
                 <button
                   key={word.id}
                   onClick={() => handleWordSelect(word.id)}
                   className="bg-white text-slate-900 border-b-2 sm:border-b-4 border-slate-300 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-4 font-bold text-base sm:text-lg shadow-sm hover:border-amber-400 hover:bg-amber-50 hover:translate-y-[-2px] transition-all"
                 >
                   {word.text}
                 </button>
               ))}
            </div>
            
            {/* Actions */}
            <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
              <button 
                onClick={handleSentenceBuilderCheck}
                disabled={selectedWords.length === 0}
                className="w-full py-6 sm:py-8 bg-black text-white rounded-[2rem] sm:rounded-[3.5rem] font-black text-xl sm:text-3xl shadow-2xl hover:bg-slate-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all transform active:scale-95 border-b-[6px] sm:border-b-[10px] border-amber-400"
              >
                CHECK ANSWER
              </button>
              
              <button 
                onClick={handleStartSentences}
                className="w-full py-3 sm:py-4 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] hover:text-slate-600"
              >
                Skip This Challenge
              </button>
            </div>

            {/* Result Modal / Overlay */}
            {sentenceResult && (
              <div className={`fixed bottom-0 left-0 right-0 p-6 sm:p-8 pt-8 sm:pt-12 rounded-t-[2.5rem] sm:rounded-t-[4rem] border-t-4 sm:border-t-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-50 animate-in slide-in-from-bottom-full duration-300 ${sentenceResult.correct ? 'bg-emerald-100 border-emerald-500' : 'bg-red-100 border-red-500'}`}>
                 <div className="max-w-2xl mx-auto text-center space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
                       <i className={`fas ${sentenceResult.correct ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-red-600'} text-4xl sm:text-5xl`}></i>
                       <h3 className={`text-2xl sm:text-4xl font-black uppercase tracking-tighter ${sentenceResult.correct ? 'text-emerald-800' : 'text-red-800'}`}>
                         {sentenceResult.correct ? 'Kopisian!' : 'Ada Kooti!'}
                       </h3>
                    </div>
                    
                    <p className={`text-lg sm:text-xl font-bold italic ${sentenceResult.correct ? 'text-emerald-700' : 'text-red-700'}`}>
                      {sentenceResult.feedback}
                    </p>
                    
                    {!sentenceResult.correct && sentenceResult.correction && (
                       <div className="bg-white/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-red-200 inline-block">
                          <p className="text-[8px] sm:text-[10px] font-black text-red-400 uppercase tracking-widest mb-1 sm:mb-2">Correct Answer:</p>
                          <p className="text-xl sm:text-2xl font-black text-red-900">{sentenceResult.correction}</p>
                       </div>
                    )}
                    
                    {sentenceResult.correct ? (
                      <button 
                        onClick={handleStartSentences}
                        className="w-full py-4 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-xl sm:text-2xl shadow-xl transition-all active:scale-95 border-b-[6px] sm:border-b-8 bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-700"
                      >
                        NEXT CHALLENGE
                      </button>
                    ) : (
                      <div className="flex gap-3 sm:gap-4">
                        <button 
                          onClick={() => setSentenceResult(null)}
                          className="flex-1 py-4 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-base sm:text-xl shadow-xl transition-all active:scale-95 border-b-[6px] sm:border-b-8 bg-white text-red-700 border-red-300 hover:bg-red-50"
                        >
                          RETRY
                        </button>
                        <button 
                          onClick={handleStartSentences}
                          className="flex-1 py-4 sm:py-6 rounded-[2rem] sm:rounded-[3rem] font-black text-base sm:text-xl shadow-xl transition-all active:scale-95 border-b-[6px] sm:border-b-8 bg-red-600 text-white border-red-800 hover:bg-red-700"
                        >
                          NEXT
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            )}
          </div>
        );

      case Screen.ABOUT:
        return (
          <div className="space-y-12">
            <div className="flex flex-col items-center">
               <div className="w-24 h-24 bg-red-600 text-white rounded-[3rem] flex items-center justify-center text-4xl mb-6 shadow-xl border-[6px] border-black">
                  <i className="fas fa-leaf"></i>
               </div>
               <h2 className="text-5xl font-black text-black tracking-tighter kadazan-title uppercase italic leading-none mb-2 text-center">Our Heritage</h2>
               <p className="text-amber-600 font-black uppercase text-sm tracking-[0.4em] text-center">Bansa Kadazan</p>
            </div>
            
            <div className="bg-white p-4 rounded-[3.5rem] border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] relative overflow-hidden traditional-card">
               <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/4/41/Kadazandusun%27s_attire.jpg"
                  referrerPolicy="no-referrer"
                  className="w-full h-80 object-cover rounded-[2.5rem] border-2 border-black" 
                  alt="Kadazan traditional attire" 
               />
               <div className="p-8">
                  <h3 className="text-3xl font-black mb-4 kadazan-title italic">The Kadazan People</h3>
                  <div className="space-y-4 text-slate-700 font-bold text-lg leading-relaxed">
                    <p>
                      The Kadazan are an indigenous ethnic group of Sabah, Malaysia, residing primarily on the state's west coast. Along with the Dusun people, they form the largest indigenous group in Sabah, collectively known as the "Kadazan-Dusun".
                    </p>
                    <p>
                      Traditionally living an agrarian lifestyle, their culture remains deeply connected to the planting and harvesting of rice. This legacy is joyously celebrated every May during the <span className="text-black font-black">Kaamatan (Harvest Festival)</span>, giving thanks to Kinoingan (God) and the Bambaazon (rice spirit).
                    </p>
                    <p>
                      Their traditional attire, worn proudly during festivals and weddings, is known for its elegant black velvet fabric (known as 'Sinuangga' for women and 'Gaung' for men) adorned with intricate gold and colorful trimmings depicting cultural motifs.
                    </p>
                  </div>
               </div>
            </div>
            
            <div className="flex justify-center w-full mt-8 mb-4">
              <button 
                onClick={() => setCurrentScreen(Screen.HOME)}
                className="w-full max-w-[200px] py-3 bg-black text-white rounded-full font-black text-sm sm:text-base shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 border-b-4 border-amber-400 mx-auto"
              >
                <i className="fas fa-arrow-left text-amber-400"></i>
                <span>RETURN HOME</span>
              </button>
            </div>
          </div>
        );

      case Screen.FEEDBACK:
        return (
          <div className="bg-white p-6 sm:p-16 rounded-[4rem] sm:rounded-[6rem] shadow-2xl border-4 border-black text-center relative overflow-hidden traditional-card page-fade-in">
            <div className="absolute inset-0 bg-amber-400 opacity-5"></div>
            <div className="relative z-10">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-600 text-white rounded-full flex items-center justify-center text-5xl sm:text-6xl mx-auto mb-8 sm:mb-12 shadow-2xl animate-float">
                <i className="fas fa-heart"></i>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black text-red-600 mb-2 sm:mb-4 tracking-tighter kadazan-title italic uppercase">Kotohuadan!</h2>
                <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-sm">(Thank You!)</p>
                <textarea 
                placeholder="MONGUHU TOKOU... (Help Us Out... What should we add next?)"
                className="w-full p-6 sm:p-12 bg-white border-4 border-black rounded-[2.5rem] sm:rounded-[4.5rem] h-56 sm:h-72 focus:ring-12 focus:ring-red-50 focus:outline-none font-bold text-xl sm:text-2xl text-slate-900 mb-8 sm:mb-12 transition-all placeholder:text-slate-300 placeholder:normal-case shadow-inner"
                />
                <button 
                onClick={() => {
                    alert("Kotohuadan! Your spirit fuels K-Learn. ❤️");
                    setCurrentScreen(Screen.DASHBOARD);
                }}
                className="w-full py-8 bg-black text-white font-black rounded-[4rem] text-3xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-8 group active:scale-95 border-b-8 border-amber-400"
                >
                <span>SEND MESSAGE</span>
                <i className="fas fa-paper-plane text-amber-400 group-hover:rotate-12 transition-transform"></i>
                </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (currentScreen === Screen.ADMIN) {
    if (userProgress?.role !== 'admin') {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-100 flex-col gap-4">
           <h1 className="text-3xl font-black text-red-600">Access Denied</h1>
           <p className="font-bold text-slate-500">You must be an admin to view this page.</p>
           <button onClick={() => setCurrentScreen(Screen.HOME)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold mt-4">Go Home</button>
        </div>
      );
    }
    return <AdminPanel onBack={() => setCurrentScreen(Screen.HOME)} />;
  }

  return (
    <Layout currentScreen={currentScreen} onNavigate={setCurrentScreen} title={currentScreen === Screen.HOME || currentScreen === Screen.LOGIN ? undefined : currentScreen.toString()}>
      <div className="w-full h-full relative z-10">
        {renderScreen()}
      </div>
    </Layout>
  );
}
