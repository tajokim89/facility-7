/**
 * AudioManager — Web Audio API 기반
 * 외부 파일 없이 절차적으로 음향 생성
 * Phase 1: 레지스트리 패턴으로 트랙/사운드 런타임 확장 지원
 */

interface AmbientLayer {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
}

type TrackBuilder = (ctx: AudioContext) => AmbientLayer[];
type SoundPlayer = () => void;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private currentLayers: AmbientLayer[] = [];
  private currentMaster: GainNode | null = null;
  private currentTrack: string | null = null;

  // ─── 레지스트리 ──────────────────────────────────────────────
  private trackRegistry = new Map<string, TrackBuilder>();
  private soundRegistry = new Map<string, SoundPlayer>();

  constructor() {
    // 기본 앰비언트 트랙 등록
    this.trackRegistry.set('facility',  (ctx) => this.trackFacility(ctx));
    this.trackRegistry.set('sector_a',  (ctx) => this.trackSectorA(ctx));
    this.trackRegistry.set('sector_b',  (ctx) => this.trackSectorB(ctx));
    this.trackRegistry.set('corridor',  (ctx) => this.trackCorridor(ctx));
    this.trackRegistry.set('g_sector',  (ctx) => this.trackGSector(ctx));

    // 기본 효과음 등록
    this.soundRegistry.set('doorOpen',    () => this.playDoorOpen());
    this.soundRegistry.set('click',       () => this.playClick());
    this.soundRegistry.set('choiceSelect',() => this.playChoiceSelect());
  }

  /** 앰비언트 트랙 런타임 등록 */
  registerTrack(id: string, builder: TrackBuilder): void {
    this.trackRegistry.set(id, builder);
  }

  /** 효과음 런타임 등록 */
  registerSound(id: string, player: SoundPlayer): void {
    this.soundRegistry.set(id, player);
  }

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  resume(): void {
    this.ctx?.resume();
  }

  // ─── 배경 앰비언트 ───────────────────────────────────────────

  /** 앰비언트 트랙 전환 (crossfade) */
  playAmbient(track: string, fadeDuration = 1): void {
    if (this.currentTrack === track) return;
    this.currentTrack = track;

    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // 기존 레이어 fadeout 후 정리
    const oldMaster = this.currentMaster;
    const oldLayers = [...this.currentLayers];
    if (oldMaster) {
      oldMaster.gain.linearRampToValueAtTime(0, now + fadeDuration);
      setTimeout(() => {
        oldLayers.forEach(l => {
          try { l.osc.stop(); } catch { /* already stopped */ }
          try { l.lfo?.stop(); } catch { /* already stopped */ }
        });
        oldMaster.disconnect();
      }, (fadeDuration + 0.1) * 1000);
    }

    // 새 마스터 gain (fadein)
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(1, now + fadeDuration);
    master.connect(ctx.destination);

    const layers = this.buildTrack(track, ctx);
    layers.forEach(l => {
      l.osc.connect(l.gain);
      l.gain.connect(master);
      l.osc.start();
      l.lfo?.start();
    });

    this.currentMaster = master;
    this.currentLayers = layers;
  }

  /** 앰비언트 정지 */
  stopAmbient(fadeDuration = 1): void {
    if (!this.currentMaster) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    this.currentMaster.gain.linearRampToValueAtTime(0, now + fadeDuration);
    const oldLayers = [...this.currentLayers];
    const oldMaster = this.currentMaster;
    setTimeout(() => {
      oldLayers.forEach(l => {
        try { l.osc.stop(); } catch { /* */ }
        try { l.lfo?.stop(); } catch { /* */ }
      });
      oldMaster.disconnect();
    }, (fadeDuration + 0.1) * 1000);
    this.currentMaster = null;
    this.currentLayers = [];
    this.currentTrack = null;
  }

  private buildTrack(track: string, ctx: AudioContext): AmbientLayer[] {
    const builder = this.trackRegistry.get(track);
    if (!builder) {
      console.warn(`[AudioManager] Unknown ambient track: "${track}", falling back to facility`);
      return this.trackFacility(ctx);
    }
    return builder(ctx);
  }

  // ─── 효과음 ─────────────────────────────────────────────────

  /** 등록된 ID로 효과음 재생 */
  playSound(id: string): void {
    const player = this.soundRegistry.get(id);
    if (player) {
      player();
    } else {
      console.warn(`[AudioManager] Unknown sound: "${id}"`);
    }
  }

  /** 대사 진행 클릭 */
  playClick(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** 선택지 선택 */
  playChoiceSelect(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  /** 문 열리는 소리 */
  playDoorOpen(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(300, now);
    noiseFilter.frequency.linearRampToValueAtTime(80, now + 0.5);
    noiseFilter.Q.value = 1.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(55, now + 0.45);
    thud.frequency.exponentialRampToValueAtTime(28, now + 0.65);
    thudGain.gain.setValueAtTime(0, now + 0.45);
    thudGain.gain.linearRampToValueAtTime(0.22, now + 0.47);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now + 0.45);
    thud.stop(now + 0.72);

    const hissBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const hissData = hissBuffer.getChannelData(0);
    for (let i = 0; i < hissData.length; i++) {
      hissData[i] = (Math.random() * 2 - 1) * (i / hissData.length) * (1 - i / hissData.length) * 4;
    }
    const hiss = ctx.createBufferSource();
    hiss.buffer = hissBuffer;
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 2000;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.12;
    hiss.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(ctx.destination);
    hiss.start(now + 0.05);
  }

  // ─── 트랙 구현 ───────────────────────────────────────────────

  /** 시설 로비/기본 — 묵직한 저음 드론 */
  private trackFacility(ctx: AudioContext): AmbientLayer[] {
    return [
      this.layer(ctx, 'sine',     55,  0.18, 0.10, 0),
      this.layer(ctx, 'sine',     27,  0.12, 0.12, 0),
      this.layer(ctx, 'triangle', 82,  0.06, 0.08, -2),
      this.layer(ctx, 'sine',     110, 0.05, 0.15, 3),
    ];
  }

  /** A구역 — 무균실, 차갑고 날카로운 고음 버즈 */
  private trackSectorA(ctx: AudioContext): AmbientLayer[] {
    return [
      this.layer(ctx, 'sine',     220, 0.07, 0.05, 0),
      this.layer(ctx, 'sine',     440, 0.04, 0.03, 2),
      this.layer(ctx, 'triangle', 55,  0.10, 0.08, 0),
      this.layer(ctx, 'sine',     880, 0.02, 0.02, -1),
    ];
  }

  /** B구역 — 정밀 추출실, 은빛처럼 맑고 미세한 진동 */
  private trackSectorB(ctx: AudioContext): AmbientLayer[] {
    return [
      this.layer(ctx, 'sine',     330, 0.06, 0.04, 0),
      this.layer(ctx, 'sine',     165, 0.08, 0.06, 1),
      this.layer(ctx, 'sine',     660, 0.03, 0.02, 0),
      this.layer(ctx, 'triangle', 82,  0.07, 0.07, -1),
    ];
  }

  /** 복도/이동 — 산업적 저주파 웅웅거림 */
  private trackCorridor(ctx: AudioContext): AmbientLayer[] {
    return [
      this.layer(ctx, 'sawtooth', 40,  0.05, 0.09, 0),
      this.layer(ctx, 'sine',     60,  0.12, 0.11, 0),
      this.layer(ctx, 'sine',     120, 0.06, 0.13, 2),
    ];
  }

  /** G구역 — 거울의 방, 불안하고 이질적인 고음 */
  private trackGSector(ctx: AudioContext): AmbientLayer[] {
    return [
      this.layer(ctx, 'sine',     528, 0.05, 0.03, 0),
      this.layer(ctx, 'sine',     523, 0.04, 0.04, 0), // 5hz 비팅 불협화음
      this.layer(ctx, 'triangle', 44,  0.10, 0.06, -1),
      this.layer(ctx, 'sine',     264, 0.04, 0.05, 1),
    ];
  }

  /** 레이어 헬퍼 */
  private layer(
    ctx: AudioContext,
    type: OscillatorType,
    freq: number,
    gainVal: number,
    lfoFreq: number,
    detune: number,
  ): AmbientLayer {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = gainVal;

    let lfo: OscillatorNode | undefined;
    if (lfoFreq > 0) {
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = lfoFreq;
      lfoGain.gain.value = gainVal * 0.15;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
    }

    return { osc, gain, lfo };
  }
}

export const audioManager = new AudioManager();
