import React, { useState, useMemo, useEffect } from 'react';
import { WordPair } from '../types';
import { STATIC_VOCABULARY, translateWithAIDictionary } from '../services/geminiService';

interface DictionaryProps {
  onBack: () => void;
  handlePronounce: (text: string) => Promise<void>;
  loadingAudioFor: string | null;
  playingAudioFor: string | null;
}

// Heuristics to determine Part of Speech / Grammatical Category for any word
const getGrammarTag = (word: WordPair): 'Noun' | 'Verb' | 'Adjective' | 'Pronoun / Particle' | 'Phrase' => {
  const cat = word.category?.toLowerCase() || '';
  const eng = word.english.toLowerCase();
  const kad = word.kadazan.toLowerCase();

  if (cat.includes('phrase') || eng.includes('thank you') || eng.includes('welcome') || eng.includes('sorry') || eng.includes('hello')) {
    return 'Phrase';
  }
  if (cat.includes('verb') || eng.startsWith('to ') || kad.startsWith('ma') || kad.startsWith('mo')) {
    return 'Verb';
  }
  if (cat.includes('adjective') || cat.includes('color') || eng === 'happy' || eng === 'sad' || eng === 'hot' || eng === 'cold') {
    return 'Adjective';
  }
  if (cat.includes('pronoun') || cat.includes('connector') || eng === 'i' || eng === 'you' || eng === 'he' || eng === 'she' || eng === 'they' || eng === 'we') {
    return 'Pronoun / Particle';
  }
  return 'Noun'; // Default baseline is noun (animals, food, nature, body parts, etc.)
};

// Syllable separator helper
const getSyllablesHelper = (text: string): string => {
  const t = text.toLowerCase().trim();
  if (t === 'kopivosian') return 'Ko • pi • vo • si • an';
  if (t === 'kotohuadan') return 'Ko • to • hu • a • dan';
  if (t === 'ginawo') return 'Gi • na • wo';
  if (t === 'mamanau') return 'Ma • ma • nau';
  if (t === 'mangakan') return 'Ma • nga • kan';
  if (t === 'pambangan') return 'Pam • ba • ngan';
  if (t === 'rombituon') return 'Rom • bi • tu • on';
  if (t === 'karabau') return 'Ka • ra • bau';
  if (t === 'ouhongozon') return 'Ou • ho • ngo • zon';
  if (t === 'ounsikou') return 'Oun • si • kou';

  // Basic phonetic clustering for other words
  return text.split('').map((char, index) => {
    if (index > 0 && index < text.length - 1) {
      const prev = text[index - 1].toLowerCase();
      const next = text[index + 1].toLowerCase();
      const curr = char.toLowerCase();
      // Heuristic syllable boundary between vowel-consonant groupings
      if ('aeiou'.includes(curr) && !'aeiou'.includes(prev) && index > 1) {
        return ' • ' + char;
      }
    }
    return char;
  }).join('').replace(/\s*•\s*/g, ' • ');
};

const TRIVIA_LIST = [
  {
    title: "The Glottal Stop /’/",
    explanation: "In coastal Kadazan, the apostrophe represents a glottal stop (a sudden stoppage of airflow in your throat). Try speaking 'ko'ondom' - notice the slight catch before the second o!"
  },
  {
    title: "Double Vowel Length",
    explanation: "Double vowels in Kadazan indicate long vowels (e.g., 'paai' for paddy, or 'puun' for tree). Pronounce them by stretching the vowel sound slightly longer than standard Malay or English vowels."
  },
  {
    title: "The Letter /v/ vs /b/",
    explanation: "Coastal Kadazan features a soft, voiced labiodental fricative 'v' (like English verb) which corresponds to 'b' in interior dialects (e.g. 'vuhan' vs 'bulan' for moon)."
  },
  {
    title: "Standardization of the Language",
    explanation: "Subject standardisation is based predominantly on the Coastal Kadazan dialect of Penampang and Papar districts, making 'Kotobuton Boros' consistent with modern school curricula."
  }
];

export const Dictionary: React.FC<DictionaryProps> = ({
  onBack,
  handlePronounce,
  loadingAudioFor,
  playingAudioFor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [indexLanguage, setIndexLanguage] = useState<'kadazan' | 'english' | 'malay'>('kadazan');
  const [selectedLetter, setSelectedLetter] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGrammar, setSelectedGrammar] = useState<string>('All');
  
  // Detail card states
  const [activeWord, setActiveWord] = useState<WordPair | null>(null);
  
  // AI translations state
  const [aiResult, setAiResult] = useState<(WordPair & { explanation: string }) | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Trivia rotater index
  const [triviaIdx, setTriviaIdx] = useState(0);

  // Flatten all static words with category names
  const allStaticWords = useMemo(() => {
    const list: (WordPair & { category: string; grammarTag: 'Noun' | 'Verb' | 'Adjective' | 'Pronoun / Particle' | 'Phrase' })[] = [];
    Object.entries(STATIC_VOCABULARY).forEach(([cat, words]) => {
      words.forEach((w) => {
        list.push({
          ...w,
          category: cat,
          grammarTag: getGrammarTag(w)
        });
      });
    });
    
    // De-duplicate any exact duplicates (if overlapping between categories)
    const seen = new Set<string>();
    return list.filter(w => {
      const key = `${w.kadazan.toLowerCase()}-${w.english.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  // Filter categories present in the dictionary
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    allStaticWords.forEach(w => {
      if (w.category) set.add(w.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [allStaticWords]);

  // Handle deterministic Word-of-the-Day selection based on date of month
  const wordOfTheDay = useMemo(() => {
    if (allStaticWords.length === 0) return null;
    const day = new Date().getDate();
    const index = day % allStaticWords.length;
    return allStaticWords[index];
  }, [allStaticWords]);

  // Set default initial activeWord to Word-of-the-day when loaded
  useEffect(() => {
    if (wordOfTheDay && !activeWord && !aiResult) {
      setActiveWord(wordOfTheDay);
    }
  }, [wordOfTheDay]);

  // Active Letters - determine which letters actually have words under current settings
  const alphabetLetters = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const occupied = new Set<string>();
    
    allStaticWords.forEach(w => {
      let textToInspect = '';
      if (indexLanguage === 'kadazan') textToInspect = w.kadazan;
      else if (indexLanguage === 'english') textToInspect = w.english;
      else textToInspect = w.malay;

      if (textToInspect && textToInspect.length > 0) {
        occupied.add(textToInspect.trim().charAt(0).toUpperCase());
      }
    });

    return letters.map(l => ({
      char: l,
      hasWords: occupied.has(l)
    }));
  }, [allStaticWords, indexLanguage]);

  // Filter words inside the visible directory list
  const filteredWordsList = useMemo(() => {
    let result = [...allStaticWords];

    // 1. Text Search Filter (scans Kadazan, English, and Malay)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.english.toLowerCase().includes(query) ||
          w.kadazan.toLowerCase().includes(query) ||
          w.malay.toLowerCase().includes(query)
      );
    }

    // 2. A-Z Alphabet Filter
    if (selectedLetter !== 'All') {
      result = result.filter(w => {
        let textToInspect = '';
        if (indexLanguage === 'kadazan') textToInspect = w.kadazan;
        else if (indexLanguage === 'english') textToInspect = w.english;
        else textToInspect = w.malay;

        return textToInspect && textToInspect.trim().toUpperCase().startsWith(selectedLetter);
      });
    }

    // 3. Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(w => w.category === selectedCategory);
    }

    // 4. Grammar Tag Filter
    if (selectedGrammar !== 'All') {
      result = result.filter(w => w.grammarTag === selectedGrammar);
    }

    // Sort alphabetically based on indexLanguage
    return result.sort((a, b) => {
      const stringA = indexLanguage === 'kadazan' ? a.kadazan : indexLanguage === 'english' ? a.english : a.malay;
      const stringB = indexLanguage === 'kadazan' ? b.kadazan : indexLanguage === 'english' ? b.english : b.malay;
      return stringA.localeCompare(stringB);
    });
  }, [allStaticWords, searchQuery, selectedLetter, indexLanguage, selectedCategory, selectedGrammar]);

  // Handle dynamic AI translations
  const handleAISearch = async (overrideQuery?: string) => {
    const queryToSearch = overrideQuery || searchQuery;
    if (!queryToSearch.trim() || loadingAI) return;
    
    if (overrideQuery) {
      setSearchQuery(overrideQuery);
    }
    
    setLoadingAI(true);
    setAiError(null);
    setAiResult(null);

    try {
      const result = await translateWithAIDictionary(queryToSearch);
      if (result && result.success) {
        setAiResult(result);
        // Sync active word pane with the new dynamic translation
        setActiveWord(result);
      } else {
        setAiError('Could not translate dynamically. Please verify the word and try again.');
      }
    } catch (err) {
      console.error(err);
      setAiError('An unexpected error occurred during dynamic lookup.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSelectWord = (word: WordPair) => {
    // Clear AI results if changing selection to standard static word
    setAiResult(null);
    setActiveWord(word);
  };

  const cycleTrivia = () => {
    setTriviaIdx(prev => (prev + 1) % TRIVIA_LIST.length);
  };

  return (
    <div id="dictionary-hub" className="space-y-8 page-fade-in pb-12">
      {/* Header and Brand */}
      <div className="flex flex-col gap-2">
        <p className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">KOTOBUTAN BOROS SABA’AN</p>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter kadazan-title uppercase italic leading-none">
          Lexicon Directory
        </h2>
        <p className="text-slate-500 font-bold text-sm">
          A definitive multi-language resource. Browse categories, filter A-Z index, practice syllables, or look up custom entries dynamically.
        </p>
      </div>

      {/* Interactive Global Search & Translator */}
      <div className="bg-white p-5 rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
        {/* Universal Translation Engine Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-slate-950 to-blue-950 text-amber-400 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-inner">
          <div className="flex items-center gap-2 flex-wrap text-left">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <i className="fas fa-globe text-emerald-400"></i>
            <span>Universal Multi-Language Dictionary Engine Active</span>
          </div>
          <span className="text-amber-200 text-[9px] font-black">TYPE ANY WORD OR PHRASE IN THE WORLD</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAISearch();
          }}
          className="relative"
        >
          <input
            id="dic-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setAiError(null);
              // Clear previous AI result if query is empty
              if (!e.target.value.trim()) {
                setAiResult(null);
                if (wordOfTheDay) setActiveWord(wordOfTheDay);
              }
            }}
            placeholder="Type ANY word, phrase, sentence or Kamus Dewan term (e.g., happiness, prihatin, beautiful day)..."
            className="w-full pl-12 pr-12 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="fas fa-search text-xl"></i>
          </div>
          {searchQuery && (
            <button
              id="clear-dic-btn"
              type="button"
              onClick={() => {
                setSearchQuery('');
                setAiResult(null);
                setAiError(null);
                if (wordOfTheDay) setActiveWord(wordOfTheDay);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 active:scale-95 transition-all outline-none"
              title="Clear search"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </form>

        {/* Dynamic Instructional Helper Badge */}
        <div className="bg-amber-100/60 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-start gap-2.5 text-left">
          <i className="fas fa-lightbulb text-amber-600 text-sm mt-0.5 animate-bounce"></i>
          <div>
            <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-900">🌟 Dynamic Universal Lookup</p>
            <p className="text-[11px] font-semibold text-amber-800 leading-snug mt-0.5">
              Type any vocabulary word or conversational phrase in English, Standard Malay (Dewan Bahasa/Dewan Bahasa Pustaka), or Sabah Dialect. Our system translates it directly on-the-fly and explains grammar structures with correct pronunciation guides!
            </p>
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              id="ai-translate-lookup-btn"
              type="button"
              onClick={() => handleAISearch()}
              disabled={loadingAI}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 text-black border-2 border-black rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {loadingAI ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  <span>TRANSLATING WORD...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-magic text-red-600"></i>
                  <span>Translate "{searchQuery}" instantly</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {aiError && (
        <div className="bg-red-50 text-red-600 p-5 rounded-2xl border-2 border-red-200 font-bold text-center animate-bounce">
          <i className="fas fa-exclamation-circle text-lg mr-2"></i>
          {aiError}
        </div>
      )}

      {/* Main actual dictionary split panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - A-Z Directories & Filters & Lists (takes up 7/12 width) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Indexing Preferences Row */}
          <div className="bg-slate-900 text-white p-4 rounded-3xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">INDEX ALPHABET FROM</p>
              <h4 className="text-sm font-extrabold text-slate-100">Bilingual Directory Order</h4>
            </div>
            <div className="flex bg-slate-800 rounded-xl p-1 gap-1 border border-slate-700">
              {(['kadazan', 'english', 'malay'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setIndexLanguage(lang);
                    setSelectedLetter('All'); // reset letter filter to avoid zero results
                  }}
                  className={`px-3.5 py-2 rounded-lg font-black text-xs capitalize transition-all outline-none ${
                    indexLanguage === lang
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'malay' ? 'Malay (BM)' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* A-Z Index Letter Selector Grid */}
          <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-200/60 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Alphabet Filter ({indexLanguage})</span>
              <button
                type="button"
                onClick={() => setSelectedLetter('All')}
                className={`px-3 py-1 bg-white border border-slate-200 hover:border-black rounded-lg text-[10px] font-black tracking-wider uppercase transition-all ${
                  selectedLetter === 'All' ? 'bg-black! text-white! border-black' : 'text-slate-600'
                }`}
              >
                Show All Letters
              </button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1">
              {alphabetLetters.map(({ char, hasWords }) => (
                <button
                  key={char}
                  type="button"
                  disabled={!hasWords && searchQuery.length === 0}
                  onClick={() => setSelectedLetter(char)}
                  className={`py-2 text-center rounded-xl font-black text-sm border transition-all relative ${
                    selectedLetter === char
                      ? 'bg-amber-400 border-black text-black scale-105 z-10 shadow-sm'
                      : hasWords
                      ? 'bg-white border-slate-200 hover:border-slate-800 text-slate-950 hover:bg-slate-100/50'
                      : 'bg-slate-100/50 border-slate-100 text-slate-300 cursor-not-allowed text-xs font-normal'
                  }`}
                >
                  {char}
                  {hasWords && (
                    <span className="absolute bottom-0.5 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory Pills & Grammar filters */}
          <div className="flex flex-col gap-3">
            {/* Category Filter */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">TOPIC VOCABULARY</p>
              <div className="flex flex-wrap gap-1.5">
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      selectedCategory === cat
                        ? 'bg-black border-black text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grammar Filters */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">PARTS OF SPEECH</p>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Noun', 'Verb', 'Adjective', 'Pronoun / Particle', 'Phrase'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrammar(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all uppercase tracking-wide ${
                      selectedGrammar === g
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Directory Listings container */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                GLOSSARY REGISTER ({filteredWordsList.length} MATCHES)
              </h3>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Click on a glossary term to browse details</p>
            </div>

            {filteredWordsList.length === 0 ? (
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-300 text-center space-y-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] w-full">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                  <i className="fas fa-magic text-amber-700 text-xl animate-pulse"></i>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-black text-slate-900">Not in Local Glossary Register?</h4>
                  <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto leading-relaxed text-center">
                    You've searched for <strong className="text-amber-800">"{searchQuery || 'your filters'}"</strong>, which is not in our offline glossary register. Since our dictionary is connected to the universal database, you can look up ANY word in the world immediately!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => handleAISearch()}
                      disabled={loadingAI}
                      className="w-full sm:w-auto px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs rounded-xl uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {loadingAI ? (
                        <>
                          <i className="fas fa-spinner animate-spin"></i>
                          <span>TRANSLATING...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-bolt"></i>
                          <span>Translate "{searchQuery}" Now</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLetter('All');
                      setSelectedCategory('All');
                      setSelectedGrammar('All');
                      setSearchQuery('');
                      setAiResult(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl uppercase tracking-widest border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredWordsList.map((v, i) => {
                  const isActive = activeWord?.kadazan.toLowerCase() === v.kadazan.toLowerCase();
                  return (
                    <div
                      key={i}
                      onClick={() => handleSelectWord(v)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:bg-slate-50 text-left relative overflow-hidden flex flex-col justify-between group ${
                        isActive
                          ? 'bg-amber-50/75 border-amber-400 shadow-md ring-1 ring-amber-400'
                          : 'bg-white border-slate-100/80 shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded uppercase ${
                            isActive ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {v.grammarTag}
                          </span>
                          <span className={`text-[8px] font-bold text-slate-400 uppercase ${
                            isActive ? 'text-amber-700 font-extrabold' : ''
                          }`}>
                            {v.category}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-950 capitalize group-hover:text-amber-600 transition-colors">
                          {v.kadazan}
                        </h4>
                      </div>

                      <div className="border-t border-slate-100 pt-2 mt-2 flex flex-col gap-0.5 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-500 capitalize flex items-center gap-1">
                          <span className="text-[9px] text-slate-300 font-black">EN:</span> {v.english}
                        </p>
                        <p className="text-xs font-bold text-slate-500 capitalize flex items-center gap-1">
                          <span className="text-[9px] text-slate-300 font-black">BM:</span> {v.malay}
                        </p>
                      </div>
                      
                      {isActive && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm">
                          <i className="fas fa-chevron-right animate-pulse"></i>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick interactive trivia slider */}
          <div className="bg-gradient-to-r from-red-50 to-amber-50 p-5 rounded-3xl border-2 border-amber-200/60 text-left space-y-3 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <i className="fas fa-book-open text-6xl"></i>
            </div>
            <div className="flex items-center justify-between">
              <h5 className="font-black text-[10px] text-red-600 tracking-widest uppercase flex items-center gap-1.5">
                <i className="fas fa-graduation-cap"></i>
                KADAZAN PHONETICS & ORTHOGRAPHY TRIVIA
              </h5>
              <button
                type="button"
                onClick={cycleTrivia}
                className="text-xs text-amber-800 hover:text-black font-extrabold flex items-center gap-1"
              >
                <span>Next Fact</span>
                <i className="fas fa-angle-right"></i>
              </button>
            </div>
            <div className="space-y-1 transition-all">
              <p className="font-extrabold text-slate-900 text-sm">{TRIVIA_LIST[triviaIdx].title}</p>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">{TRIVIA_LIST[triviaIdx].explanation}</p>
            </div>
          </div>
        </div>

        {/* Right Column - Selected word Details "Lexicon Desk" (takes up 5/12 width) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-4">
          
          {/* Active Word Detail Display Card */}
          {activeWord ? (
            <div className="bg-amber-50/70 rounded-[3rem] p-6 sm:p-8 border-4 border-amber-400 shadow-[8px_8px_0px_rgba(0,0,0,1)] space-y-6 text-left relative overflow-hidden">
              {/* Corner Watermark */}
              <div className="absolute -top-3 -right-3 w-28 h-28 bg-amber-200/20 rounded-full blur-2xl pointer-events-none"></div>

              {/* Top Meta info */}
              <div className="flex items-center justify-between border-b-2 border-amber-200 pb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-red-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase shadow-sm">
                    {activeWord.category || 'Vocabulary'}
                  </span>
                  <span className="bg-slate-950 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">
                    {getGrammarTag(activeWord)}
                  </span>
                  {aiResult && activeWord.kadazan === aiResult.kadazan && (
                    <span className="bg-emerald-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase animate-pulse flex items-center gap-1">
                      <i className="fas fa-check-circle text-amber-300"></i> Kamus Dewan Match
                    </span>
                  )}
                </div>
                <div className="text-[9px] font-black tracking-wider text-amber-800 bg-amber-200/40 px-2 py-1 rounded-md">
                  Sabah Standard
                </div>
              </div>

              {/* Primary Lemma Heading & Sound Button */}
              <div>
                <p className="text-amber-800 text-[10px] font-black uppercase tracking-[0.25em] mb-1">LEMMA REFERENCE</p>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight leading-none capitalize">
                      {activeWord.kadazan}
                    </h3>
                    
                    {/* Syllables breakdown visual */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phonetic splits:</span>
                      <span className="text-xs font-extrabold text-amber-900 bg-amber-200/30 px-2 py-0.5 rounded border border-amber-200/40">
                        {getSyllablesHelper(activeWord.kadazan)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePronounce(activeWord.kadazan)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all bg-white hover:bg-amber-100 border-2 border-black/10 shadow-sm active:scale-95 outline-none ${
                      loadingAudioFor === activeWord.kadazan ? 'animate-pulse' : ''
                    }`}
                    title="Audio pronunciation guide"
                  >
                    {loadingAudioFor === activeWord.kadazan ? (
                      <i className="fas fa-spinner animate-spin text-sm text-amber-600"></i>
                    ) : playingAudioFor === activeWord.kadazan ? (
                      <i className="fas fa-volume-high text-red-500 text-sm"></i>
                    ) : (
                      <i className="fas fa-volume-up text-amber-600 text-sm"></i>
                    )}
                  </button>
                </div>
              </div>

              {/* Parallel translations box */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4.5 rounded-2xl border border-amber-200/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">ENGLISH REFERENCE</p>
                  <p className="font-extrabold text-slate-900 text-base leading-tight capitalize">{activeWord.english}</p>
                </div>
                <div className="bg-white p-4.5 rounded-2xl border border-amber-200/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">MALAY (TERJEMAHAN)</p>
                  <p className="font-extrabold text-slate-900 text-base leading-tight capitalize">{activeWord.malay}</p>
                </div>
              </div>

              {/* Cultural Context / Linguistics explanation */}
              {activeWord.explanation && (
                <div className="bg-white/50 p-4.5 rounded-2xl border border-amber-200/60 leading-relaxed text-sm font-semibold text-slate-700">
                  <h4 className="font-bold text-xs text-amber-900 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <i className="fas fa-info-circle text-[11px] text-red-500"></i> Linguistics & Etymology Notes
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{activeWord.explanation}</p>
                </div>
              )}

              {/* Usage Example sentence block */}
              {activeWord.example && (
                <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-red-600 font-extrabold tracking-widest uppercase">
                      CONTEXT PRACTICE SENTENCE
                    </p>
                    <button
                      onClick={() => handlePronounce(activeWord.example || '')}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-500 hover:text-amber-600 hover:bg-amber-100 border border-slate-200 ${
                        loadingAudioFor === activeWord.example ? 'animate-pulse' : ''
                      }`}
                      title="Pronounce context sentence"
                    >
                      {loadingAudioFor === activeWord.example ? (
                        <i className="fas fa-spinner animate-spin text-[10px]"></i>
                      ) : playingAudioFor === activeWord.example ? (
                        <i className="fas fa-volume-high text-red-500 text-[10px]"></i>
                      ) : (
                        <i className="fas fa-volume-up text-[10px]"></i>
                      )}
                    </button>
                  </div>

                  <p className="text-base sm:text-lg text-slate-900 font-black italic leading-snug">
                    "{activeWord.example}"
                  </p>

                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    <p className="text-xs text-amber-700 font-black">
                      BM: "{activeWord.exampleMalay}"
                    </p>
                    <p className="text-xs text-slate-400 font-bold">
                      EN: "{activeWord.exampleEnglish}"
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-150 text-center space-y-4">
              <p className="font-bold text-slate-400">Select any word card to view dictionary guidelines and sample sentences.</p>
            </div>
          )}

          {/* Word of the Day Greeting Anchor */}
          {wordOfTheDay && (
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] text-left relative overflow-hidden space-y-4">
              <div className="absolute bottom-0 right-0 opacity-10 font-bold text-7xl select-none">DAILY</div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1">
                  <i className="fas fa-star text-amber-400"></i> WORD OF THE DAY
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rotates Daily</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white capitalize">{wordOfTheDay.kadazan}</h4>
                <p className="text-xs font-bold text-slate-400">
                  Means: <span className="text-white font-extrabold capitalize">{wordOfTheDay.english}</span> ({wordOfTheDay.malay})
                </p>
                <p className="text-xs text-slate-300 italic pt-1">
                  "{wordOfTheDay.example}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectWord(wordOfTheDay)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition-all"
              >
                Inspect Definition details
              </button>
            </div>
          )}
        </div>
        
      </div>

      {/* Return to Dashboard Primary Footer */}
      <div className="flex justify-center w-full pt-6">
        <button
          onClick={onBack}
          className="w-full max-w-[220px] py-3.5 bg-black text-white hover:bg-slate-800 rounded-full font-black text-xs tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2 border-b-4 border-amber-400 shadow-lg"
        >
          <i className="fas fa-arrow-left text-amber-400"></i>
          <span>RETURN TO DASHBOARD</span>
        </button>
      </div>
    </div>
  );
};

