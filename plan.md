# Facility 7 - 엔진 확장성 리팩토링 + 세계관 시스템 반영 계획

## Context

현재 엔진은 단일 챕터 프로토타입으로 설계되어 세계관 문서(`scenario/`)의 풍부한 시스템을 코드에 반영할 수 없다. 문제는 두 층위로 나뉜다:

1. **엔진 기반 문제** (Phase 1~5): 닫힌 타입 유니온, boolean 전용 플래그, 하드코딩된 상수, 단일 챕터 구조
2. **세계관 시스템 부재** (Phase 6~8): 7개 세계관 문서에 기술된 시스템(분(m) 화폐, 오염도, SED 언어, 태블릿 UI, 감정 등급, 드림 모니터링, 나폴리탄 프로토콜 등)이 코드에 전혀 없음

### 세계관 vs 현재 코드 갭 분석

| 세계관 시스템 | 출처 | 현재 코드 상태 | 필요한 코드 작업 |
|-------------|------|-------------|---------------|
| 분(m) 화폐 | 감정_자원_체계.md | `remainingEmotion` 0~100 숫자만 | EmotionGauge 리네이밍 + 분 환산 표시 |
| 감정 등급 SSS/S/A/B/F | 감정_자원_체계.md | "감정 유형: 권태" 텍스트뿐 | 스키마에 등급 필드 + 태블릿 UI 표시 |
| 공허자 (0m) | 감정_자원_체계.md | ending_d에 암시만 | 0m 도달 시 UI 연출 강화 |
| SED 표준 효율 언어 | 생활_양식_및_일상.md | 없음 | 텍스트 스타일 시스템 (SED/PA/태블릿 구분) |
| 뉴트리-피드 | 생활_양식_및_일상.md | "미지근한 액체" | 시나리오 텍스트 변경 (코드 불필요) |
| 드림 모니터링 | 생활_양식_및_일상.md | 없음 | 숫자 변수로 추적 가능 (Phase 2 선행) |
| 오염 징후 (미소/눈물/공감) | 7구역_운영지침.md | 없음 | 오염도 게이지 시스템 |
| 붉은 그림자/벽 소리/박동 | 7구역_운영지침.md, 세계관_종합.md | 없음 | 조건부 이펙트/오디오 |
| 나폴리탄 프로토콜 5수칙 | 세계관_종합_가이드.md | 3규칙만 | 시나리오 확장 (코드: 조건부 표시) |
| 태블릿 정보 표시 | 세계관_게임반영_계획.md | 본문 텍스트에 섞여있음 | 전용 태블릿 UI 컴포넌트 |
| F/G/H 구역 역할 | 세계관.md | 이름만 등장 | 시나리오 확장 + 앰비언트/이펙트 |
| 에덴/세레니티 칩 | 세계관.md | 없음 | 시나리오 텍스트 (코드 불필요) |
| HU-01/엘리아스 | 세계관.md, 연대기.md | 없음 | 후속 챕터 (Phase 3 선행) |
| 회차별 UI 톤 변화 | 나폴리탄 구조 핵심 | TitleScreen만 변경 | 게임 전체 UI 톤 시프트 |

---

## Phase 1: 타입 시스템 개방 (Small, High Impact)

**목적**: 닫힌 string union 개방 → 새 사운드/이펙트/앰비언트를 스키마 수정 없이 추가 가능하게

### 변경 파일

**`game/src/data/schema.ts`**
- `EffectType` → `string` + `KNOWN_EFFECTS` const 배열 (기존 5종 문서화)
- `SceneNode.sound` → `string` + `KNOWN_SOUNDS` const 배열
- `AmbientTrack` → `string` + `KNOWN_AMBIENT_TRACKS` const 배열

**`game/src/engine/AudioManager.ts`**
- `buildTrack()` switch → `Map<string, TrackBuilder>` 레지스트리
- `playDoorOpen()`/`playClick()`/`playChoiceSelect()` → `playSound(id: string)` 통합 + 레지스트리
- `registerTrack(id, builder)` / `registerSound(id, builder)` 메서드 추가

**`game/src/components/EffectLayer.tsx`**
- `EFFECT_DURATION`에 fallback 기본값(1000ms) 추가

**`game/src/components/GameScreen.tsx`**
- `if (node.sound === 'doorOpen')` → `if (node.sound) audioManager.playSound(node.sound)` 범용화

---

## Phase 2: 변수 시스템 및 조건 확장 (Medium, High Impact)

**목적**: 숫자 변수 지원 → 분(m), 오염도, 추출 횟수 등 추적 가능

### 변경 파일

**`game/src/data/schema.ts`**
- `SceneNode`/`Choice`에 `setNumbers?: Record<string, number>` 추가 (델타값)
- `ChoiceCondition` 확장: `minNumber?`, `maxNumber?`, `or?: ChoiceCondition[]`
- `PlaythroughOverride`에 `requiredNumbers?: { key: string; min?: number; max?: number }[]`
- `SaveState`에 `numbers: Record<string, number>`

**`game/src/engine/GameEngine.ts`**
- `private numbers: Record<string, number> = {}`
- 감정 상수 → `EngineConfig` 인터페이스 추출 (initialEmotion, emotionMultiplier, emotionGameOverNode)
- `goToNode()`/`selectChoice()`에서 `setNumbers` 처리
- `findActiveOverride()`에 `requiredNumbers` 체크
- `getAvailableChoices()` 조건에 `minNumber`, `maxNumber`, `or` 지원
- save/resume에 `numbers` 포함

**`game/src/engine/SaveManager.ts`**
- `CURRENT_VERSION` → 2, v1→v2 마이그레이션 (`numbers: {}` 보충)

---

## Phase 3: 멀티 챕터 지원 (Medium, Medium Impact)

**목적**: chapter1 하드코딩 제거, 챕터 분리/추가 가능

### 변경 파일

**`game/src/data/chapterRegistry.ts`** (신규)
- `registerChapter(id, loader)` / `loadChapter(id)` / `getChapterIds()`
- chapter1을 dynamic import로 등록

**`game/src/data/schema.ts`**
- `ChapterData`에 `nextChapter?: string`

**`game/src/engine/GameEngine.ts`**
- `async loadChapterById(id: string)` 추가, 기존 동기 `loadChapter()` 유지

**`game/src/components/GameScreen.tsx`**
- 직접 import 제거 → 레지스트리 사용 + 로딩 상태

---

## Phase 4: 이벤트 시스템 (Medium, Medium Impact)

**목적**: 엔진-UI 결합도 저하, 반응형 시스템(오염 경고, 오디오 연동) 기반

### 변경 파일

**`game/src/engine/GameEngine.ts`**
- `GameEvent` 타입: `nodeEnter`, `emotionChange`, `flagSet`, `numberChange`, `choiceSelected`, `endingReached`, `gameOver`
- `on(listener)` / `off()` / `emit()` 메서드
- 기존 메서드들에서 이벤트 emit

**`game/src/components/GameScreen.tsx`**
- `useEffect`에서 이벤트 구독 → state 갱신 (수동 getter 호출 축소)

---

## Phase 5: 노드 메타데이터 및 검증 (Small, Medium Impact)

**목적**: 스키마 변경 없이 세계관 데이터를 노드에 첨부 + 개발 중 데이터 오류 방지

### 변경 파일

**`game/src/data/schema.ts`**
- `SceneNode`에 `meta?: Record<string, unknown>`

**`game/src/engine/GameEngine.ts`**
- `getNodeMeta<T>(key)` getter + Override 시 meta 병합

**`game/src/engine/validateChapter.ts`** (신규)
- startNode 존재, next 포인터 유효성, 미도달 노드 탐지 (dev 전용)

---

## Phase 6: 세계관 UI 시스템 (Medium, High Impact)

**목적**: 세계관 문서에서 요구하는 게임 내 정보 표시 시스템 구현

### 6-1. 분(m) 화폐 표시 + 감정 등급

세계관 근거: `감정_자원_체계.md` — "1m = 느낄 수 있는 60초", 등급별 환율

**`game/src/data/schema.ts`**
- `EmotionGrade` 타입 추가: `'SSS' | 'S' | 'A' | 'B' | 'F'`
- `SceneNode`에 `extractionGrade?: EmotionGrade` (추출 장면의 감정 등급)

**`game/src/engine/GameEngine.ts`**
- `getMinutesDisplay(): string` getter (remainingEmotion × 14.4 → 분 환산)

**`game/src/components/EmotionGauge.tsx`**
- 1회차: "R.E." 라벨 + 숫자(현행 유지, 직장인에게 자연스럽게 보이도록)
- 2회차: "잔여 분(m)" 라벨 + 분 환산값 표시 (공포 재해석)
- props에 `playthrough: number` 추가하여 조건부 렌더링

### 6-2. 태블릿 오버레이 컴포넌트

세계관 근거: `세계관_게임반영_계획.md` — 태블릿이 대상자 정보, 자가진단, 경고를 표시

**`game/src/components/TabletOverlay.tsx`** (신규)
- 추출 장면에서 태블릿 스타일 정보 패널 표시
- props: `{ grade?: EmotionGrade; subjectId?: string; minutesValue?: number; alert?: string }`
- 모노스페이스 터미널 스타일 UI (세계관의 EHI 문서 톤)
- `SceneNode.meta`에서 태블릿 데이터를 읽어 표시 (Phase 5 연동)
- 예시: `meta: { tablet: { subject: '#117', grade: 'A', minutes: 12, type: '권태' } }`

### 6-3. 텍스트 스타일 시스템

세계관 근거: `생활_양식_및_일상.md` — SED 표준 효율 언어, `7구역_운영지침.md` — 기관 문서체

**`game/src/data/schema.ts`**
- `SceneNode`에 `textStyle?: 'normal' | 'sed' | 'tablet' | 'pa' | 'whisper'` 추가

**`game/src/components/DialogueBox.tsx`**
- `textStyle` prop 추가
- 스타일별 렌더링:
  - `sed`: 모노스페이스, 차갑고 기계적인 색상 (#88aa99), 감정 단어 치환 표시
  - `tablet`: 터미널 스타일, 테두리 + 스캔라인 효과
  - `pa`: 대괄호 감싸기 「」, 약간 에코 느낌의 opacity 애니메이션
  - `whisper`: 낮은 opacity, 작은 폰트, italics

**`game/src/styles/text-styles.css`** (신규)
- `.text-sed`, `.text-tablet`, `.text-pa`, `.text-whisper` 클래스

### 6-4. 회차별 UI 톤 시프트

세계관 근거: 나폴리탄 구조 핵심 — "1회차 평범, 2회차 공포 재해석"

**`game/src/styles/theme.css`**
- 2회차용 CSS 변수 셋 추가 (`[data-playthrough="2"]`)
  - 배경 약간 적색 틴트 (`--bg-color: #0c0808`)
  - 텍스트 색상 미세 변화
  - 게이지 색상 시프트 (금→적)
  - 선택지 hover 색상 변화

**`game/src/components/GameScreen.tsx`**
- 루트 div에 `data-playthrough` 속성 추가

---

## Phase 7: 오염도 시스템 (Medium, High Impact)

**목적**: 세계관의 "오염 징후" 개념을 게임 메카닉으로 구현

세계관 근거:
- `7구역_운영지침.md` — "공감 수치 초과, 눈물, 미소 = 자격 상실 → 재분류"
- `세계관_종합_가이드.md` — "미소를 짓거나 눈물이 흐르면 F구역 절단기로 향하십시오"
- `생활_양식_및_일상.md` — "생체 필터 = 정서적 폐기물을 신경계로 흡수"

### 설계

오염도는 **숨겨진 2차 게이지**. 감정적 선택을 할수록 오염도가 올라가고, 임계값에 도달하면 시각/청각 이상 현상 발생.

**`game/src/data/schema.ts`**
- `SceneNode`/`Choice`에 `contaminationDelta?: number` 추가
- `ChoiceCondition`에 `minContamination?`, `maxContamination?` 추가

**`game/src/engine/GameEngine.ts`**
- `private contamination: number = 0` (0~100)
- `goToNode()`/`selectChoice()`에서 `contaminationDelta` 처리
- 오염도 임계값 이벤트 emit (Phase 4 연동):
  - 30+: `contaminationWarning` (미세한 시각 노이즈)
  - 60+: `contaminationDanger` (환청, 붉은 틴트)
  - 90+: `contaminationCritical` (강렬한 글리치, 선택지 왜곡)
- `SaveState`에 `contamination` 추가

**`game/src/components/ContaminationEffect.tsx`** (신규)
- 오염도 레벨에 따른 상시 시각 효과 레이어
  - 낮음: 화면 가장자리 미세한 적색 비네팅
  - 중간: 간헐적 스캔라인 + 텍스트 미세 떨림
  - 높음: 붉은 그림자 출현 + 화면 왜곡
- GameScreen에서 contamination 값 전달받아 렌더링

**`game/src/styles/contamination.css`** (신규)
- `.contamination-low`, `.contamination-mid`, `.contamination-high` 애니메이션

### 오염도와 감정의 상호작용
- 오염도가 높으면 `emotionDelta` 효과 증폭 (감정이 더 빨리 소진)
- 2회차에서는 오염도 초기값이 약간 높게 시작 (이전 회차의 잔류)

---

## Phase 8: 오디오/이펙트 세계관 확장 (Small~Medium, Medium Impact)

**목적**: 세계관 문서에 기술된 음향/시각 현상을 게임에 구현

세계관 근거:
- `7구역_운영지침.md` — 벽 내부 신경망 진동 소리, 붉은 그림자, 엘리베이터 오작동
- `세계관_종합_가이드.md` — 환청(지인 목소리), 박동 동기화
- `생활_양식_및_일상.md` — 백색 진혼곡 (비명의 초고주파 변환)

### 신규 오디오 (Phase 1 레지스트리에 등록)

**`game/src/engine/AudioManager.ts`**
- `heartbeat`: 저주파 펄스, 오염도에 따라 빨라짐
- `wallWhisper`: 벽 내부 흐느낌 (신경망 진동 재현)
- `extraction`: 추출 시 관 진동음 + 액체 흐르는 소리
- `staticBurst`: 태블릿 경고 시 정전기 노이즈
- `h_sector`: H구역 앰비언트 (HU-01 박동 + 깊은 드론)

### 신규 이펙트 (Phase 1 시스템으로 추가 가능)

**`game/src/styles/effects.css`** 확장
- `redShadow`: 화면 가장자리에 붉은 그림자 페이드인/아웃
- `textCorrupt`: 텍스트 일부가 깨지거나 다른 문자로 치환되는 효과
- `mirrorFlash`: 화면 좌우 반전 → 복원 (거울 장면용)
- `pulseVignette`: 심박 리듬에 맞춘 비네팅 펄스
- `scanline`: CRT 스캔라인 오버레이 (태블릿/기관 장면)

### 조건부 오디오 트리거

**`game/src/data/schema.ts`**
- `SceneNode`에 `conditionalAudio?: { track: string; condition: ChoiceCondition }[]` 추가
- 예: 오염도 30 이상일 때만 `wallWhisper` 재생

---

## Phase 의존 관계

```
Phase 1 (타입 개방)
    ↓
Phase 2 (변수 시스템) ──→ Phase 4 (이벤트) ──→ Phase 7 (오염도)
    ↓                          ↓                     ↓
Phase 3 (멀티챕터)       Phase 5 (메타+검증)    Phase 8 (오디오/이펙트 확장)
                               ↓
                         Phase 6 (세계관 UI)
```

- Phase 1→2 순서 필수
- Phase 6은 Phase 5(meta) 이후 권장 (태블릿 데이터를 meta로 저장)
- Phase 7은 Phase 2(숫자 변수) + Phase 4(이벤트) 이후
- Phase 8은 Phase 1(레지스트리) 이후 언제든 가능

---

## 구현 우선순위 추천

| 순위 | Phase | 이유 |
|------|-------|------|
| 1 | Phase 1 (타입 개방) | 모든 확장의 전제 조건 |
| 2 | Phase 2 (변수 시스템) | 분(m), 오염도 등 핵심 메카닉 기반 |
| 3 | Phase 6 (세계관 UI) | 세계관 반영의 가시적 효과가 가장 큼 |
| 4 | Phase 7 (오염도) | 게임플레이 깊이 추가, 공포 연출 핵심 |
| 5 | Phase 4 (이벤트) | 오염도↔오디오↔이펙트 연동에 필요 |
| 6 | Phase 8 (오디오/이펙트) | 몰입감 완성 |
| 7 | Phase 5 (메타+검증) | 품질 보증 |
| 8 | Phase 3 (멀티챕터) | 현재 chapter1 완성 후 필요 |

---

## 검증 방법

1. `npx tsc --noEmit` — 모든 Phase 후 타입 에러 없음
2. `npm run build` — 빌드 성공
3. `npm run dev` — 게임 실행:
   - 1회차: 평범한 직장 톤 유지, R.E. 게이지, 기본 UI
   - 2회차: 분(m) 표시 전환, UI 톤 시프트, 오버라이드 적용
   - 감정적 선택 시 오염도 상승 → 시각 효과 변화 확인
   - 태블릿 오버레이 추출 장면에서 표시 확인
   - SED/PA/whisper 텍스트 스타일 구분 확인
   - 신규 사운드/앰비언트 재생 확인
   - 저장/불러오기 정상 (v1 세이브 마이그레이션 포함)
4. `npm run lint` — 린트 통과
