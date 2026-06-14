import React, { useState, useMemo } from 'react';
import { WordPair } from '../types';
import { STATIC_VOCABULARY, translateWithAIDictionary } from '../services/geminiService';

interface DictionaryProps {
  onBack: () => void;
  handlePronounce: (text: string) => Promise<void>;
  loadingAudioFor: string | null;
  playingAudioFor: string | null;
}

export const Dictionary: React.FC<DictionaryProps> = ({
  onBack,
  handlePronounce,
  loadingAudioFor,
  playingAudioFor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResult, setAiResult] = useState<(WordPair & { explanation: string }) | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Flatten all static words with category names
  const allStaticWords = useMemo(() => {
    return Object.entries(STATIC_VOCABULARY).flatMap(([cat, words]) =>
      words.map((w) => ({ ...w, category: cat }))
    );
  }, []);

  // Filter static words based on search query (English, Kadazan, or Malay)
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return allStaticWords.filter(
      (w) =>
        w.english.toLowerCase().includes(query) ||
        w.kadazan.toLowerCase().includes(query) ||
        w.malay.toLowerCase().includes(query)
    );
  }, [searchQuery, allStaticWords]);

  // Featured static words to show as suggestions when query is empty
  const suggestionWords = useMemo(() => {
    // Show 4 interesting words across categories as a greeting
    return [
      { english: 'Thank you', kadazan: 'Kotohuadan', malay: 'Terima kasih', category: 'Phrases', example: 'Kotohuadan kio.', exampleEnglish: 'Thank you very much.', exampleMalay: 'Terima kasih banyak-banyak.', imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600' },
      { english: 'Dog', kadazan: 'Tasu', malay: 'Anjing', category: 'Animals', example: 'Agayo ilo tasu.', exampleEnglish: 'That dog is big.', exampleMalay: 'Anjing itu besar.', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600' },
      { english: 'Water', kadazan: 'Waig', malay: 'Air', category: 'Food', example: 'Onuai zou waig ahuma.', exampleEnglish: 'Give me warm water.', exampleMalay: 'Beri saya air suam.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Glass_of_water.jpg/960px-Glass_of_water.jpg' },
      { english: 'Mountain', kadazan: 'Nuhu', malay: 'Gunung', category: 'Nature', example: 'Nuhu Kinabalu.', exampleEnglish: 'Mount Kinabalu.', exampleMalay: 'Gunung Kinabalu.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/960px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg' },
    ];
  }, []);

  const handleAISearch = async () => {
    if (!searchQuery.trim() || loadingAI) return;
    setLoadingAI(true);
    setAiError(null);
    setAiResult(null);

    try {
      const result = await translateWithAIDictionary(searchQuery);
      if (result && result.success) {
        setAiResult(result);
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

  return (
    <div className="space-y-8 page-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <p className="text-red-600 font-black uppercase text-xs tracking-[0.4em]">KOTOBUTAN BOROS</p>
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter kadazan-title uppercase italic leading-none">
          Kadazan Dictionary
        </h2>
        <p className="text-slate-500 font-bold text-sm">
          Search for words in English, Malay, or Kadazan, or get standard translations instantly.
        </p>
      </div>

      {/* Interactive Search Panel */}
      <div className="bg-white p-5 rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setAiError(null);
              // Clear previous AI result if query is empty
              if (!e.target.value.trim()) {
                setAiResult(null);
              }
            }}
            placeholder="Type a word or sentence..."
            className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-inner"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className="fas fa-search text-xl"></i>
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setAiResult(null);
                setAiError(null);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 active:scale-95 transition-all outline-none"
              title="Clear search"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleAISearch}
              disabled={loadingAI}
              className="flex-1 py-4 bg-amber-400 hover:bg-amber-500 text-black border-2 border-black rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loadingAI ? (
                <>
                  <i className="fas fa-spinner animate-spin text-sm"></i>
                  <span>Momolisih... (Translating...)</span>
                </>
              ) : (
                <>
                  <i className="fas fa-language text-sm text-red-600"></i>
                  <span>FIND KADAZAN TRANSLATION</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Error Messages */}
        {aiError && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl border-2 border-red-200 font-bold text-center">
            <i className="fas fa-exclamation-circle text-lg mr-2"></i>
            {aiError}
          </div>
        )}

        {/* AI Dynamic Output Card */}
        {aiResult && (
          <div className="bg-amber-50 rounded-[3rem] p-6 sm:p-8 border-4 border-amber-400 shadow-[8px_8px_0px_rgba(245,158,11,1)] space-y-6 relative overflow-hidden animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b-2 border-amber-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">
                  BI-MOKO / DICTIONARY
                </span>
                <span className="bg-slate-900 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">
                  {aiResult.category}
                </span>
              </div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest select-none">
                Verified standard translation
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-amber-800 text-xs font-black uppercase tracking-[0.3em] mb-1">
                  Boros Kadazan
                </p>
                <div className="flex items-center gap-3">
                  <h3 className="text-3xl sm:text-5xl font-black text-black tracking-tight leading-none">
                    {aiResult.kadazan}
                  </h3>
                  <button
                    onClick={() => handlePronounce(aiResult.kadazan)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white text-amber-600 hover:bg-amber-100 border-2 border-black/10 outline-none ${
                      loadingAudioFor === aiResult.kadazan ? 'animate-pulse' : ''
                    }`}
                    title="Hear Pronunciation"
                  >
                    {loadingAudioFor === aiResult.kadazan ? (
                      <i className="fas fa-spinner animate-spin text-sm"></i>
                    ) : playingAudioFor === aiResult.kadazan ? (
                      <i className="fas fa-volume-high text-red-500 text-sm"></i>
                    ) : (
                      <i className="fas fa-volume-up text-sm"></i>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/60 p-4 rounded-xl border border-amber-200/40">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">English</p>
                  <p className="font-extrabold text-slate-800 text-base capitalize">{aiResult.english}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Malay (BM)</p>
                  <p className="font-extrabold text-slate-800 text-base capitalize">{aiResult.malay}</p>
                </div>
              </div>
            </div>

            {/* Explanation / Grammar info */}
            {aiResult.explanation && (
              <div className="bg-amber-900/5 p-4 rounded-2xl border border-amber-200 text-slate-800 leading-relaxed text-sm font-semibold">
                <h4 className="font-bold text-xs text-amber-900 tracking-wider uppercase mb-1 flex items-center gap-1.5">
                  <i className="fas fa-circle-info text-[10px]"></i> Linguistics & Culture Notes
                </h4>
                <p>{aiResult.explanation}</p>
              </div>
            )}

            {/* Example sentence */}
            {aiResult.example && (
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3 relative">
                <p className="text-[10px] text-red-600 font-black tracking-widest uppercase mb-1">
                  KADAZAN EXAMPLE SENTENCE
                </p>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-lg sm:text-xl text-slate-900 font-extrabold italic leading-snug text-left">
                    "{aiResult.example}"
                  </p>
                  <button
                    onClick={() => handlePronounce(aiResult.example || '')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 absolute top-4 right-4 ${
                      loadingAudioFor === aiResult.example ? 'animate-pulse' : ''
                    }`}
                    title="Pronounce Example"
                  >
                    {loadingAudioFor === aiResult.example ? (
                      <i className="fas fa-spinner animate-spin text-[10px]"></i>
                    ) : playingAudioFor === aiResult.example ? (
                      <i className="fas fa-volume-high text-red-500 text-[10px]"></i>
                    ) : (
                      <i className="fas fa-volume-up text-[10px]"></i>
                    )}
                  </button>
                </div>
                <div className="border-t border-slate-100 pt-2 space-y-1 text-left">
                  <p className="text-xs sm:text-sm text-amber-600 font-black italic">
                    BM: "{aiResult.exampleMalay}"
                  </p>
                  <p className="text-xs text-slate-400 font-bold">
                    EN: "{aiResult.exampleEnglish}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Static search results list */}
        {searchQuery.trim() && filteredWords.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              LOCAL MATCHES ({filteredWords.length})
            </h3>
            <div className="grid gap-4">
              {filteredWords.map((v, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-400 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md uppercase">
                      {v.category}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black text-slate-900">{v.kadazan}</p>
                      <button
                        onClick={() => handlePronounce(v.kadazan)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 outline-none ${
                          loadingAudioFor === v.kadazan ? 'animate-pulse' : ''
                        }`}
                        title="Pronounce"
                      >
                        {loadingAudioFor === v.kadazan ? (
                          <i className="fas fa-spinner animate-spin text-[10px]"></i>
                        ) : playingAudioFor === v.kadazan ? (
                          <i className="fas fa-volume-high text-red-500 text-[10px]"></i>
                        ) : (
                          <i className="fas fa-volume-up text-[10px]"></i>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {v.english} • <span className="text-amber-600 italic">({v.malay})</span>
                    </p>
                  </div>

                  {v.example && (
                    <div className="max-w-xs text-left bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <p className="italic font-bold">"{v.example}"</p>
                      <p className="text-slate-400 mt-1">"{v.exampleEnglish}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results prompt */}
        {searchQuery.trim() && filteredWords.length === 0 && !aiResult && !loadingAI && (
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto">
              <i className="fas fa-language"></i>
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-lg text-slate-900">Word not found in local modules</h4>
              <p className="text-sm font-semibold text-slate-500 max-w-sm mx-auto">
                No matching items in the preset list, but you can find a complete definition and translation dynamically in our standard reference dictionary!
              </p>
            </div>
            <button
              onClick={handleAISearch}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all outline-none"
            >
              <i className="fas fa-search text-red-400"></i>
              <span>LOOK UP TRANSLATION</span>
            </button>
          </div>
        )}

        {/* Welcome / Suggestions view if query is empty */}
        {!searchQuery.trim() && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
              POPULAR KADAZAN EXPRESSIONS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestionWords.map((v, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-3xl border-2 border-slate-100 gap-4 hover:border-amber-400 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md uppercase">
                        {v.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-slate-900">{v.kadazan}</p>
                      <button
                        onClick={() => handlePronounce(v.kadazan)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 outline-none ${
                          loadingAudioFor === v.kadazan ? 'animate-pulse' : ''
                        }`}
                        title="Pronounce"
                      >
                        {loadingAudioFor === v.kadazan ? (
                          <i className="fas fa-spinner animate-spin text-[10px]"></i>
                        ) : playingAudioFor === v.kadazan ? (
                          <i className="fas fa-volume-high text-red-500 text-[10px]"></i>
                        ) : (
                          <i className="fas fa-volume-up text-[10px]"></i>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {v.english} • <span className="text-amber-600 italic">({v.malay})</span>
                    </p>
                  </div>
                  {v.example && (
                    <div className="text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                      <p className="italic font-bold">"{v.example}"</p>
                      <p className="text-slate-400">"{v.exampleEnglish}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Return Button */}
      <div className="flex justify-center w-full pt-4">
        <button
          onClick={onBack}
          className="w-full max-w-[200px] py-3 bg-black text-white rounded-full font-black text-sm shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 border-b-4 border-amber-400"
        >
          <i className="fas fa-arrow-left text-amber-400"></i>
          <span>RETURN TO DASHBOARD</span>
        </button>
      </div>
    </div>
  );
};
