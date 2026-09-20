/**
 * Web Audio API synthesizer for sound effects (SFX) and background music (BGM).
 * Requires zero external audio files — guarantees 100% reliable sound playback!
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;

  public sfxEnabled: boolean = true;
  public bgmEnabled: boolean = false;

  // BGM Ambient Synth state
  private isBgmPlaying: boolean = false;
  private bgmCompressor: DynamicsCompressorNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private droneGains: GainNode[] = [];
  private padOscs: OscillatorNode[] = [];
  private padGains: GainNode[] = [];
  private bgmLfos: OscillatorNode[] = [];
  private bgmTimer: number | null = null;
  private bgmChordTimer: number | null = null;
  private readonly nominalBgmGain: number = 0.28; // Rich, mystic occult ambient level (never piercing)

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

    // Auto-resume audio context and BGM on user interaction if enabled
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

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master SFX Bus
        this.sfxGainNode = this.ctx.createGain();
        this.sfxGainNode.gain.value = this.sfxEnabled ? 1.0 : 0.0;
        this.sfxGainNode.connect(this.ctx.destination);

        // Master BGM Bus with dedicated anti-clipping dynamics compressor
        this.bgmCompressor = this.ctx.createDynamicsCompressor();
        this.bgmCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.bgmCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.bgmCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.bgmCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.bgmCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.value = this.nominalBgmGain;

        this.bgmCompressor.connect(this.bgmGainNode);
        this.bgmGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  /**
   * Smoothly ducks the ambient BGM volume when large game events occur
   * so sound effects stay pristine and impactful.
   */
  public duckBgm(durationMs: number = 1200) {
    if (!this.bgmGainNode || !this.ctx || !this.isBgmPlaying) return;
    const now = this.ctx.currentTime;
    const duckedGain = this.nominalBgmGain * 0.25; // Duck down by ~75%

    try {
      this.bgmGainNode.gain.cancelScheduledValues(now);
      this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
      this.bgmGainNode.gain.linearRampToValueAtTime(duckedGain, now + 0.05);

      const restoreTime = now + durationMs / 1000;
      this.bgmGainNode.gain.setValueAtTime(duckedGain, restoreTime);
      this.bgmGainNode.gain.linearRampToValueAtTime(this.nominalBgmGain, restoreTime + 0.6);
    } catch {
      // AudioParam safety
    }
  }

  // ============================================================================
  // PROCEDURAL DARK OCCULT DRONE BGM (Balatro-inspired Ambient Web Audio Synth)
  // ============================================================================

  /**
   * Starts an ambient dark occult drone BGM composed of:
   * 1. Deep Sub-bass foundation (45Hz - 60Hz) with lowpass filtering.
   * 2. Slow-modulating Minor Chord Pads (Am7 / Dm7 / Em7) with breathing LFO.
   * 3. Generative Mystic Chime / Harp Arpeggiator (Aeolian/Dorian pentatonic scale).
   * All routed through master dynamics compressor to guarantee zero clipping.
   */
  public startBgm() {
    this.initContext();
    if (!this.ctx || !this.bgmCompressor || !this.bgmGainNode) return;

    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Fade in master BGM bus smoothly
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(0.0001, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(this.nominalBgmGain, now + 0.8);

    this.droneOscs = [];
    this.droneGains = [];
    this.padOscs = [];
    this.padGains = [];
    this.bgmLfos = [];

    // ========================================================================
    // LAYER 1: Deep Sub-Bass Occult Drone (45Hz - 60Hz low resonant foundation)
    // ========================================================================
    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(80, now);
    subFilter.Q.setValueAtTime(2.0, now);
    subFilter.connect(this.bgmCompressor);

    // Drone voices: 55Hz (A1) sine + 55Hz triangle detuned + 82.4Hz (E2, fifth)
    const subVoices = [
      { f: 55.0, type: 'sine' as OscillatorType, vol: 0.85, detune: 0 },
      { f: 55.0, type: 'triangle' as OscillatorType, vol: 0.35, detune: 2.2 },
      { f: 82.41, type: 'sine' as OscillatorType, vol: 0.45, detune: -1.5 },
      { f: 49.0, type: 'sine' as OscillatorType, vol: 0.50, detune: 1.0 }, // Sub rumble
    ];

    subVoices.forEach(({ f, type, vol, detune }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(f, now);
      osc.detune.setValueAtTime(detune, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.45, now + 1.5);

      osc.connect(gain);
      gain.connect(subFilter);
      osc.start(now);

      this.droneOscs.push(osc);
      this.droneGains.push(gain);
    });

    // ========================================================================
    // LAYER 2: Slow-Modulating Minor Chord Occult Pads (Am7 / Dm7 / Em7)
    // ========================================================================
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(320, now);
    padFilter.Q.setValueAtTime(2.2, now);
    padFilter.connect(this.bgmCompressor);

    // LFO: Slow breathing cycle (~15.4s period) modulating pad lowpass cutoff
    const padLfo = ctx.createOscillator();
    const padLfoGain = ctx.createGain();
    padLfo.type = 'sine';
    padLfo.frequency.setValueAtTime(0.065, now);
    padLfoGain.gain.setValueAtTime(140, now); // Modulates filter between 180Hz and 460Hz
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start(now);
    this.bgmLfos.push(padLfo);

    // Occult chord progressions: Am7 -> Dm7 -> Em7 -> Am7
    const chords = [
      [110.0, 130.81, 164.81, 196.0], // Am7: A2, C3, E3, G3
      [146.83, 174.61, 220.0, 261.63], // Dm7: D3, F3, A3, C4
      [164.81, 196.0, 246.94, 293.66], // Em7: E3, G3, B3, D4
      [110.0, 130.81, 164.81, 220.0],  // Am: A2, C3, E3, A3
    ];
    let currentChordIndex = 0;

    // Instantiate pad oscillators (4 voices)
    const activePadOscs: OscillatorNode[] = [];
    const activePadGains: GainNode[] = [];

    chords[0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((i - 1.5) * 3, now); // Gentle chorus spread

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 2.0);

      osc.connect(gain);
      gain.connect(padFilter);
      osc.start(now);

      activePadOscs.push(osc);
      activePadGains.push(gain);
      this.padOscs.push(osc);
      this.padGains.push(gain);
    });

    // Chord progression cycle every 10 seconds with smooth cross-glide
    const advanceChord = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      currentChordIndex = (currentChordIndex + 1) % chords.length;
      const targetChord = chords[currentChordIndex];
      const t = this.ctx.currentTime;

      activePadOscs.forEach((osc, i) => {
        if (targetChord[i]) {
          try {
            osc.frequency.cancelScheduledValues(t);
            osc.frequency.setValueAtTime(osc.frequency.value, t);
            osc.frequency.exponentialRampToValueAtTime(targetChord[i], t + 3.5);
          } catch {
            // fallback
          }
        }
      });
    };

    this.bgmChordTimer = window.setInterval(advanceChord, 10000);

    // ========================================================================
    // LAYER 3: Generative Mystic Chime / Harp Arpeggiator (Aeolian/Dorian Scale)
    // ========================================================================
    // Mystical Aeolian / Dorian pentatonic scale frequencies
    const mysticScale = [
      220.0,  // A3
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.0,  // G4
      440.0,  // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
    ];

    let arpIndex = 0;

    const playMysticChime = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmCompressor) return;
      const t = this.ctx.currentTime;

      // 20% chance of mystical silence/pause for breathing occult rhythm
      if (Math.random() < 0.20) {
        return;
      }

      // Procedurally select next note in scale with smooth stepping
      const step = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : -1;
      arpIndex = (arpIndex + step + mysticScale.length) % mysticScale.length;
      const freq = mysticScale[arpIndex];

      const osc = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const chimeFilter = this.ctx.createBiquadFilter();

      // Fundamental sine + subtle mystic shimmer overtone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, t);
      overtone.detune.setValueAtTime(3, t);

      // Resonant bandpass filter to give ancient harp/bell acoustic resonance
      chimeFilter.type = 'bandpass';
      chimeFilter.frequency.setValueAtTime(freq * 1.4, t);
      chimeFilter.Q.setValueAtTime(2.8, t);

      // Delicate envelope: 18ms soft attack, 650ms - 950ms exponential decay
      const decayDuration = 0.65 + Math.random() * 0.3;
      noteGain.gain.setValueAtTime(0.0001, t);
      noteGain.gain.linearRampToValueAtTime(0.22, t + 0.018);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, t + decayDuration);

      osc.connect(chimeFilter);
      overtone.connect(chimeFilter);
      chimeFilter.connect(noteGain);
      noteGain.connect(this.bgmCompressor);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + decayDuration + 0.05);
      overtone.stop(t + decayDuration + 0.05);

      // 30% chance of a subtle secondary echo / grace note 120ms later
      if (Math.random() < 0.3) {
        const echoTime = t + 0.12;
        const echoOsc = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();

        const echoFreq = mysticScale[(arpIndex + 2) % mysticScale.length];
        echoOsc.type = 'sine';
        echoOsc.frequency.setValueAtTime(echoFreq, echoTime);

        echoGain.gain.setValueAtTime(0.0001, echoTime);
        echoGain.gain.linearRampToValueAtTime(0.10, echoTime + 0.015);
        echoGain.gain.exponentialRampToValueAtTime(0.0001, echoTime + 0.5);

        echoOsc.connect(echoGain);
        echoGain.connect(this.bgmCompressor);

        echoOsc.start(echoTime);
        echoOsc.stop(echoTime + 0.55);
      }
    };

    // Staggered arpeggiator timing (~2.2s - 2.8s dynamic interval)
    setTimeout(playMysticChime, 600);
    this.bgmTimer = window.setInterval(playMysticChime, 2400);
  }

  /**
   * Stops the ambient BGM loop with smooth fade-out and cleans up all active audio nodes.
   */
  public stopBgm() {
    if (!this.isBgmPlaying) return;
    this.isBgmPlaying = false;

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmChordTimer) {
      clearInterval(this.bgmChordTimer);
      this.bgmChordTimer = null;
    }

    if (this.ctx && this.bgmGainNode) {
      const now = this.ctx.currentTime;
      try {
        this.bgmGainNode.gain.cancelScheduledValues(now);
        this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
        this.bgmGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.5);
      } catch {
        // safety
      }
    }

    setTimeout(() => {
      // Clean up drone oscillators
      this.droneOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.droneOscs = [];
      this.droneGains = [];

      // Clean up pad oscillators
      this.padOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.padOscs = [];
      this.padGains = [];

      // Clean up LFOs
      this.bgmLfos.forEach(lfo => {
        try {
          lfo.stop();
          lfo.disconnect();
        } catch {
          // ignore
        }
      });
      this.bgmLfos = [];
    }, 550);
  }

  // ============================================================================
  // GAME SOUND EFFECTS (SFX)
  // ============================================================================

  public playClick() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCardDraw() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(900);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playChestShake() {
    this.playCardDraw();
  }

  /**
   * Resonant Runic Chime / Astral Surge for the Rune Resonance Pentagram Circle.
   * - Streak 1: Crystal chime (528Hz Solfeggio frequency + bell harmonic).
   * - Streak 2: Blazing golden triad bell chord (440Hz + 554Hz + 659Hz).
   * - Streak 3+: Triumphant astral power crescendo with surging harmonic arpeggio!
   */
  public playRuneResonance(streak: number) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1400);
    const now = this.ctx.currentTime;

    if (streak === 1) {
      // Crystal chime / Solfeggio 528Hz
      const freqs = [528, 1056];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.25);
      });
    } else if (streak === 2) {
      // Golden triad bell chord (A4 major: 440, 554, 659 Hz)
      const freqs = [440, 554, 659, 1318];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16 / Math.sqrt(idx + 1), now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.45);
      });
    } else {
      // Streak 3+: Astral Surge Arpeggio & Harmonic Chorus
      const notes = [440, 554, 659, 880, 1108, 1320];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const startTime = now + idx * 0.06;
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.5);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.6);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx!.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.65);
      });
    }
  }

  /**
   * Suspenseful rising pitch tension sweep for the Slow Peek / Squeeze mechanic (~420ms).
   * Generates an eerie, escalating synth riser with harmonic tension before the dramatic card flip.
   */
  public playCardSqueeze(tierIndex: number = 0) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1600);

    const now = this.ctx.currentTime;
    const duration = 0.44;

    // 1. Primary tension riser oscillator (rising 130Hz -> 760Hz - 980Hz)
    const osc1 = this.ctx.createOscillator();
    const filter1 = this.ctx.createBiquadFilter();
    const gain1 = this.ctx.createGain();

    osc1.type = tierIndex === 3 ? 'sawtooth' : tierIndex === 0 ? 'sawtooth' : 'triangle';
    osc1.frequency.setValueAtTime(130, now);
    const targetEndFreq = tierIndex === 3 ? 980 : tierIndex === 2 ? 840 : tierIndex === 1 ? 720 : 620;
    osc1.frequency.exponentialRampToValueAtTime(targetEndFreq, now + duration);

    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(300, now);
    filter1.frequency.exponentialRampToValueAtTime(tierIndex === 3 ? 2800 : 2000, now + duration);
    filter1.Q.setValueAtTime(3.2, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + duration * 0.85);
    gain1.gain.linearRampToValueAtTime(0.32, now + duration);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.sfxGainNode ?? this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + duration + 0.02);

    // 2. Harmonic shimmer / tension undertone
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'sine';
    const startFreq = tierIndex === 0 ? 80 : 220;
    const endFreq = tierIndex === 3 ? 1520 : tierIndex === 2 ? 1200 : 700;
    osc2.frequency.setValueAtTime(startFreq, now);
    osc2.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(tierIndex === 3 ? 0.22 : 0.15, now + duration);

    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode ?? this.ctx.destination);

    osc2.start(now);
    osc2.stop(now + duration + 0.02);
  }

  public playCardFlip() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1200);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);

    // Subtle follow-up magic flutter
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(780, now + 0.22);
    gain2.gain.setValueAtTime(0.12, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode ?? this.ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.25);
  }

  public playChestOpen() {
    this.playCardFlip();
  }

  public playMimic() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1800);

    const now = this.ctx.currentTime;

    // Menacing low growl / chomp
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.4);

    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(this.sfxGainNode ?? this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.45);

    // Follow-up bite click
    setTimeout(() => {
      if (!this.ctx || !this.sfxEnabled) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(90, t);
      osc2.frequency.exponentialRampToValueAtTime(30, t + 0.2);

      gain2.gain.setValueAtTime(0.24, t);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc2.connect(gain2);
      gain2.connect(this.sfxGainNode ?? this.ctx.destination);

      osc2.start(t);
      osc2.stop(t + 0.2);
    }, 150);
  }

  public playSilver() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1400);

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      }, i * 90);
    });
  }

  public playGold() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1800);

    const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }, i * 110);
    });
  }

  public playLegendary() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(2600);

    // Major triumphant ascending arpeggio with brass undertone
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 0.5, now);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.5);
        osc2.stop(now + 0.5);
      }, i * 120);
    });
  }

  /**
   * Sparkling crystal chime arpeggio for Polychrome edition cards.
   * High crystalline sine waves with rich harmonic overtones and bell resonance.
   */
  public playPolychromeChime() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(2000);

    // Ethereal high-crystal bell frequencies (C6, E6, G6, B6, D7, G7)
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
        gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
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

  // ============================================================================
  // BALATRO-STYLE PROCEDURAL ARCANA SYNTHESIZERS
  // ============================================================================

  /**
   * Low-to-high swoosh when cards deal onto the table.
   * Procedural sweeping bandpass filter with smooth organic swell.
   */
  public playDealWhoosh() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(600);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Fast low-to-high frequency sweep (140Hz up to 540Hz)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);

    // Resonant bandpass filter opening up
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(1600, now + 0.18);
    filter.Q.setValueAtTime(1.8, now);

    // Soft swell envelope: 35ms attack, 180ms decay
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /**
   * Crisp mechanical snap when hovering / clicking a card.
   * High-transient card stock click + snappy damped thud.
   */
  public playCardSelect() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. High transient snap (1100Hz -> 220Hz in 28ms)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.028);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    osc.connect(gain);
    gain.connect(this.sfxGainNode ?? this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);

    // 2. Tactile body tap (damped wooden/card thud)
    const osc2 = this.ctx.createOscillator();
    const filter2 = this.ctx.createBiquadFilter();
    const gain2 = this.ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(340, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.045);

    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(450, now);

    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.sfxGainNode ?? this.ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.055);
  }

  /**
   * Crisp metallic bell sparkle when Foil edition triggers (+0.2x / +50 Chips).
   * Double bell chime ting-ting! (A5 -> E6, 880Hz -> 1318.5Hz).
   */
  public playFoilTing() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1400);

    const notes = [880.0, 1318.51]; // A5, E6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx || !this.sfxEnabled) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.02);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.38);
      }, i * 90);
    });
  }

  /**
   * Prismatic triple-harmonic resonance when Holo edition triggers (+0.5x / +10 Mult).
   * Ascending bell triple ting-ting-ting! (F#5, A5, D6: 739.99Hz -> 880.0Hz -> 1174.66Hz).
   */
  public playHoloTing() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1600);

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
        gain.gain.linearRampToValueAtTime(0.22, now + 0.008);
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
   * Rapid sequence of ascending sine/triangle blips whose pitch rises
   * exponentially (like the Balatro chip scoring tally).
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
    const baseFreq = 340 + Math.min(200, endVal * 35);
    const pitchFactor = 1.08 + Math.min(0.08, endVal * 0.015);
    const stepIntervalMs = fastMode ? (endVal >= 5 ? 20 : 25) : (endVal >= 5 ? 45 : 55);

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

    this.duckBgm(1600);

    for (let i = 0; i < steps; i++) {
      const delayMs = i * stepIntervalMs;
      const isFinal = i === steps - 1;
      const progress = (i + 1) / steps;
      const currentMult = isFinal ? endVal : startVal + (endVal - startVal) * Math.pow(progress, 1.2);

      setTimeout(() => {
        onStep?.(i, Math.round(currentMult * 100) / 100, isFinal);

        if (!this.ctx || !this.sfxEnabled) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Calculate exponentially rising frequency for each tally step
        const freq = baseFreq * Math.pow(pitchFactor, i);
        osc.type = isFinal ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);
        // Slight micro-pitch bend at start of each note for snappy arcade punch
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.015);
        osc.frequency.exponentialRampToValueAtTime(freq, t + 0.05);

        const volume = isFinal ? 0.28 : 0.16 + (i / steps) * 0.08;
        const duration = isFinal ? 0.25 : 0.07;

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.sfxGainNode ?? this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration + 0.02);

        // On final step for big wins (>= 2.5x), add a crystal shimmer overtone
        if (isFinal && endVal >= 2.5) {
          const oscOvertone = this.ctx.createOscillator();
          const gainOvertone = this.ctx.createGain();
          oscOvertone.type = 'sine';
          oscOvertone.frequency.setValueAtTime(freq * 2, t);

          gainOvertone.gain.setValueAtTime(0.001, t);
          gainOvertone.gain.linearRampToValueAtTime(0.14, t + 0.01);
          gainOvertone.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

          oscOvertone.connect(gainOvertone);
          gainOvertone.connect(this.sfxGainNode ?? this.ctx.destination);

          oscOvertone.start(t);
          oscOvertone.stop(t + 0.4);
        }
      }, delayMs);
    }
  }

  /**
   * A subtle melancholic descending pitch when the unpicked card was a 5.0x Jackpot.
   * Expresses poignant "so close" near-miss disappointment without being abrasive.
   */
  public playNearMissSigh() {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1100);

    const now = this.ctx.currentTime;

    // Dual-oscillator mournful minor glide (F4 -> D4, 360Hz gliding down to 220Hz)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(360, now);
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.7);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(356, now); // Gentle chorus detune
    osc2.frequency.exponentialRampToValueAtTime(218, now + 0.7);

    // Warm lowpass filter to keep it mellow and breathy
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(320, now + 0.75);

    // Soft melancholic sigh envelope: gentle swell then lingering dissolve
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.12);
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
