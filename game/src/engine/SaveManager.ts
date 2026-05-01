import type { GlobalState, SaveState, SettingsState, SaveSlotId, SaveSlot } from '../data/schema';
import { SAVE_SLOT_IDS } from '../data/schema';

const GLOBAL_KEY = 'napolitan_global';
const SAVE_KEY_LEGACY = 'napolitan_save'; // 단일 세이브 (하위 호환 — auto 슬롯으로 마이그레이션)
const SETTINGS_KEY = 'napolitan_settings';
const CURRENT_VERSION = 1;

/** 슬롯 ID → localStorage 키 */
function slotKey(id: SaveSlotId): string {
  return `napolitan_save_${id}`;
}

const DEFAULT_SETTINGS: SettingsState = {
  version: CURRENT_VERSION,
  textSpeedMs: 40,
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  autoSpeedMs: 1500,
};

export class SaveManager {
  constructor() {
    this.migrateLegacySave();
  }

  /** 글로벌 상태 로드 (회차, 엔딩 해금, 읽은 노드) */
  loadGlobal(): GlobalState {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (!raw) return this.defaultGlobal();
      const data = JSON.parse(raw) as GlobalState;
      if (data.version !== CURRENT_VERSION) return this.defaultGlobal();
      // 마이그레이션: readNodes 누락 시 빈 객체 부여
      if (!data.readNodes) data.readNodes = {};
      return data;
    } catch {
      return this.defaultGlobal();
    }
  }

  /** 글로벌 상태 저장 */
  saveGlobal(state: GlobalState): void {
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(state));
  }

  /** 특정 슬롯에서 세이브 로드 */
  loadSlot(id: SaveSlotId): SaveState | null {
    try {
      const raw = localStorage.getItem(slotKey(id));
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveState;
      if (data.version !== CURRENT_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  /** 특정 슬롯에 세이브 저장 */
  saveSlot(id: SaveSlotId, state: SaveState): void {
    localStorage.setItem(slotKey(id), JSON.stringify(state));
  }

  /** 특정 슬롯 삭제 */
  deleteSlot(id: SaveSlotId): void {
    localStorage.removeItem(slotKey(id));
  }

  /** 모든 슬롯 메타 (UI 표시용) */
  listSlots(): SaveSlot[] {
    return SAVE_SLOT_IDS.map(id => ({
      id,
      state: this.loadSlot(id),
    }));
  }

  /** 자동저장 슬롯 로드 (auto-resume 등) */
  loadCurrent(): SaveState | null {
    return this.loadSlot('auto');
  }

  /** 자동저장 슬롯에 저장 (게임 진행 중 매 노드 자동) */
  saveCurrent(state: SaveState): void {
    this.saveSlot('auto', state);
  }

  /** 자동저장 슬롯 삭제 (엔딩 도달 시) */
  deleteCurrent(): void {
    this.deleteSlot('auto');
  }

  /** 단일 SAVE_KEY 구버전 → 'auto' 슬롯 마이그레이션 (한 번만 실행) */
  private migrateLegacySave(): void {
    const legacy = localStorage.getItem(SAVE_KEY_LEGACY);
    if (!legacy) return;
    // 이미 auto 슬롯에 데이터가 있으면 덮어쓰지 않음
    if (!localStorage.getItem(slotKey('auto'))) {
      localStorage.setItem(slotKey('auto'), legacy);
    }
    localStorage.removeItem(SAVE_KEY_LEGACY);
  }

  /** 사용자 설정 로드 (없거나 손상 시 기본값) */
  loadSettings(): SettingsState {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const data = JSON.parse(raw) as Partial<SettingsState>;
      // 새 필드가 추가된 경우 기본값으로 채워서 반환
      return { ...DEFAULT_SETTINGS, ...data, version: CURRENT_VERSION };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /** 사용자 설정 저장 */
  saveSettings(state: SettingsState): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
  }

  /** 전체 초기화 (디버그용) — 모든 슬롯 + 글로벌 + 설정 + 구버전 키 */
  resetAll(): void {
    localStorage.removeItem(GLOBAL_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(SAVE_KEY_LEGACY);
    SAVE_SLOT_IDS.forEach(id => localStorage.removeItem(slotKey(id)));
  }

  private defaultGlobal(): GlobalState {
    return {
      version: CURRENT_VERSION,
      playthroughCount: 0,
      endingsReached: [],
      readNodes: {},
    };
  }
}
