# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cd game

npm run dev      # 개발 서버 (localhost:5173~)
npm run build    # 프로덕션 빌드 (tsc -b && vite build)
npm run lint     # ESLint
npm run preview  # 빌드 결과 프리뷰
npx tsc --noEmit # 타입 체크만
```

테스트 러너는 없음. 스택은 React 19 + Vite 7 + TypeScript ~5.9, 외부 런타임 의존성은 react/react-dom뿐.

## 리포 레이아웃

```
facility-7/
├── game/              # 실행되는 웹 VN (React + Vite)
├── scenario/          # 세계관/설정 마크다운 (시나리오 작성용 원전)
├── prompts/
│   ├── chatgpt/       # 이미지 프롬프트 (DALL·E / GPT Image)
│   └── suno/          # 앰비언트 BGM 프롬프트 (Suno)
└── comfyui/           # ComfyUI 기반 자동 이미지 생성 파이프라인 (generate.py)
```

`scenario/`, `prompts/`, `comfyui/`는 **게임 런타임이 직접 의존하지 않는** 콘텐츠 제작 자료다. 시나리오 텍스트나 분위기를 정할 때 참고하고, 생성된 산출물은 `game/public/`(이미지·오디오)이나 `game/src/data/chapters/*.ts`(시나리오 코드)로 들어간다.

## 프로젝트 컨셉

나폴리탄 괴담 구조의 웹 비주얼 노벨 공포게임. **1회차는 평범한 직장 이야기, 2회차에서 같은 장면이 공포로 재해석됨.** 무대는 감정 처리 시설 7구역. 플레이어는 신입 "관찰자"이자 실제 감정 추출 대상.

회차 갈수록 텍스트/이펙트/오디오/배경이 누적적으로 변형되는 게 핵심 메카닉이므로, 노드를 수정할 때 1회차 의미와 2회차 오버라이드가 양쪽 다 성립하는지 항상 확인할 것.

## 아키텍처

```
game/src/
├── engine/
│   ├── GameEngine.ts     # 게임 상태 머신 (순수 클래스, React 비의존)
│   ├── SaveManager.ts    # localStorage I/O + 버전 마이그레이션
│   └── AudioManager.ts   # mp3 우선 / 절차생성 fallback 오디오
├── data/
│   ├── schema.ts         # 모든 타입 정의 (SceneNode, ChapterData, SaveState, ...)
│   └── chapters/
│       ├── index.ts      # 챕터 레지스트리 (lazy import)
│       └── chapter1.ts   # 챕터별 ChapterData (default export)
├── components/
│   ├── GameScreen.tsx    # 최상위 컨트롤러 — 엔진 호출 + React state 변환
│   └── ...               # DialogueBox / ChoicePanel / EffectLayer / Title / SaveSlotPanel 등
└── styles/
    ├── theme.css         # CSS 변수 (다크 테마)
    └── effects.css       # 공포 이펙트 5종 애니메이션
```

### 데이터 흐름

`chapters/index.ts` 동적 import → `GameEngine.loadChapter()` → `GameScreen` (React state) → 컴포넌트.

`GameEngine`은 순수 클래스이며 React를 모른다. `GameScreen`이 엔진 메서드를 호출하고 결과를 `setState`로 반영한다. 신규 컴포넌트에서 엔진을 직접 import하지 말고, `GameScreen`에서 props/콜백으로 내려보낼 것.

### 시나리오 데이터 구조 (`SceneNode`)

```typescript
{
  id: string,
  speaker?: string,       // 없으면 내레이션
  text: string,           // 1회차 기본 텍스트
  overrides?: [{          // 회차/엔딩/플래그 조건별 오버라이드
    minPlaythrough: number,        // 2 = 2회차부터
    requiredEndings?: string[],    // 특정 엔딩 도달 후만
    requiredFlags?: string[],
    text?: string,                 // 완전 교체
    appendText?: string,           // 뒤에 추가
    speaker?: string, cssClass?: string,
    effect?: EffectType, bgImage?: string,
    ambient?: AmbientTrack, sound?: SoundId,
  }],
  choices?: Choice[],     // 비면 next로 자동 진행
  next?: string | null,
  effect?: EffectType,    // shake | glitch | colorShift | fade | distortion (string 확장 가능)
  sound?: SoundId,        // doorOpen 등 — 진입 시 1회 재생
  ambient?: AmbientTrack, // facility | sector_a | sector_b | corridor | g_sector — 진입 시 전환
  bgImage?: string,       // public/ 기준 경로
  endingId?: string,      // 엔딩 노드 마커
  emotionDelta?: number,  // 잔여감정 변화 (음수 = 감소). 2회차는 ×1.5
  setFlags?: Record<string, boolean>,
}
```

오버라이드 해석은 `GameEngine.findActiveOverride()`가 처리하며, 여러 개 매칭 시 **`minPlaythrough` 가장 높은 것 1개**만 적용된다 (스태킹 안 됨).

### 회차 시스템

- `GlobalState.playthroughCount` (localStorage `napolitan_global`): 완료 회차 수
- `currentPlaythrough = playthroughCount + 1` (진행 중 회차)
- 2회차부터 `overrides[].minPlaythrough: 2` 노드가 활성화
- 2회차는 `emotionDelta`에 `EMOTION_MULTIPLIER_PER_PLAYTHROUGH(1.5)` 곱
- 엔딩 도달 시 `engine.reachEnding(id)`가 `playthroughCount++` 및 자동저장 슬롯 삭제

### 챕터 레지스트리

`data/chapters/index.ts`의 `CHAPTERS` 배열에 항목 추가만으로 신규 챕터 등록. `load: () => import('./chapterN').then(m => m.default)` 형태의 lazy import 필수 — 초기 번들 비대화 방지. `prereqEndings` 배열로 직전 챕터 엔딩 의존성 표현 (any 매칭).

### 빈 텍스트 노드 (자동 분기)

`text: ''`인 노드는 `GameScreen.updateState()`의 while 루프에서 자동 처리:
- `getAvailableChoices().length > 0` → 첫 번째 선택지 자동 선택
- 없고 `next` 있으면 → `advance()`로 자동 진행
- `ending_check` 같은 라우팅 노드가 이 패턴으로 엔딩 분기 처리

빈 텍스트 노드는 백로그/`readNodes`에 기록되지 않는다 (`GameEngine.goToNode`).

### 게임오버 (잔여감정 0)

`ChapterData.gameOverNode`가 있고 `remainingEmotion <= 0`이면, `advance()`/`selectChoice()`가 강제로 그 노드로 점프. 챕터에 정의 안 했으면 무시됨.

### 세이브 시스템

`SaveManager`가 슬롯 모델로 관리. localStorage 키:
- `napolitan_global` — `GlobalState` (회차, 해금 엔딩, 챕터별 `readNodes`)
- `napolitan_save_auto` — 자동저장 (매 노드 진행/선택 시 갱신, 엔딩 도달 시 삭제)
- `napolitan_save_1` ~ `napolitan_save_9` — 수동 슬롯
- `napolitan_settings` — `SettingsState`
- `napolitan_save` (구버전) — 첫 부팅 시 `auto` 슬롯으로 마이그레이션 후 삭제

스키마에 새 필드 추가 시 `CURRENT_VERSION` 올리고 `SaveManager`의 로드 경로에서 마이그레이션 처리(예시: `loadGlobal`의 `readNodes` 누락 보정).

### 스킵/오토 모드

- **SKIP**: Ctrl 누르는 동안(held) 또는 SKIP 버튼 토글. **이전에 읽은 노드만** 빠르게 진행하고, 미열람 노드 도달 시 자동 정지(`engine.isNodeRead` 가드). 챕터별 `readNodes` 추적이 이 동작의 핵심.
- **AUTO**: A 키 또는 AUTO 버튼 토글. `DialogueBox`가 텍스트 출력 완료 후 `settings.autoSpeedMs` 대기하고 `handleAdvance` 호출. 선택지/엔딩 도달 시 자동 해제.

### 오디오 (AudioManager 싱글톤)

mp3 파일 우선 → 실패 시 절차 생성 fallback의 두 단계 캐스케이드.

- `playAmbient(track)`: `_p2` 접미사 자동 분기 — 2회차 이상이면 `${track}_p2.mp3`(예: `facility_p2.mp3`) 시도. 파일 부재 시 절차 생성 트랙으로 폴백.
- mp3는 `game/public/audio/{trackId}.mp3` 위치 (Suno 등으로 생성한 트랙).
- 절차 트랙은 `trackRegistry`로 런타임 확장 가능 (`registerTrack(id, builder)`).
- 효과음도 동일하게 `soundRegistry` (`playSound('doorOpen')` 등).
- 마스터 게인 노드(BGM/SFX 분리)에 `setBgmVolume`/`setSfxVolume` 적용.
- **브라우저 autoplay 정책**: 첫 유저 인터랙션(New Game/Continue/Load) 시 `audioManager.resume()` 필수 — `GameScreen`의 모든 진입점에서 호출하고 있으므로 새 진입점 추가 시 빠뜨리지 말 것.

### 배경 이미지 크로스페이드 + 프리로드

`GameScreen`이 `bg.prev`/`bg.current` 두 슬롯을 유지하고 CSS 애니메이션으로 크로스페이드. 동시에 `engine.getNextBgImages()`로 다음 가능 노드들의 `bgImage`를 미리 `new Image()` fetch해 브라우저 캐시 적재.

## 콘텐츠 자산 파이프라인

게임에 들어가는 이미지/음원은 다음 도구로 생성한다 (게임 런타임에서는 결과물만 참조).

- **이미지(자동)**: `comfyui/generate.py` — SDXL/SD1.5 워크플로우 + IP-Adapter. 자세한 내용은 `comfyui/comfyui.md`. 산출물은 `comfyui/images/comp/` → 게임의 `bgImage` 경로로 수동 배치.
- **이미지(수동)**: `prompts/chatgpt/*.md` — DALL·E/GPT Image용 프롬프트 (콘텐츠 정책 우회 표현 정리됨).
- **앰비언트 BGM**: `prompts/suno/*.md` — Suno UI 제약(500자, Loop ON, Instrumental ON, BPM/Key) 준수해서 생성 후 `game/public/audio/{trackId}.mp3` 배치. 회차별 변주는 `_p2` 접미사 파일.
- **세계관 원전**: `scenario/*.md` — 시나리오 노드 텍스트 작성 시 어휘/설정 일관성을 위한 참조처.
