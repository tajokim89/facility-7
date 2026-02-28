// 시나리오 데이터 스키마 — 나폴리탄 VN 엔진

/** CSS 공포 이펙트 종류 */
export type EffectType = 'shake' | 'glitch' | 'colorShift' | 'fade' | 'distortion';

/** 회차별 오버라이드 */
export interface PlaythroughOverride {
  /** 최소 회차 (2 = 2회차부터 적용) */
  minPlaythrough: number;
  /** 특정 엔딩을 본 후에만 적용 */
  requiredEndings?: string[];
  /** 특정 플래그가 설정된 경우에만 적용 */
  requiredFlags?: string[];
  /** 대체 텍스트 (기본 텍스트를 완전히 교체) */
  text?: string;
  /** 추가 텍스트 (기본 텍스트 뒤에 붙음) */
  appendText?: string;
  /** 대체 화자 */
  speaker?: string;
  /** 추가 CSS 클래스 */
  cssClass?: string;
  /** 이 노드에서 트리거할 이펙트 */
  effect?: EffectType;
}

/** 선택지 표시 조건 */
export interface ChoiceCondition {
  /** 특정 플래그가 설정되어 있어야 표시 */
  flag?: string;
  /** 특정 플래그가 설정되어 있지 않아야 표시 */
  notFlag?: string;
  /** 최소 회차 */
  minPlaythrough?: number;
}

/** 선택지 */
export interface Choice {
  /** 선택지 텍스트 */
  text: string;
  /** 이동할 노드 ID */
  next: string;
  /** 표시 조건 (없으면 항상 표시) */
  condition?: ChoiceCondition;
  /** 이 선택 시 설정할 플래그 */
  setFlags?: Record<string, boolean>;
  /** 잔여감정 변화량 (음수 = 감소) */
  emotionDelta?: number;
}

/** 대사/장면 노드 */
export interface SceneNode {
  /** 고유 ID */
  id: string;
  /** 화자 이름 (없으면 내레이션) */
  speaker?: string;
  /** 기본 텍스트 (1회차) */
  text: string;
  /** 회차별 오버라이드 */
  overrides?: PlaythroughOverride[];
  /** 선택지 (없으면 다음 노드로 자동 진행) */
  choices?: Choice[];
  /** 다음 노드 ID (선택지가 없을 때) */
  next?: string | null;
  /** 이 노드의 이펙트 */
  effect?: EffectType;
  /** 이 노드에서 설정할 플래그 */
  setFlags?: Record<string, boolean>;
  /** 잔여감정 변화량 */
  emotionDelta?: number;
  /** 이 노드가 엔딩인 경우 엔딩 ID */
  endingId?: string;
  /** 배경 CSS 클래스 */
  bgClass?: string;
}

/** 챕터 데이터 */
export interface ChapterData {
  /** 챕터 ID */
  id: string;
  /** 챕터 제목 */
  title: string;
  /** 시작 노드 ID */
  startNode: string;
  /** 모든 노드 */
  nodes: SceneNode[];
}

/** 글로벌 상태 (회차 간 유지) */
export interface GlobalState {
  /** 스키마 버전 */
  version: number;
  /** 클리어 횟수 */
  playthroughCount: number;
  /** 도달한 엔딩 ID 목록 */
  endingsReached: string[];
}

/** 세이브 상태 (현재 진행) */
export interface SaveState {
  /** 스키마 버전 */
  version: number;
  /** 현재 노드 ID */
  currentNodeId: string;
  /** 현재 챕터 ID */
  chapterId: string;
  /** 설정된 플래그 */
  flags: Record<string, boolean>;
  /** 잔여감정 수치 (0~100) */
  remainingEmotion: number;
  /** 현재 회차 */
  currentPlaythrough: number;
  /** 백로그 (지나간 대사) */
  backlog: BacklogEntry[];
  /** 저장 시각 */
  savedAt: string;
}

/** 백로그 항목 */
export interface BacklogEntry {
  /** 노드 ID */
  nodeId: string;
  /** 화자 */
  speaker?: string;
  /** 표시된 텍스트 (오버라이드 적용 후) */
  text: string;
}
