import React, { useState, useEffect } from 'react';
import { playOfflineVoice, primeAudioContext } from '../services/audioService';

export function AudioDiagnostics() {
  const [speechSupport, setSpeechSupport] = useState<boolean>(false);
  const [audioCtxSupport, setAudioCtxSupport] = useState<boolean>(false);
  const [audioCtxState, setAudioCtxState] = useState<string>('unknown');
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [localVoiceCount, setLocalVoiceCount] = useState<number>(0);
  const [testLog, setTestLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Perform active diagnostics on load
  useEffect(() => {
    // 1. Check SpeechSynthesis
    const speechOk = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setSpeechSupport(speechOk);

    // 2. Check Web Audio API
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext);
    setAudioCtxSupport(!!AudioContextClass);

    if (AudioContextClass) {
      try {
        const testCtx = new AudioContextClass();
        setAudioCtxState(testCtx.state);
        testCtx.close();
      } catch (e) {
        setAudioCtxState('error');
      }
    }

    // 3. Load voices list
    if (speechOk) {
      const getVoicesList = () => {
        const voices = window.speechSynthesis.getVoices();
        const malIdVoices = voices.filter(v => {
          const l = v.lang.toLowerCase().replace(/_/, '-');
          return l.startsWith('ms') || l.startsWith('id') || v.name.toLowerCase().includes('malay') || v.name.toLowerCase().includes('indonesia');
        });
        setLocalVoiceCount(malIdVoices.length);
        setAvailableVoices(voices.map(v => `${v.name} (${v.lang})`));
      };
      
      getVoicesList();
      if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = getVoicesList;
      }
    }
    
    addLog("System diagnostic tool mounted successfully.");
  }, []);

  const runTestTone = () => {
    addLog("Triggering unmuted chime bubble test tone...");
    primeAudioContext();

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        addLog("Error: Web Audio API is not supported in this WebView.");
        return;
      }
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // high clear bell pitch (A5)
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
      
      setAudioCtxState(ctx.state);
      addLog("Bubble tone played successfully! If silent, please check system volume/vibrate switches.");
    } catch (err: any) {
      addLog(`Error testing chime: ${err.message || err}`);
    }
  };

  const runOfflineVoiceSynthesizerTest = async () => {
    addLog("Initiating procedural offline voice tract synthesizer...");
    primeAudioContext();
    try {
      addLog("Speaking 'Kotohuadan' using continuous mathematical formants...");
      await playOfflineVoice("Kotohuadan");
      addLog("Speech synthesis complete (using voice tract modeling).");
    } catch (err: any) {
      addLog(`Formant synthesis failed: ${err.message || err}`);
    }
  };

  const forceResumeAudioContext = () => {
    addLog("Force resuming AudioContext...");
    try {
      primeAudioContext();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const temp = new AudioCtxClass();
        temp.resume().then(() => {
          setAudioCtxState(temp.state);
          addLog(`AudioContext resumed! Current State: ${temp.state}`);
          temp.close();
        });
      }
    } catch (e: any) {
      addLog(`Failed to resume: ${e.message || e}`);
    }
  };

  return (
    <div className="bg-slate-50 rounded-[2.5rem] border-4 border-black p-4 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)] relative overflow-hidden text-slate-900 mt-8">
      {/* Decorative top ribbon */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-amber-400 border-b-4 border-black"></div>
      
      <div className="pt-4 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl border-2 border-black flex items-center justify-center text-lg shadow-sm">
            <i className="fas fa-tools text-black"></i>
          </div>
          <div>
            <h4 className="text-xl font-black uppercase tracking-tight">APK Audio Diagnostics Hub</h4>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Troubleshooting web audio inside Android wrappers</span>
          </div>
        </div>

        {/* System Sub-components Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border-2 border-black flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-black">SpeechSynthesis</div>
              <div className="font-extrabold text-sm text-black">Browser Engine</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border-2 text-white ${speechSupport ? 'bg-emerald-500 border-emerald-700' : 'bg-red-500 border-red-700'}`}>
              {speechSupport ? "Supported" : "Missing"}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-black flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-black">Web Audio API</div>
              <div className="font-extrabold text-sm text-black">Hardware Synth</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border-2 text-white ${audioCtxSupport ? 'bg-emerald-500 border-emerald-700' : 'bg-red-500 border-red-700'}`}>
              {audioCtxSupport ? "Ready" : "Missing"}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border-2 border-black flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-black">Local Voice Packs</div>
              <div className="font-extrabold text-sm text-black">MS-MY / ID-ID</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border-2 text-white ${localVoiceCount > 0 ? 'bg-emerald-500 border-emerald-700' : 'bg-amber-500 border-amber-700'}`}>
              {localVoiceCount > 0 ? `${localVoiceCount} Voices` : "Use Fallback"}
            </span>
          </div>
        </div>

        {/* Live Audio control deck */}
        <div className="bg-white p-4 sm:p-6 rounded-[2rem] border-2 border-black space-y-4">
          <div className="font-black text-xs uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Interactive Audio Tests</span>
            <span className="text-slate-400 font-bold">State: <strong className="text-amber-500">{audioCtxState}</strong></span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={runTestTone}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-amber-100 text-slate-900 border-2 border-black font-extrabold text-xs sm:text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-volume-up text-amber-500"></i>
              <span>Test Chime Tone</span>
            </button>
            <button
              onClick={runOfflineVoiceSynthesizerTest}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-black text-xs sm:text-sm rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-microphone"></i>
              <span>Test Voice Tract</span>
            </button>
            <button
              onClick={forceResumeAudioContext}
              className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white border-2 border-black font-extrabold text-xs sm:text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-redo text-amber-400"></i>
              <span>Resume Audio API</span>
            </button>
          </div>
        </div>

        {/* Logs terminal */}
        <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border-2 border-black font-mono text-[10px] leading-normal h-40 overflow-y-auto space-y-1 shadow-inner">
          <div className="text-amber-400 font-extrabold border-b border-slate-800 pb-1 mb-2 uppercase tracking-widest flex items-center justify-between">
            <span>Console Logs</span>
            <span className="text-[8px] text-slate-500 lowercase">live diagnostics</span>
          </div>
          {testLog.length === 0 ? (
            <div className="text-slate-500 italic">No tests started. Click on test controls above to see diagnostic output...</div>
          ) : (
            testLog.map((log, index) => (
              <div key={index} className={log.includes("Error") ? "text-red-400 font-bold" : log.includes("played") || log.includes("complete") ? "text-emerald-400" : ""}>
                {log}
              </div>
            ))
          )}
        </div>

        {/* Technical Explainer / Instructions Guide */}
        <div className="space-y-4">
          <h5 className="text-sm font-black uppercase text-slate-700 flex items-center gap-1.5 pt-2">
            <i className="fab fa-android text-emerald-600"></i>
            <span>3 Essential Solutions for Perfect Android APK Speech Playback</span>
          </h5>

          <div className="space-y-3 font-semibold text-xs text-slate-700 leading-relaxed">
            {/* Fix 1: WebView Settings in Android Studio */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">1</span>
                <span>Unblock Audio Gesture Restrictions (For Developers)</span>
              </div>
              <p>
                By default, Android WebViews block any web browser speech from triggering without an explicit, synchronous click. If play contains delays or fades, Android completely blocks them.
              </p>
              <p className="font-mono text-[10px] bg-slate-900 text-amber-400 p-2.5 rounded-xl border border-black leading-relaxed overflow-x-auto whitespace-pre">
{`// Inside your Android Studio app MainActivity (Java)
myWebView.getSettings().setMediaPlaybackRequiresUserGesture(false);`}
              </p>
              <p>
                Adding this single configuration inside your Android Studio wrapper project entirely unlocks Web Audio API and SpeechSynthesis offline, making audio work instantly!
              </p>
            </div>

            {/* Fix 2: Google TTS voice packs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">2</span>
                <span>Install Offline Speech Packs (For Users/Devices)</span>
              </div>
              <p>
                Native offline text-to-speech translates Malay or Sabah terms beautifully. However, mobile devices must have the offline local language packs installed in their OS Settings:
              </p>
              <ul className="list-decimal pl-5 space-y-1.5 font-bold text-slate-800">
                <li>Open Android <strong className="text-black">Settings</strong> app.</li>
                <li>Go to <strong className="text-black">General Management / System</strong> &gt; <strong className="text-black">Language &amp; Input</strong> &gt; <strong className="text-black">Text-to-speech</strong>.</li>
                <li>Ensure <strong className="text-black">Google Speech Services</strong> is selected.</li>
                <li>Tap the Settings gear icon &gt; click <strong className="text-black">Install Voice Data</strong>.</li>
                <li>Locate and download <strong className="text-emerald-700">Malay (Malaysia)</strong> or <strong className="text-emerald-700">Indonesian (Indonesia) Pack</strong>.</li>
              </ul>
              <p>
                Once downloaded, SpeechSynthesis is 100% available offline inside your APK with premium, crystal-clear indigenous accents!
              </p>
            </div>

            {/* Fix 3: Capacitor Plugins */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
              <div className="font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">3</span>
                <span>Using Capacitor Native Audio Bridge (For Production apps)</span>
              </div>
              <p>
                If compiling using Capacitor (the standard Cordova successor), you can install the offline audio plugin:
              </p>
              <p className="font-mono text-[10px] bg-slate-900 text-amber-400 p-2 text-center rounded-xl border border-black">
                npm i @capacitor-community/native-audio
              </p>
              <p>
                The native audio plugin communicates with native Android MediaPlayer assets directly. Since our modular web application dynamically falls back gracefully, optimizing the standard HTML WebView triggers (Fix 1 and 2) is the fastest, zero-latency setup!
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
