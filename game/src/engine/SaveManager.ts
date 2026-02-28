import type { GlobalState, SaveState } from '../data/schema';

const GLOBAL_KEY = 'napolitan_global';
const SAVE_KEY = 'napolitan_save';
const CURRENT_VERSION = 1;

export class SaveManager {
  /** 글로벌 상태 로드 (회차, 엔딩 해금) */
  loadGlobal(): GlobalState {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (!raw) return this.defaultGlobal();
      const data = JSON.parse(raw) as GlobalState;
      if (data.version !== CURRENT_VERSION) return this.defaultGlobal();
      return data;
    } catch {
      return this.defaultGlobal();
    }
  }

  /** 글로벌 상태 저장 */
  saveGlobal(state: GlobalState): void {
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(state));
  }

  /** 현재 진행 세이브 로드 */
  loadCurrent(): SaveState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveState;
      if (data.version !== CURRENT_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  /** 현재 진행 세이브 */
  saveCurrent(state: SaveState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  /** 세이브 삭제 */
  deleteCurrent(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** 전체 초기화 (디버그용) */
  resetAll(): void {
    localStorage.removeItem(GLOBAL_KEY);
    localStorage.removeItem(SAVE_KEY);
  }

  private defaultGlobal(): GlobalState {
    return {
      version: CURRENT_VERSION,
      playthroughCount: 0,
      endingsReached: [],
    };
  }
}
