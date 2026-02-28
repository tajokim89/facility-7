# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cd napolitan-vn

npm run dev      # 개발 서버 (localhost:5173~)
npm run build    # 프로덕션 빌드 (tsc + vite)
npm run lint     # ESLint
npx tsc --noEmit # 타입 체크만
```

## 프로젝트 개요

나폴리탄 괴담 구조의 웹 비주얼 노벨 공포게임.
**핵심**: 1회차는 평범한 직장 이야기, 2회차에서 동일 장면이 공포로 재해석됨.

무대: 감정 처리 시설 7구역. 플레이어는 "관찰자" 신입 직원으로, 실은 본인의 감정이 추출당하는 대상임.

## 아키텍처

```
napolitan-vn/src/
├── engine/
│   ├── GameEngine.ts     # 게임 상태 머신 (핵심)
│   ├── SaveManager.ts    # localStorage (글로벌/세이브 분리)
│   └── AudioManager.ts   # Web Audio API 절차적 음향 생성
├── data/
│   ├── schema.ts         # 모든 타입 정의
│   └── chapter1.ts       # 전체 시나리오 데이터 (35노드)
├── components/
│   ├── GameScreen.tsx    # 최상위 게임 컨트롤러 (상태 관리)
│   └── ...               # DialogueBox, ChoicePanel, EffectLayer 등
└── styles/
    ├── theme.css         # CSS 변수 (다크 테마)
    └── effects.css       # 공포 이펙트 5종 애니메이션
```

### 핵심 데이터 흐름

`chapter1.ts` → `GameEngine.loadChapter()` → `GameScreen` (React state) → 컴포넌트 렌더링

`GameEngine`은 순수 클래스(React 외부). `GameScreen`이 엔진 메서드를 호출하고 결과를 React state로 변환.

### 시나리오 데이터 구조 (`SceneNode`)

```typescript
{
  id: string,
  text: string,           // 1회차 기본 텍스트
  overrides?: [{          // 회차별/조건별 오버라이드
    minPlaythrough: number,
    text?: string,        // 완전 교체
    appendText?: string,  // 뒤에 추가
    effect?: EffectType,
  }],
  choices?: Choice[],     // 없으면 next로 자동 진행
  next?: string | null,
  effect?: EffectType,    // shake|glitch|colorShift|fade|distortion
  sound?: 'doorOpen',     // 진입 시 효과음
  ambient?: AmbientTrack, // 진입 시 배경음 전환
  endingId?: string,      // 엔딩 노드 표시
  emotionDelta?: number,  // 잔여감정 변화 (음수=감소)
  setFlags?: Record<string, boolean>,
}
```

### 회차 시스템

- `GlobalState.playthroughCount` (localStorage): 완료 회차 수
- `currentPlaythrough = playthroughCount + 1` (진행 중)
- 2회차부터 `overrides[].minPlaythrough: 2` 노드가 활성화됨
- 2회차는 `emotionDelta`가 1.5배

### 빈 텍스트 노드 (자동 분기)

`text: ''`인 노드는 `GameScreen.updateState()`에서 자동 처리:
- available 선택지가 있으면 → 첫 번째로 자동 이동
- 없고 `next` 있으면 → `advance()`로 자동 진행
- `ending_check` 노드가 이 패턴으로 엔딩 분기를 처리함

### 오디오

`audioManager` 싱글톤. 외부 파일 없이 Web Audio API로 절차 생성.
- `playAmbient(track)`: 1초 크로스페이드로 트랙 전환 (facility/sector_a/sector_b/corridor/g_sector)
- 브라우저 autoplay 정책 → 첫 유저 인터랙션(New Game/Continue) 시 `audioManager.resume()` 호출 필수

### localStorage 키

- `napolitan_global`: `GlobalState` (회차, 해금 엔딩)
- `napolitan_save`: `SaveState` (현재 진행 위치, 플래그, 감정 수치)
