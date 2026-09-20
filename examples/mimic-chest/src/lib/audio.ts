/**
 * Procedural Web Audio API Synthesizer for "Arcana Fate" Casino.
 * 100% pure Web Audio API procedural synthesis (zero external audio files).
 * 
 * Features:
 * - BGM: Balatro Dark Occult Lounge (Dm9 -> Am9 -> BbMaj7 -> C9 warm ethereal chord progression,
 *        intentional 8-note Aeolian melodic celestial runs every 3.8s, zero repetitive heartbeat).
 * - SFX: Ceramic casino chip clink, weighty paper card whooshes, mechanical card clicks,
 *        3-ping FM silver coin chime, 6-coin rapid gold cascade shower, the void deep gong,
 *        and royal mythic jackpot fanfare.
 * - Zero ducking during routine gameplay to eliminate abrupt BGM volume drop artifacts.
 */

interface ChordVoice {
  name: string;
  padFreqs: number[]; // 5-voice pad frequencies
  melodicMotif: number[]; // Intentional 8-note Aeolian modal run
}

// Warm, ethereal 4-chord progression (Dm9 -> Am9 -> BbMaj7 -> C9)
const OCCULT_CHORDS: ChordVoice[] = [
  {
    name: 'Dm9',
    padFreqs: [146.83, 174.61, 220.00, 261.63, 329.63], // D3, F3, A3, C4, E4
    // 8-note D Aeolian motif: D4 -> F4 -> A4 -> C5 -> Bb4 -> A4 -> F4 -> E4
    melodicMotif: [293.66, 349.23, 440.00, 523.25, 466.16, 440.00, 349.23, 329.63],
  },
  {
    name: 'Am9',
    padFreqs: [110.00, 130.81, 164.81, 196.00, 246.94], // A2, C3, E3, G3, B3
    // 8-note A Aeolian motif: C4 -> E4 -> G4 -> B4 -> A4 -> G4 -> E4 -> D4
    melodicMotif: [261.63, 329.63, 392.00, 493.88, 440.00, 392.00, 329.63, 293.66],
  },
  {
    name: 'BbMaj7',
    padFreqs: [116.54, 146.83, 174.61, 220.00, 293.66], // Bb2, D3, F3, A3, D4
    // 8-note Bb Lydian/Aeolian motif: D4 -> F4 -> A4 -> C5 -> D5 -> C5 -> A4 -> F4
    melodicMotif: [293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23],
  },
  {
    name: 'C9',
    padFreqs: [130.81, 164.81, 196.00, 233.08, 293.66], // C3, E3, G3, Bb3, D4
    // 8-note C Mixolydian/Aeolian motif: C4 -> E4 -> G4 -> Bb4 -> D5 -> C5 -> Bb4 -> G4
    melodicMotif: [261.63, 329.63, 392.00, 466.16, 587.33, 523.25, 466.16, 392.00],
  },
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;

  public sfxEnabled: boolean = true;
  public bgmEnabled: boolean = false;

  // Cached White Noise buffer for tactile paper friction & transients
  private noiseBuffer: AudioBuffer | null = null;

  // BGM Synth State
  private isBgmPlaying: boolean = false;
  private bgmCompressor: DynamicsCompressorNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padGainNodes: GainNode[] = [];
  private bgmLfos: OscillatorNode[] = [];
  private currentChordIdx: number = 0;

  // BGM Timers
  private chordProgressionTimer: number | null = null;
  private harpChimeTimer: number | null = null;

  // Master Limiter to prevent clipping when multiple sounds play simultaneously
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;

  // Stable, soothing background music baseline volume (NO ducking drops during normal play)
  private readonly nominalBgmGain: number = 0.22;

  constructor() {
    try {
      const storedSfx = localStorage.getItem('mimic_sfx_enabled') ?? localStorage.getItem('mimic_audio_enabled');
      if (storedSfx !== null) {
        this.sfxEnabled = storedSfx === 'true';
      }
      const storedBgm = localStorage.getItem('mimic_bgm_enabled');
      if (storedBgm !== null) {
        this.bgmEnabled = storedBgm === 'true';
      }
    } catch {
      this.sfxEnabled = true;
      this.bgmEnabled = false;
    }

    // Auto-resume audio context on first user pointer/key interaction
    if (typeof window !== 'undefined') {
      const handleFirstInteraction = () => {
        this.handleUserInteraction();
        window.removeEventListener('pointerdown', handleFirstInteraction);
        window.removeEventListener('keydown', handleFirstInteraction);
      };
      window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
      window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    }
  }

  // ============================================================================
  // PUBLIC CONTROLS & STATE
  // ============================================================================

  public get enabled(): boolean {
    return this.sfxEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.setSfxEnabled(enabled);
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    try {
      localStorage.setItem('mimic_sfx_enabled', enabled ? 'true' : 'false');
      localStorage.setItem('mimic_audio_enabled', enabled ? 'true' : 'false');
    } catch {
      // sandboxed
    }
    if (this.sfxGainNode && this.ctx) {
      this.sfxGainNode.gain.setValueAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime);
    }
  }

  public toggleSfx(): boolean {
    const next = !this.sfxEnabled;
    this.setSfxEnabled(next);
    if (next) this.playClick();
    return next;
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    try {
      localStorage.setItem('mimic_bgm_enabled', enabled ? 'true' : 'false');
    } catch {
      // sandboxed
    }

    if (enabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  public toggleBgm(): boolean {
    const next = !this.bgmEnabled;
    this.setBgmEnabled(next);
    return next;
  }

  public handleUserInteraction() {
    this.initContext();
    if (this.bgmEnabled && !this.isBgmPlaying) {
      this.startBgm();
    }
  }

  // ============================================================================
  // CONTEXT & ROUTING INITIALIZATION
  // ============================================================================

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 1. Master Output Bus with Brickwall Limiter to avoid clipping
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.value = 1.0;

        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(4, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(16, this.ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.12, this.ctx.currentTime);

        this.masterGainNode.connect(this.masterLimiter);
        this.masterLimiter.connect(this.ctx.destination);

        // 2. Master SFX Bus
        this.sfxGainNode = this.ctx.createGain();
        this.sfxGainNode.gain.value = this.sfxEnabled ? 1.0 : 0.0;
        this.sfxGainNode.connect(this.masterGainNode);

        // 3. Master BGM Bus with Anti-Clipping Dynamics Compressor
        this.bgmCompressor = this.ctx.createDynamicsCompressor();
        this.bgmCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.bgmCompressor.knee.setValueAtTime(8, this.ctx.currentTime);
        this.bgmCompressor.ratio.setValueAtTime(3.0, this.ctx.currentTime);
        this.bgmCompressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
        this.bgmCompressor.release.setValueAtTime(0.20, this.ctx.currentTime);

        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.value = this.nominalBgmGain;

        this.bgmCompressor.connect(this.bgmGainNode);
        this.bgmGainNode.connect(this.masterGainNode);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  /**
   * Generates or retrieves a 1-second white noise buffer for realistic paper textures.
   */
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== this.ctx.sampleRate) {
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleRate; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  /**
   * Creates a StereoPannerNode if supported, or falls back to direct connection.
   */
  private createPanner(panValue: number = 0): StereoPannerNode | null {
    if (!this.ctx) return null;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), this.ctx.currentTime);
        return panner;
      }
    } catch {
      // fallback
    }
    return null;
  }

  /**
   * Gentle, subtle ducking strictly reserved for Tier 3 Jackpot (playLegendary).
   * Drops BGM slightly to let the mythic fanfare soar without abrupt silencing.
   */
  public duckBgm(durationMs: number = 2800) {
    if (!this.bgmGainNode || !this.ctx || !this.isBgmPlaying) return;
    const now = this.ctx.currentTime;
    const duckedGain = this.nominalBgmGain * 0.65; // Gentle 35% reduction, NOT silencing

    try {
      this.bgmGainNode.gain.cancelScheduledValues(now);
      this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
      this.bgmGainNode.gain.linearRampToValueAtTime(duckedGain, now + 0.15);

      const restoreTime = now + durationMs / 1000;
      this.bgmGainNode.gain.setValueAtTime(duckedGain, restoreTime);
      this.bgmGainNode.gain.linearRampToValueAtTime(this.nominalBgmGain, restoreTime + 0.8);
    } catch {
      // AudioParam safety
    }
  }

  // ============================================================================
  // OBJECTIVE 1 & 2: BGM REDESIGN — "BALATRO DARK OCCULT LOUNGE"
  // (Zero fatiguing heartbeat tap, continuous Dm9->Am9->BbMaj7->C9 chords, 8-note Aeolian motif)
  // ============================================================================

  public startBgm() {
    this.initContext();
    if (!this.ctx || !this.bgmCompressor || !this.bgmGainNode) return;

    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Smooth fade-in to stable nominal volume
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(0.0001, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(this.nominalBgmGain, now + 1.5);

    this.padOscillators = [];
    this.padGainNodes = [];
    this.bgmLfos = [];
    this.currentChordIdx = 0;

    // --------------------------------------------------------------------------
    // 1. WARM ETHEREAL CHORD PROGRESSION (Dm9 -> Am9 -> BbMaj7 -> C9)
    // Lowpass filter cutoff ~750Hz with subtle slow LFO modulation
    // --------------------------------------------------------------------------
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(750, now);
    padFilter.Q.setValueAtTime(1.1, now);
    padFilter.connect(this.bgmCompressor);

    // Subtle breathing LFO on filter cutoff (0.05Hz period ~20s, sweeping 620Hz to 880Hz)
    const padLfo = ctx.createOscillator();
    const padLfoGain = ctx.createGain();
    padLfo.type = 'sine';
    padLfo.frequency.setValueAtTime(0.05, now);
    padLfoGain.gain.setValueAtTime(130, now);
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start(now);
    this.bgmLfos.push(padLfo);

    // Initialize 5-Voice Dual-Operator Pad Oscillators (warm sine + triangle)
    const initialChord = OCCULT_CHORDS[0].padFreqs;
    initialChord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // Gentle chorus detune spread
      osc.detune.setValueAtTime((idx - 2) * 2.2, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 1.8);

      osc.connect(gain);
      gain.connect(padFilter);
      osc.start(now);

      this.padOscillators.push(osc);
      this.padGainNodes.push(gain);
    });

    // Advance chord every 8.5 seconds with seamless 3.0s exponential frequency glide
    const advanceChord = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      this.currentChordIdx = (this.currentChordIdx + 1) % OCCULT_CHORDS.length;
      const targetChord = OCCULT_CHORDS[this.currentChordIdx].padFreqs;
      const t = this.ctx.currentTime;

      this.padOscillators.forEach((osc, i) => {
        if (targetChord[i]) {
          try {
            osc.frequency.cancelScheduledValues(t);
            osc.frequency.setValueAtTime(osc.frequency.value, t);
            osc.frequency.exponentialRampToValueAtTime(targetChord[i], t + 3.0);
          } catch {
            // AudioParam glide safety
          }
        }
      });
    };

    this.chordProgressionTimer = window.setInterval(advanceChord, 8500);

    // --------------------------------------------------------------------------
    // 2. SUBTLE MELODIC CELESTIAL RUNS (Intentional 8-note Aeolian motif every 3.8s)
    // --------------------------------------------------------------------------
    const playCelestialRun = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmCompressor) return;
      const t = this.ctx.currentTime;
      const currentChord = OCCULT_CHORDS[this.currentChordIdx];
      const motif = currentChord.melodicMotif;

      motif.forEach((freq, noteIndex) => {
        const noteTime = t + noteIndex * 0.18; // Graceful 8-note musical sequence

        const osc = this.ctx!.createOscillator();
        const overtone = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();
        const bellFilter = this.ctx!.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2.005, noteTime); // Gentle octave shimmer
        overtone.detune.setValueAtTime(3, noteTime);

        bellFilter.type = 'bandpass';
        bellFilter.frequency.setValueAtTime(freq * 1.25, noteTime);
        bellFilter.Q.setValueAtTime(1.5, noteTime);

        // Soft bell envelope: 18ms soft attack, 1.4s exponential decay
        const decay = 1.4;
        noteGain.gain.setValueAtTime(0.0001, noteTime);
        noteGain.gain.linearRampToValueAtTime(0.32, noteTime + 0.018);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + decay);

        osc.connect(bellFilter);
        overtone.connect(bellFilter);
        bellFilter.connect(noteGain);
        noteGain.connect(this.bgmCompressor!);

        osc.start(noteTime);
        overtone.start(noteTime);
        osc.stop(noteTime + decay + 0.05);
        overtone.stop(noteTime + decay + 0.05);
      });
    };

    // Trigger initial run and start recurring interval (every 3.8 seconds)
    setTimeout(playCelestialRun, 900);
    this.harpChimeTimer = window.setInterval(playCelestialRun, 3800);
  }

  public stopBgm() {
    if (!this.isBgmPlaying) return;
    this.isBgmPlaying = false;

    if (this.chordProgressionTimer) {
      clearInterval(this.chordProgressionTimer);
      this.chordProgressionTimer = null;
    }
    if (this.harpChimeTimer) {
      clearInterval(this.harpChimeTimer);
      this.harpChimeTimer = null;
    }

    if (this.ctx && this.bgmGainNode) {
      const now = this.ctx.currentTime;
      try {
        this.bgmGainNode.gain.cancelScheduledValues(now);
        this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
        this.bgmGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      } catch {
        // safety
      }
    }

    setTimeout(() => {
      this.padOscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // cleanup
        }
      });
      this.padOscillators = [];
      this.padGainNodes = [];

      this.bgmLfos.forEach(lfo => {
        try {
          lfo.stop();
          lfo.disconnect();
        } catch {
          // cleanup
        }
      });
      this.bgmLfos = [];
    }, 650);
  }

  // ============================================================================
  // OBJECTIVE 3: SFX REDESIGN — "TACTILE CASINO JUICE & DOPAMINE"
  // (All routine interactions DO NOT duck BGM. Music remains steady and soothing.)
  // ============================================================================

  /**
   * Crisp UI Click: Layered micro-transient for UI buttons.
   */
  public playClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * 1. CASINO CHIP CLINK (playChipClink)
   * Simulates real heavy clay casino chips clattering together:
   * Layer 1: High-frequency ceramic impact (2.8kHz resonant pop with 12ms decay)
   * Layer 2: Micro ceramic texture transient (white noise burst)
   * Layer 3: Secondary bounce clatter (+16ms)
   */
  public playChipClink() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: 2.8kHz high-frequency ceramic impact with 12ms decay
    const osc1 = this.ctx.createOscillator();
    const filter1 = this.ctx.createBiquadFilter();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2800, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.012);

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(2800, now);
    filter1.Q.setValueAtTime(4.0, now);

    gain1.gain.setValueAtTime(0.68, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.sfxGainNode ?? this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.016);

    // Layer 2: Micro ceramic texture friction transient
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(3400, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.42, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.010);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGainNode ?? this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.012);
    }

    // Layer 3: Staggered secondary micro chip bounce (+16ms)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const t2 = now + 0.016;

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(3200, t2);
    osc2.frequency.exponentialRampToValueAtTime(1900, t2 + 0.008);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.48, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.010);

    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode ?? this.ctx.destination);

    osc2.start(t2);
    osc2.stop(t2 + 0.012);
  }

  /**
   * 2. CRISP TACTILE CARD SLIDE & WHOOSH (playCardDraw & playDealWhoosh)
   * Filtered noise with exponential curve (sweeping 900Hz -> 2400Hz)
   * producing a satisfying, weighty "SHH-WHIP" card draw. NO ducking!
   */
  public playCardDraw() {
    this.playPaperSlideWhoosh(0.20, 900, 2400, 0.58);
  }

  public playDealWhoosh() {
    this.playPaperSlideWhoosh(0.18, 850, 2200, 0.52);
  }

  public playChestShake() {
    this.playCardDraw();
  }

  private playPaperSlideWhoosh(duration = 0.20, startFreq = 900, endFreq = 2400, maxVolume = 0.55) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const noiseBuffer = this.getNoiseBuffer();
    if (!noiseBuffer) return;

    // Layer 1: Friction noise sweep (900Hz -> 2400Hz with exponential curve)
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(startFreq, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.7);
    noiseFilter.frequency.exponentialRampToValueAtTime(startFreq * 1.2, now + duration);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(maxVolume, now + 0.025);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode ?? this.ctx.destination);

    // Layer 2: Weighty cardstock body snap (triangle glide)
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(220, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(520, now + duration * 0.6);
    bodyOsc.frequency.exponentialRampToValueAtTime(150, now + duration);

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(maxVolume * 0.50, now + 0.025);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.sfxGainNode ?? this.ctx.destination);

    noiseSource.start(now);
    bodyOsc.start(now);
    noiseSource.stop(now + duration + 0.02);
    bodyOsc.stop(now + duration + 0.02);
  }

  /**
   * CRISP CARD SELECTION CLICK (playCardSelect)
   * Layers a 4ms micro-noise transient with a woody 240Hz resonant pop
   * to create a tactile mechanical "TOCK" when picking a card. NO ducking!
   */
  public playCardSelect() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: 4ms micro-noise transient
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3200, now);
      clickFilter.Q.setValueAtTime(2.2, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.68, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      noiseSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.sfxGainNode ?? this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.015);
    }

    // Layer 2: Woody 240Hz resonant pop
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.042);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(460, now);

    gain.gain.setValueAtTime(0.62, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * SUSPENSE TENSION RISER (playTensionRiser & playCardSqueeze)
   * Dual detuned oscillators sweeping 180Hz -> 680Hz with fast tremolo flutter. NO ducking!
   */
  public playTensionRiser(tierIndex: number = 0) {
    this.playCardSqueeze(tierIndex);
  }

  public playCardSqueeze(tierIndex: number = 0) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.42;

    const endFreq = tierIndex === 3 ? 920 : tierIndex === 2 ? 800 : tierIndex === 1 ? 720 : 640;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const tremoloGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    // Fast tremolo flutter (16Hz sine) simulating a racing pulse
    const tremoloLfo = this.ctx.createOscillator();
    const tremoloDepth = this.ctx.createGain();
    tremoloLfo.type = 'sine';
    tremoloLfo.frequency.setValueAtTime(16, now);
    tremoloDepth.gain.setValueAtTime(0.40, now);
    tremoloLfo.connect(tremoloDepth);
    tremoloDepth.connect(tremoloGain.gain);

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(183, now);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.015, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, now);
    filter.frequency.exponentialRampToValueAtTime(tierIndex === 3 ? 2800 : 2200, now + duration);
    filter.Q.setValueAtTime(1.8, now);

    tremoloGain.gain.setValueAtTime(0.75, now);

    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.52, now + duration * 0.85);
    masterGain.gain.linearRampToValueAtTime(0.70, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(tremoloGain);
    tremoloGain.connect(masterGain);
    masterGain.connect(this.sfxGainNode ?? this.ctx.destination);

    tremoloLfo.start(now);
    osc1.start(now);
    osc2.start(now);
    tremoloLfo.stop(now + duration + 0.02);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
  }

  /**
   * Crisp Card Flip
   */
  public playCardFlip() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

    gain.gain.setValueAtTime(0.58, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playChestOpen() {
    this.playCardFlip();
  }

  /**
   * 4. THE VOID DEEP GONG (LOSS / MIMIC) IMPACT (playMimic)
   * Heavy sub-bass drop (75Hz -> 24Hz) layered with an ominous dark low-register gong
   * (92Hz square/triangle with dark harmonic decay) to convey dramatic dread. NO ducking!
   */
  public playMimic() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Layer 1: Heavy sub-bass drop (75Hz -> 24Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.55);

    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.60);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGainNode ?? this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.62);

    // Layer 2: Ominous dark low-register gong (92Hz square/triangle with dark harmonic decay)
    const gongOsc = this.ctx.createOscillator();
    const gongOvertone = this.ctx.createOscillator();
    const gongFilter = this.ctx.createBiquadFilter();
    const gongGain = this.ctx.createGain();

    gongOsc.type = 'triangle';
    gongOsc.frequency.setValueAtTime(92, now);
    gongOsc.frequency.exponentialRampToValueAtTime(62, now + 0.85);

    gongOvertone.type = 'square';
    gongOvertone.frequency.setValueAtTime(138, now); // Perfect fifth undertone
    gongOvertone.frequency.exponentialRampToValueAtTime(84, now + 0.75);

    gongFilter.type = 'bandpass';
    gongFilter.frequency.setValueAtTime(184, now);
    gongFilter.Q.setValueAtTime(2.6, now);

    gongGain.gain.setValueAtTime(0.001, now);
    gongGain.gain.linearRampToValueAtTime(0.72, now + 0.02);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    gongOsc.connect(gongFilter);
    gongOvertone.connect(gongFilter);
    gongFilter.connect(gongGain);
    gongGain.connect(this.sfxGainNode ?? this.ctx.destination);

    gongOsc.start(now);
    gongOvertone.start(now);
    gongOsc.stop(now + 1.25);
    gongOvertone.stop(now + 1.25);

    // Layer 3: Dark tape-stop detuning crunch
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const crunchSource = this.ctx.createBufferSource();
      crunchSource.buffer = noiseBuffer;

      const crunchFilter = this.ctx.createBiquadFilter();
      crunchFilter.type = 'lowpass';
      crunchFilter.frequency.setValueAtTime(380, now);
      crunchFilter.frequency.exponentialRampToValueAtTime(50, now + 0.35);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(0.55, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      crunchSource.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(this.sfxGainNode ?? this.ctx.destination);

      crunchSource.start(now);
      crunchSource.stop(now + 0.40);
    }
  }

  /**
   * 5. SILVER RUNE (WIN 1.2x) CHIME & COIN CASCADE (playSilver)
   * 3 rapid FM coin pings (high metallic resonance with stereo shimmer) + pleasant ascending chime. NO ducking!
   */
  public playSilver() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Pleasant ascending chime: F5 (698Hz) -> A5 (880Hz) -> C6 (1046Hz)
    const melodicNotes = [698.46, 880.00, 1046.50];
    melodicNotes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.42, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.50);

      osc.connect(gain);
      gain.connect(this.sfxGainNode ?? this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.52);
    });

    // 2. Three rapid FM coin pings with stereo shimmer
    const fmCoins = [
      { carrierFreq: 2093.00, modFreq: 4186.0, delay: 0.00, pan: -0.35 }, // C7
      { carrierFreq: 2637.02, modFreq: 5274.0, delay: 0.055, pan: 0.10 }, // E7
      { carrierFreq: 3135.96, modFreq: 6271.9, delay: 0.115, pan: 0.35 }, // G7
    ];

    fmCoins.forEach(({ carrierFreq, modFreq, delay, pan }) => {
      const t = now + delay;
      const carrier = this.ctx!.createOscillator();
      const modulator = this.ctx!.createOscillator();
      const modGain = this.ctx!.createGain();
      const mainGain = this.ctx!.createGain();
      const panner = this.createPanner(pan);

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(carrierFreq, t);

      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(modFreq, t);

      modGain.gain.setValueAtTime(carrierFreq * 0.7, t);
      modGain.gain.exponentialRampToValueAtTime(0.01, t + 0.40);

      mainGain.gain.setValueAtTime(0.001, t);
      mainGain.gain.linearRampToValueAtTime(0.55, t + 0.006);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      modulator.connect(carrier.frequency);
      carrier.connect(mainGain);

      if (panner) {
        mainGain.connect(panner);
        panner.connect(this.sfxGainNode ?? this.ctx!.destination);
      } else {
        mainGain.connect(this.sfxGainNode ?? this.ctx!.destination);
      }

      modulator.start(t);
      carrier.start(t);
      modulator.stop(t + 0.60);
      carrier.stop(t + 0.60);
    });
  }

  /**
   * 6. GOLDEN SUN (WIN 2.5x) RAPID COIN SHOWER CASCADE (playGold)
   * Rapid cascade of 6 metallic coin drops with staggered delay:
   * (0ms, 40ms, 85ms, 130ms, 180ms, 230ms) producing a rich "cha-ching" coin shower! NO ducking!
   */
  public playGold() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Rapid cascade of 6 metallic coin drops with alternating stereo panning
    const coinDrops = [
      { freq: 1760.00, delayMs: 0, pan: -0.60 },   // A6
      { freq: 2093.00, delayMs: 40, pan: 0.45 },   // C7
      { freq: 2349.32, delayMs: 85, pan: -0.25 },  // D7
      { freq: 2793.83, delayMs: 130, pan: 0.55 },  // F7
      { freq: 3135.96, delayMs: 180, pan: -0.40 }, // G7
      { freq: 3520.00, delayMs: 230, pan: 0.30 },  // A7
    ];

    coinDrops.forEach(({ freq, delayMs, pan }) => {
      const t = now + delayMs / 1000;
      const osc = this.ctx!.createOscillator();
      const metallicShimmer = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const panner = this.createPanner(pan);

      // Carrier metallic coin pitch
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      // Inharmonic metallic clink overtone
      metallicShimmer.type = 'sine';
      metallicShimmer.frequency.setValueAtTime(freq * 2.414, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.58, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.50);

      osc.connect(gain);
      metallicShimmer.connect(gain);

      if (panner) {
        gain.connect(panner);
        panner.connect(this.sfxGainNode ?? this.ctx!.destination);
      } else {
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
      }

      osc.start(t);
      metallicShimmer.start(t);
      osc.stop(t + 0.55);
      metallicShimmer.stop(t + 0.55);
    });
  }

  /**
   * 7. WHEEL OF DESTINY (JACKPOT 5.0x) MYTHIC FANFARE (playLegendary)
   * Triumphant royal arpeggio (C5, E5, G5, B5, D6, G6) with shimmering polychrome bell resonance
   * and a sub-bass boom. Gently ducks BGM to let the royal fanfare soar!
   */
  public playLegendary() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Gentle subtle ducking strictly for the Tier 3 jackpot celebration
    this.duckBgm(2800);

    const now = this.ctx.currentTime;

    // Sub-bass boom foundation (65Hz -> 28Hz)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(65, now);
    boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.90);

    boomGain.gain.setValueAtTime(0.85, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.98);

    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGainNode ?? this.ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 1.0);

    // Ascending celestial arpeggio: C5 - E5 - G5 - B5 - D6 - G6
    const arpeggio = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    arpeggio.forEach((freq, idx) => {
      const t = now + 0.08 + idx * 0.075;
      const osc = this.ctx!.createOscillator();
      const overtone1 = this.ctx!.createOscillator();
      const overtone2 = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      overtone1.type = 'sine';
      overtone1.frequency.setValueAtTime(freq * 1.5, t); // Perfect fifth shimmer

      overtone2.type = 'sine';
      overtone2.frequency.setValueAtTime(freq * 2.0, t); // Octave brilliance

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.66, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.25);

      osc.connect(gain);
      overtone1.connect(gain);
      overtone2.connect(gain);
      gain.connect(this.sfxGainNode ?? this.ctx!.destination);

      osc.start(t);
      overtone1.start(t);
      overtone2.start(t);
      osc.stop(t + 1.3);
      overtone1.stop(t + 1.3);
      overtone2.stop(t + 1.3);
    });
  }

  /**
   * 8. BALATRO-STYLE PITCH-SHIFTED TALLY (playTallyStep)
   * Mechanical clicker chime whose frequency scales up by +1 semitone per step:
   * baseFreq * Math.pow(2, step / 12). NO ducking!
   */
  public playTallyStep(step: number = 0) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreq = 440; // A4
    const freq = baseFreq * Math.pow(2, step / 12);

    // 1. Clicker transient (mechanical snap)
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const clickFilter = this.ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3200, now);
      clickFilter.Q.setValueAtTime(2.2, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.48, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noiseSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(this.sfxGainNode ?? this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.018);
    }

    // 2. Clear bell chime tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.015);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.60, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  /**
   * Balatro-style multiplier counting score sequence with semitone progression. NO ducking!
   */
  public playPitchShiftTally(
    toMultiplier: number,
    onStep?: (stepIndex: number, currentMult: number, isFinal: boolean) => void,
    fastMode: boolean = false,
    fromMultiplier: number = 1.0,
  ) {
    const startVal = Math.max(0, fromMultiplier);
    const endVal = Math.max(0, toMultiplier);
    const diff = Math.abs(endVal - startVal);
    const steps = endVal >= 5 ? 8 : endVal >= 2.5 ? 7 : diff >= 0.5 ? 6 : 5;
    const stepIntervalMs = fastMode ? (endVal >= 5 ? 22 : 28) : (endVal >= 5 ? 45 : 55);

    if (!this.sfxEnabled) {
      for (let i = 0; i < steps; i++) {
        const isFinal = i === steps - 1;
        const progress = (i + 1) / steps;
        const currentMult = isFinal ? endVal : startVal + (endVal - startVal) * Math.pow(progress, 1.2);
        setTimeout(() => {
          onStep?.(i, Math.round(currentMult * 100) / 100, isFinal);
        }, i * stepIntervalMs);
      }
      return;
    }

    this.initContext();
    if (!this.ctx) return;

    for (let i = 0; i < steps; i++) {
      const delayMs = i * stepIntervalMs;
      const isFinal = i === steps - 1;
      const progress = (i + 1) / steps;
      const currentMult = isFinal ? endVal : startVal + (endVal - startVal) * Math.pow(progress, 1.2);

      setTimeout(() => {
        onStep?.(i, Math.round(currentMult * 100) / 100, isFinal);
        this.playTallyStep(i);

        // On final step for big wins (>= 2.5x), add a golden shimmer overtone
        if (isFinal && endVal >= 2.5 && this.ctx) {
          const t = this.ctx.currentTime;
          const oscOvertone = this.ctx.createOscillator();
          const gainOvertone = this.ctx.createGain();

          oscOvertone.type = 'sine';
          oscOvertone.frequency.setValueAtTime(880 * 2, t);

          gainOvertone.gain.setValueAtTime(0.001, t);
          gainOvertone.gain.linearRampToValueAtTime(0.48, t + 0.01);
          gainOvertone.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

          oscOvertone.connect(gainOvertone);
          gainOvertone.connect(this.sfxGainNode ?? this.ctx.destination);

          oscOvertone.start(t);
          oscOvertone.stop(t + 0.48);
        }
      }, delayMs);
    }
  }

  /**
   * Sparkle chime for Foil edition cards (+0.2x bonus). NO ducking!
   */
  public playFoilTing() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [880.0, 1318.51]; // A5, E6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.58, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
      }, i * 90);
    });
  }

  /**
   * Triple-harmonic resonance when Holo edition triggers (+0.5x bonus). NO ducking!
   */
  public playHoloTing() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [739.99, 880.0, 1174.66]; // F#5, A5, D6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const overtone = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.55, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        overtone.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        overtone.start(now);
        osc.stop(now + 0.48);
        overtone.stop(now + 0.48);
      }, i * 85);
    });
  }

  /**
   * Polychrome celestial crystal chime. NO ducking!
   */
  public playPolychromeChime() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [1046.5, 1318.51, 1567.98, 1975.53, 2349.32, 3135.96];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const oscOvertone = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        oscOvertone.type = 'triangle';
        oscOvertone.frequency.setValueAtTime(freq * 1.5, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.52, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        oscOvertone.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        oscOvertone.start(now);
        osc.stop(now + 0.65);
        oscOvertone.stop(now + 0.65);
      }, i * 65);
    });
  }

  /**
   * Rune Resonance Pentagram Circle Chime / Surge. NO ducking!
   */
  public playRuneResonance(streak: number) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (streak === 1) {
      const freqs = [528, 1056];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.52 / (idx + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.25);
      });
    } else if (streak === 2) {
      const freqs = [440, 554, 659, 1318];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.48 / Math.sqrt(idx + 1), now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.45);
      });
    } else {
      const notes = [440, 554, 659, 880, 1108, 1320];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + idx * 0.06;
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.5);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.44, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.6);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.65);
      });
    }
  }

  /**
   * Melancholic near-miss sigh when unpicked card was 5.0x Jackpot. NO ducking!
   */
  public playNearMissSigh() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(360, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.7);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(356, now);
    osc2.frequency.exponentialRampToValueAtTime(218, now + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(320, now + 0.75);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.52, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.85);
    osc2.stop(now + 0.85);
  }
}

export const sound = new SoundManager();
