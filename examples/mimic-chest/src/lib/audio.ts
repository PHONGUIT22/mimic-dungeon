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
  private droneOscs: OscillatorNode[] = [];
  private droneGains: GainNode[] = [];
  private filterLfo: OscillatorNode | null = null;
  private ambientTimer: number | null = null;
  private readonly nominalBgmGain: number = 0.03; // Gentle, mystic ambient level (never piercing)

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

        // Master BGM Bus with dedicated gentle ambient gain
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.value = this.nominalBgmGain;
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
  // DUNGEON AMBIENT SYNTH LOOP (Low Frequency, Mystic, Gentle 0.03 Gain)
  // ============================================================================

  /**
   * Starts a dark fantasy dungeon ambient synth loop.
   * Utilizes low-frequency tuned drone oscillators (D2, A2, D3), a slow breathing
   * lowpass filter LFO (subtle cave breeze), and periodic haunting resonant bell drops.
   */
  public startBgm() {
    this.initContext();
    if (!this.ctx || !this.bgmGainNode) return;

    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Fade in master BGM bus smoothly
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(0.0001, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(this.nominalBgmGain, now + 0.5);

    // 1. Resonant Master Dungeon Lowpass Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);
    filter.Q.setValueAtTime(2.5, now);
    filter.connect(this.bgmGainNode);

    // 2. Slow breathing LFO modulating the filter cutoff (14s cycle)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07, now); // ~14s period
    lfoGain.gain.setValueAtTime(90, now); // Modulates filter between 150Hz and 330Hz
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    this.filterLfo = lfo;

    // 3. Multi-voice Low Drone Oscillators (D2 = 73.42Hz, A2 = 110.0Hz, D3 = 146.83Hz)
    const droneFreqs = [
      { f: 73.42, type: 'sine' as OscillatorType, vol: 0.75, detune: 0 },
      { f: 73.42, type: 'triangle' as OscillatorType, vol: 0.35, detune: 1.8 },
      { f: 110.0, type: 'sine' as OscillatorType, vol: 0.50, detune: -1.2 },
      { f: 146.83, type: 'sine' as OscillatorType, vol: 0.30, detune: 0.8 },
    ];

    this.droneOscs = [];
    this.droneGains = [];

    droneFreqs.forEach(({ f, type, vol, detune }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(f, now);
      osc.detune.setValueAtTime(detune, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 1.2);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);

      this.droneOscs.push(osc);
      this.droneGains.push(gain);
    });

    // 4. Periodic haunting cavern bell chime (D minor pentatonic: D4, F4, G4, A4, C5)
    const bellNotes = [293.66, 349.23, 392.0, 440.0, 523.25];
    let noteIndex = 0;

    const playCavernBell = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const t = this.ctx.currentTime;
      const freq = bellNotes[noteIndex % bellNotes.length];
      noteIndex = (noteIndex + 1 + Math.floor(Math.random() * 2)) % bellNotes.length;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const bellFilter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      bellFilter.type = 'bandpass';
      bellFilter.frequency.setValueAtTime(freq * 1.5, t);
      bellFilter.Q.setValueAtTime(3.0, t);

      // Soft mystical envelope: gentle 120ms attack, 2.2s dreamy decay
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

      osc.connect(bellFilter);
      bellFilter.connect(gain);
      gain.connect(this.bgmGainNode);

      osc.start(t);
      osc.stop(t + 2.5);
    };

    // Play initial bell shortly after start, then loop every ~3.6s
    setTimeout(playCavernBell, 800);
    this.ambientTimer = window.setInterval(playCavernBell, 3600);
  }

  /**
   * Stops the ambient BGM loop and cleans up all active audio nodes.
   */
  public stopBgm() {
    if (!this.isBgmPlaying) return;
    this.isBgmPlaying = false;

    if (this.ambientTimer) {
      clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }

    if (this.ctx && this.bgmGainNode) {
      const now = this.ctx.currentTime;
      try {
        this.bgmGainNode.gain.cancelScheduledValues(now);
        this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
        this.bgmGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      } catch {
        // safety
      }
    }

    setTimeout(() => {
      this.droneOscs.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore already stopped
        }
      });
      this.droneOscs = [];
      this.droneGains = [];

      if (this.filterLfo) {
        try {
          this.filterLfo.stop();
          this.filterLfo.disconnect();
        } catch {
          // ignore
        }
        this.filterLfo = null;
      }
    }, 350);
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
   * Rapid sequence of 5-8 ascending sine/triangle blips whose pitch rises
   * exponentially based on payout multiplier (like the Balatro chip scoring tally).
   */
  public playPitchShiftTally(multiplier: number) {
    if (!this.sfxEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.duckBgm(1600);

    // Number of tally steps: 5 for low wins, up to 8 for max multiplier
    const safeMult = Math.max(1, multiplier);
    const steps = safeMult >= 5 ? 8 : safeMult >= 2.5 ? 7 : safeMult >= 1.2 ? 6 : 5;

    // Base pitch scales with multiplier: higher tier = higher starting & ceiling frequency
    const baseFreq = 340 + Math.min(200, safeMult * 35);
    // Exponential pitch growth factor
    const pitchFactor = 1.08 + Math.min(0.08, safeMult * 0.015);
    const stepIntervalMs = safeMult >= 5 ? 45 : 55;

    for (let i = 0; i < steps; i++) {
      const delayMs = i * stepIntervalMs;
      const isFinal = i === steps - 1;

      setTimeout(() => {
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
        if (isFinal && safeMult >= 2.5) {
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
