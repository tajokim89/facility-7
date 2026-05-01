// 챕터 레지스트리 — 새 챕터 추가 시 CHAPTERS 배열에만 등록하면 됨.
// 동적 import로 lazy load하여 초기 번들에 모든 챕터를 포함시키지 않음.

import type { ChapterData } from '../schema';

export interface ChapterRegistryEntry {
  /** 챕터 ID (ChapterData.id와 일치해야 함) */
  id: string;
  /** UI 표시용 제목 */
  title: string;
  /** 챕터 데이터 lazy 로더 */
  load: () => Promise<ChapterData>;
  /** 이 챕터 해금에 필요한 엔딩 ID 목록 (any). 비어있거나 없으면 항상 해금. */
  prereqEndings?: string[];
}

export const CHAPTERS: ChapterRegistryEntry[] = [
  {
    id: 'chapter1',
    title: '첫 출근',
    load: () => import('./chapter1').then(m => m.default),
  },
  // 신규 챕터 추가 위치 — 직전 챕터의 엔딩 ID 중 하나라도 봤을 때 해금:
  // {
  //   id: 'chapter2',
  //   title: '두 번째 출근',
  //   prereqEndings: ['ending_a', 'ending_b', 'ending_c', 'ending_d'],
  //   load: () => import('./chapter2').then(m => m.default),
  // },
];

/** 해금 여부 체크 — endingsReached(글로벌)에 prereq 중 하나라도 있으면 true */
export function isChapterUnlocked(entry: ChapterRegistryEntry, endingsReached: string[]): boolean {
  if (!entry.prereqEndings || entry.prereqEndings.length === 0) return true;
  return entry.prereqEndings.some(e => endingsReached.includes(e));
}

/** 챕터 ID로 레지스트리 항목 조회 */
export function getChapterRegistry(id: string): ChapterRegistryEntry | undefined {
  return CHAPTERS.find(c => c.id === id);
}

/** 첫 챕터 (새 게임 시작용) */
export function getFirstChapter(): ChapterRegistryEntry {
  return CHAPTERS[0];
}

/** 다음 챕터 (현재 챕터 클리어 후 진행용). 마지막 챕터면 undefined. */
export function getNextChapter(currentId: string): ChapterRegistryEntry | undefined {
  const idx = CHAPTERS.findIndex(c => c.id === currentId);
  if (idx < 0 || idx >= CHAPTERS.length - 1) return undefined;
  return CHAPTERS[idx + 1];
}
