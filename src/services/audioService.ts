
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Packages raw 16-bit PCM (24000Hz mono) into a standard RIFF/WAV Uint8Array
export function pcmToWavBytes(pcmData: Uint8Array, sampleRate: number = 24000): Uint8Array {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + pcmData.length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (1 = PCM) */
  view.setUint16(20, 1, true);
  /* channel count (1 = Mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, pcmData.length, true);

  // Copy header and PCM data
  const headerBytes = new Uint8Array(buffer, 0, 44);
  const wavBytes = new Uint8Array(44 + pcmData.length);
  wavBytes.set(headerBytes, 0);
  wavBytes.set(pcmData, 44);

  return wavBytes;
}

// Packages raw 16-bit PCM (24000Hz mono) into a standard RIFF/WAV Blob
export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const wavBytes = pcmToWavBytes(pcmData, sampleRate);
  return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let ttsAudioCtx: AudioContext | null = null;

export function primeAudioContext(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!ttsAudioCtx) {
      ttsAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      console.log("AudioContext initialized via gesture priming.");
    }
    if (ttsAudioCtx && ttsAudioCtx.state === 'suspended') {
      ttsAudioCtx.resume()
        .then(() => console.log("AudioContext successfully resumed via priming."))
        .catch((err) => console.warn("Could not resume AudioContext:", err));
    }
  } catch (err) {
    console.warn("Failed to prime AudioContext:", err);
  }
}

export async function playTTS(base64: string): Promise<void> {
  return new Promise((resolve) => {
    let triedWebAudioFallback = false;

    const triggerWebAudioFallback = async () => {
      if (triedWebAudioFallback) {
        resolve();
        return;
      }
      triedWebAudioFallback = true;
      console.log("Triggering Web Audio API decoding fallback...");
      try {
        primeAudioContext();
        if (!ttsAudioCtx) {
          throw new Error("No AudioContext available");
        }
        const pcmBytes = decode(base64);
        const buffer = decodeAudioData(pcmBytes, ttsAudioCtx, 24000, 1);
        const source = ttsAudioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(ttsAudioCtx.destination);
        source.onended = () => {
          resolve();
        };
        source.start(0);
      } catch (err) {
        console.error("Web Audio API decoding fallback failed as well:", err);
        resolve();
      }
    };

    try {
      // 1. Generate Wave Bytes
      const pcmBytes = decode(base64);
      const wavBytes = pcmToWavBytes(pcmBytes, 24000);
      
      // 2. Conver to Base64 Data URI instead of blob: URL (which is highly restricted in Android WebViews)
      const base64Wav = uint8ArrayToBase64(wavBytes);
      const dataUri = "data:audio/wav;base64," + base64Wav;
      
      const audio = new Audio();
      audio.src = dataUri;
      
      audio.onended = () => {
        resolve();
      };
      
      audio.onerror = (e) => {
        console.error("HTML5 WAV base64 Audio playback error, trying Web Audio API context fallback:", e);
        triggerWebAudioFallback();
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("HTML5 WAV base64 Audio playback started successfully in WebView.");
          })
          .catch((err) => {
            console.warn("HTML5 base64 audio play was prevented/blocked, trying Web Audio API context fallback:", err);
            triggerWebAudioFallback();
          });
      }
    } catch (error) {
      console.error("Error creating or playing base64 WAV audio:", error);
      triggerWebAudioFallback();
    }
  });
}

export interface PhoneticSegment {
  type: 'vowel' | 'nasal' | 'fricative' | 'plosive' | 'silence';
  char: string;
  duration: number;
}

export function parseToPhoneticSegments(text: string): PhoneticSegment[] {
  const segments: PhoneticSegment[] = [];
  const normalized = text.toLowerCase()
    .normalize('NFD')                     // Decompose any letters
    .replace(/[\u0300-\u036f]/g, '')       // Strip diacritics
    .replace(/[^a-z0-9 ]/g, '')           // Keep only safe characters
    .trim();

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === ' ') {
      segments.push({ type: 'silence', char, duration: 0.14 });
      continue;
    }

    // Vowel check
    if (['a', 'e', 'i', 'o', 'u'].includes(char)) {
      segments.push({ type: 'vowel', char, duration: 0.11 });
    }
    // Fricatives sibilance
    else if (['s', 'h', 'v', 'f', 'z', 'x'].includes(char)) {
      segments.push({ type: 'fricative', char, duration: 0.08 });
    }
    // Nasals
    else if (['m', 'n', 'g'].includes(char)) {
      if (char === 'n' && i + 1 < normalized.length && normalized[i + 1] === 'g') {
        segments.push({ type: 'nasal', char: 'ng', duration: 0.09 });
        i++; // skip next char 'g'
      } else {
        segments.push({ type: 'nasal', char, duration: 0.08 });
      }
    }
    // Plosives
    else if (['p', 'b', 't', 'd', 'k', 'c', 'j'].includes(char)) {
      segments.push({ type: 'plosive', char, duration: 0.06 });
    }
    // Liquids mapped as thin vowel/glide transitions
    else if (['r', 'l', 'y', 'w'].includes(char)) {
      segments.push({ type: 'vowel', char, duration: 0.07 });
    } else {
      // Small silent gap
      segments.push({ type: 'silence', char, duration: 0.04 });
    }
  }
  return segments;
}

function isVoiced(type: 'vowel' | 'nasal' | 'fricative' | 'plosive' | 'silence', char: string): boolean {
  if (type === 'vowel' || type === 'nasal') return true;
  if (type === 'fricative' && ['v', 'z'].includes(char)) return true;
  if (type === 'plosive' && ['b', 'd', 'g', 'j'].includes(char)) return true;
  return false;
}

function speakSynthesizedText(segments: PhoneticSegment[], ctx: AudioContext): number {
  const now = ctx.currentTime + 0.05;
  
  // Create fundamental glottal voice oscillator source
  const osc = ctx.createOscillator();
  const oscLPF = ctx.createBiquadFilter();
  osc.type = 'triangle';
  oscLPF.type = 'lowpass';
  oscLPF.frequency.setValueAtTime(1200, ctx.currentTime); // soft roll-off for natural sounding pulse wave
  osc.connect(oscLPF);

  // Subtle natural vocal pitch vibrato (6.0Hz gentle vibrato)
  const vibratoOsc = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibratoOsc.frequency.value = 6.0;
  vibratoGain.gain.value = 2.0;
  vibratoOsc.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  // Master volume gating for voicing node - fade in gently from absolute silence
  const voiceGain = ctx.createGain();
  voiceGain.gain.setValueAtTime(0.001, ctx.currentTime);
  oscLPF.connect(voiceGain);

  // Parallel formant filters to shape vowel phonetic regions
  const formant1 = ctx.createBiquadFilter();
  const formant2 = ctx.createBiquadFilter();
  const formant3 = ctx.createBiquadFilter();

  formant1.type = 'bandpass';
  formant2.type = 'bandpass';
  formant3.type = 'bandpass';

  // Slightly lower resonance Q to prevent synthetic ringing/feedback popping
  formant1.Q.value = 4.5;
  formant2.Q.value = 4.5;
  formant3.Q.value = 4.5;

  const gainF1 = ctx.createGain();
  const gainF2 = ctx.createGain();
  const gainF3 = ctx.createGain();

  // Initialize formants gains to gentle values
  gainF1.gain.setValueAtTime(0.01, ctx.currentTime);
  gainF2.gain.setValueAtTime(0.01, ctx.currentTime);
  gainF3.gain.setValueAtTime(0.01, ctx.currentTime);

  voiceGain.connect(formant1);
  voiceGain.connect(formant2);
  voiceGain.connect(formant3);

  formant1.connect(gainF1);
  formant2.connect(gainF2);
  formant3.connect(gainF3);

  // Master output leveler
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.28, ctx.currentTime);
  masterGain.connect(ctx.destination);

  gainF1.connect(masterGain);
  gainF2.connect(masterGain);
  gainF3.connect(masterGain);

  // Create white noise source buffers for fricative and plosive sounds
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseBuf.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;
  noiseSource.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(3500, ctx.currentTime);
  noiseFilter.Q.value = 1.0;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, ctx.currentTime);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  let t = now;
  const basePitch = 140; // Male-register baseline pitch contour
  const N = segments.length;

  const FORMANT_MAP: Record<string, { f1: number, g1: number, f2: number, g2: number, f3: number, g3: number }> = {
    a: { f1: 820, g1: 1.0, f2: 1250, g2: 0.65, f3: 2500, g3: 0.35 },
    e: { f1: 520, g1: 0.8, f2: 1850, g2: 0.75, f3: 2600, g3: 0.45 },
    i: { f1: 290, g1: 0.65, f2: 2250, g2: 0.85, f3: 2900, g3: 0.45 },
    o: { f1: 520, g1: 0.95, f2: 950, g2: 0.55, f3: 2400, g3: 0.25 },
    u: { f1: 310, g1: 0.75, f2: 850, g2: 0.45, f3: 2200, g3: 0.15 },
    y: { f1: 290, g1: 0.55, f2: 2250, g2: 0.75, f3: 2900, g3: 0.35 },
    w: { f1: 310, g1: 0.55, f2: 850, g2: 0.45, f3: 2200, g3: 0.15 },
    r: { f1: 450, g1: 0.65, f2: 1550, g2: 0.55, f3: 2400, g3: 0.25 },
    l: { f1: 400, g1: 0.75, f2: 1400, g2: 0.45, f3: 2300, g3: 0.25 },
    default: { f1: 550, g1: 0.6, f2: 1500, g2: 0.6, f3: 2500, g3: 0.3 }
  };

  // Trajectory Automation Loop (using strictly continuous mathematical ramps to avoid popping artifact "clicks")
  for (let idx = 0; idx < N; idx++) {
    const seg = segments[idx];
    const relativeIdx = idx / N;
    const transitionTime = 0.035; // smooth pitch and formant transition rise constant
    
    // Intoned micro-pitch transitions across wording
    const intonation = Math.sin(relativeIdx * Math.PI) * 12;
    const declination = - (relativeIdx * 8);
    const pitch = basePitch + intonation + declination;

    osc.frequency.linearRampToValueAtTime(pitch, t + transitionTime);

    const currentVoiced = isVoiced(seg.type, seg.char);
    const targetVol = currentVoiced
      ? (seg.type === 'vowel' ? 0.26 : seg.type === 'nasal' ? 0.20 : 0.08)
      : 0.001;

    // Smoothly glide the voice glottal carrier gain
    voiceGain.gain.linearRampToValueAtTime(targetVol, t + transitionTime);

    if (currentVoiced) {
      const pr = seg.type === 'vowel'
        ? (FORMANT_MAP[seg.char] || FORMANT_MAP.default)
        : { f1: 240, g1: 0.28, f2: 800, g2: 0.1, f3: 1500, g3: 0.04 }; // Soft nasal hum formants

      // Smoothly transition formant active frequencies & levels
      formant1.frequency.linearRampToValueAtTime(pr.f1, t + transitionTime);
      formant2.frequency.linearRampToValueAtTime(pr.f2, t + transitionTime);
      formant3.frequency.linearRampToValueAtTime(pr.f3, t + transitionTime);
      
      gainF1.gain.linearRampToValueAtTime(pr.g1 * 0.28, t + transitionTime);
      gainF2.gain.linearRampToValueAtTime(pr.g2 * 0.28, t + transitionTime);
      gainF3.gain.linearRampToValueAtTime(pr.g3 * 0.28, t + transitionTime);

      // Fade out high-pitch sibilance noise
      noiseGain.gain.linearRampToValueAtTime(0.001, t + transitionTime);
    } 
    else if (seg.type === 'fricative') {
      let fFreq = 3000;
      let fQ = 1.0;
      let fVol = 0.05;
      if (seg.char === 's') { fFreq = 6200; fQ = 1.5; fVol = 0.07; }
      else if (seg.char === 'h') { fFreq = 1500; fQ = 0.7; fVol = 0.04; }
      else if (seg.char === 'v' || seg.char === 'z') { fFreq = 3000; fQ = 1.1; fVol = 0.035; }

      // Smoothly pan frication filters & volume
      noiseFilter.frequency.setValueAtTime(fFreq, t);
      noiseFilter.Q.setValueAtTime(fQ, t);
      noiseGain.gain.linearRampToValueAtTime(fVol, t + transitionTime);

      if (seg.char === 'v' || seg.char === 'z') {
        const vVol = 0.06;
        voiceGain.gain.linearRampToValueAtTime(vVol, t + transitionTime);
      } else {
        voiceGain.gain.linearRampToValueAtTime(0.001, t + transitionTime);
      }
    }
    else if (seg.type === 'plosive') {
      let pFreq = 2000;
      let pVol = 0.07;
      if (['p', 'b'].includes(seg.char)) { pFreq = 580; pVol = 0.05; }
      else if (['t', 'd'].includes(seg.char)) { pFreq = 5000; pVol = 0.06; }

      // Soft gated transition before release burst rather than instant sharp zeroing
      voiceGain.gain.linearRampToValueAtTime(0.001, t + 0.01);
      noiseGain.gain.linearRampToValueAtTime(0.001, t + 0.01);

      // Burst build contour
      const burstStart = t + 0.015;
      noiseFilter.frequency.setValueAtTime(pFreq, burstStart);
      noiseGain.gain.setValueAtTime(0.001, burstStart);
      noiseGain.gain.linearRampToValueAtTime(pVol, burstStart + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + seg.duration);

      if (['b', 'd', 'g'].includes(seg.char)) {
        const bVol = 0.06;
        voiceGain.gain.setValueAtTime(0.001, burstStart);
        voiceGain.gain.linearRampToValueAtTime(bVol, burstStart + 0.01);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, t + seg.duration);
      }
    }
    else {
      // Smoothly drop to comfort silence
      voiceGain.gain.linearRampToValueAtTime(0.001, t + transitionTime);
      noiseGain.gain.linearRampToValueAtTime(0.001, t + transitionTime);
    }

    t += seg.duration;
  }

  // Safety volume release at the end of the text
  voiceGain.gain.linearRampToValueAtTime(0.001, t + 0.03);
  noiseGain.gain.linearRampToValueAtTime(0.001, t + 0.03);

  osc.start(ctx.currentTime);
  vibratoOsc.start(ctx.currentTime);
  noiseSource.start(ctx.currentTime);

  const cleanupTime = t + 0.2;
  osc.stop(cleanupTime);
  vibratoOsc.stop(cleanupTime);
  noiseSource.stop(cleanupTime);

  return cleanupTime - ctx.currentTime;
}

export function playOfflineVoice(text: string): Promise<void> {
  return new Promise((resolve) => {
    let completed = false;
    const safeResolve = () => {
      if (!completed) {
        completed = true;
        resolve();
      }
    };

    // 1. Setup Watchdog Safety timer (ensures UI buttons never lock if TTS fails or hangs on certain Android devices)
    const safetyLimit = Math.max(2500, text.length * 150);
    const watchdog = setTimeout(() => {
      console.warn("speechSynthesis/audiocontext watchdog completed speech via timeout bypass.");
      safeResolve();
    }, safetyLimit);

    // 2. PRIMARY: Try Browser Native SpeechSynthesis (works 100% offline in Chrome and Android WebViews)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find best local high-quality standard Malay / Indonesian phonetic voices for flawless indigenous pronunciations
        const voices = window.speechSynthesis.getVoices();
        const localVoice = voices.find(v => {
          const l = v.lang.toLowerCase().replace(/[-_]/g, '');
          return l.startsWith('ms') || l.startsWith('id') || v.name.toLowerCase().includes('malay') || v.name.toLowerCase().includes('indonesia');
        });

        if (localVoice) {
          utterance.voice = localVoice;
          utterance.lang = localVoice.lang;
        } else {
          utterance.lang = 'ms-MY';
        }

        utterance.rate = 0.82;   // elegant clear lesson pace
        utterance.pitch = 1.05;  // friendly warm pitch
        
        utterance.onend = () => {
          clearTimeout(watchdog);
          (window as any)._activeUtterance = null;
          safeResolve();
        };

        utterance.onerror = (e) => {
          console.warn("Android native SpeechSynthesis failed or silent. Running Web Audio synthesis fallback.", e);
          clearTimeout(watchdog);
          (window as any)._activeUtterance = null;
          playWebAudioSynthesisFallback(text).then(safeResolve);
        };

        // ANDROID CORE WEBVIEW BUG FIX: Store reference to active utterance on window to prevent WebView garbage collection
        (window as any)._activeUtterance = utterance;
        
        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn("Error starting native SpeechSynthesis, utilizing Web Audio synthesizer fallback.", err);
      }
    }

    // 3. FALLBACK: Fallback to the ultra-smooth click-free Web Audio Synthesizer
    clearTimeout(watchdog);
    playWebAudioSynthesisFallback(text).then(safeResolve);
  });
}

// Separate helper for Web Audio synthesizer fallback
function playWebAudioSynthesisFallback(text: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      primeAudioContext();
      if (!ttsAudioCtx) {
        throw new Error("No active AudioContext primed.");
      }
      
      const segments = parseToPhoneticSegments(text);
      if (segments.length === 0) {
        resolve();
        return;
      }

      const duration = speakSynthesizedText(segments, ttsAudioCtx);
      setTimeout(resolve, duration * 1000);
    } catch (err) {
      console.error("Web Audio Synthesizer fallback failed:", err);
      resolve();
    }
  });
}

