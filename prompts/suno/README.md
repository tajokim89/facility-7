# Suno.ai 배경음 프롬프트 (Sector 7 / 감정 처리 시설 7구역)

Suno.ai로 게임 앰비언트 트랙을 생성하기 위한 프롬프트 모음.
이 프롬프트로 만든 mp3 파일을 `game/public/audio/` 에 넣고 `AudioManager`에서 재생한다.

## Suno UI 제약 (반드시 지킬 것)

| 항목 | 위치 | 한도/규칙 |
|:---|:---|:---|
| **Style of Sound** | 메인 입력 칸 | **500자 이내**. 분위기·악기·음향 묘사만 적는다. |
| **Loop** | Advanced Options | **ON 토글** — 프롬프트에 "seamless loop" 같은 말 넣지 말 것 |
| **BPM** | Advanced Options | 트랙별 권장값 표 참고 |
| **Key** | Advanced Options | 트랙별 권장값 표 참고 |
| **Instrumental** | 토글 | **ON** (보컬 차단) |
| **Negative Tags** | 별도 칸 | 공통 negative는 `00_style.md` 참고 |

→ 그래서 모든 프롬프트는 **순수 사운드 묘사 500자 이내**로 작성됐다. 루프/속도/조성은 Advanced에서 세팅.

## 파일 구성

| 파일 | 용도 |
|:---|:---|
| `00_style.md` | 공통 톤·공통 negative tags·BPM/Key 가이드 |
| `01_ambient.md` | 5개 기본 트랙 × 회차별 변형 (10개) |
| `02_special.md` | 특수 장면 트랙 (S15 panic, G_sector climax) |
| `03_endings.md` | 엔딩 4종 |

## 트랙 ID와 사용 위치

| 트랙 ID | 게임 내 사용 노드 | 분위기 |
|:---|:---|:---|
| `facility` | S03 한서진 첫 만남 ~ S06 로커룸 | 묵직한 저음 드론, 사무적 평온 |
| `sector_a` | S07~S15 첫 추출, 비명 | 무균실, 차갑고 날카로운 고음 |
| `sector_b` | S22 정밀 추출실 | 은빛, 그리움의 잔향, 우아한 슬픔 |
| `corridor` | S17 휴게실, S23 복도 | 산업적 저주파, 폐쇄감 |
| `g_sector` | S24b 거울의 방 | 5Hz 비팅 불협화음, 자아 붕괴 |
| `sector_a_panic` (선택) | S15 #203 비명 장면 전용 | 적색경보, 끓는 원한 |
| `g_sector_climax` (선택) | S24b 2회차 (관찰자 #042) | 정점, 정체성 해체 |
| `ending_a` ~ `ending_d` | 각 엔딩 노드 | 엔딩별 |

## 회차별 음악을 어떻게 게임에 넣는가

현재 `AudioManager.playAmbient(track)`은 트랙 ID 하나만 받는다. 회차별 다른 음악을 재생하려면 두 가지 통합 옵션 중 하나를 적용한다.

### 옵션 A — 트랙 ID에 자동 `_p2` 접미사 (변경 최소, 권장)

파일을 두 벌 준비하고 `AudioManager`가 회차에 따라 자동 선택.

**1) 파일 배치**
```
game/public/audio/
  facility.mp3       facility_p2.mp3
  sector_a.mp3       sector_a_p2.mp3
  sector_b.mp3       sector_b_p2.mp3
  corridor.mp3       corridor_p2.mp3
  g_sector.mp3       g_sector_p2.mp3
```

**2) `AudioManager.ts` 핵심 변경**
```typescript
private playthrough = 1;
private fileCache = new Map<string, HTMLAudioElement>();
private currentEl: HTMLAudioElement | null = null;

setPlaythrough(n: number) { this.playthrough = n; }

playAmbient(track: string, fadeDuration = 1) {
  const fileId = this.playthrough >= 2 ? `${track}_p2` : track;
  if (this.currentTrack === fileId) return;
  this.currentTrack = fileId;

  if (this.currentEl) this.fadeAudioEl(this.currentEl, 0, fadeDuration, true);

  const el = this.fileCache.get(fileId) ?? new Audio(`/audio/${fileId}.mp3`);
  el.loop = true;          // ← 게임에서도 loop 재생
  el.volume = 0;
  el.play().catch(() => {});
  this.fadeAudioEl(el, 1, fadeDuration);
  this.currentEl = el;
  this.fileCache.set(fileId, el);
}
```

**3) `GameScreen.tsx` 회차 주입**
```typescript
audioManager.setPlaythrough(engine.getPlaythroughCount() + 1);
audioManager.playAmbient('facility');
```

→ `chapter1.ts`는 한 줄도 안 고쳐도 됨. `ambient: 'facility'` 그대로 두면 회차에 따라 자동 분기.

### 옵션 B — 노드 단위 오버라이드 (세밀 제어)

특정 장면에만 다른 트랙 쓰고 싶을 때 (예: S15 비명 장면).

**`schema.ts`에 필드 추가**
```typescript
interface PlaythroughOverride {
  // ... 기존 필드들
  ambient?: AmbientTrack;
  sound?: SoundId;
}
```

**`GameEngine.ts`에 resolver 추가**
```typescript
resolveAmbient(node: SceneNode): AmbientTrack | undefined {
  const ov = this.getActiveOverride(node);
  return ov?.ambient ?? node.ambient;
}
```

**`GameScreen.tsx`에서 호출 변경**
```typescript
const ambient = engine.resolveAmbient(node);
if (ambient) audioManager.playAmbient(ambient);
```

**`chapter1.ts` 사용 예**
```typescript
{
  id: 'S15',
  ambient: 'sector_a',
  overrides: [{
    minPlaythrough: 2,
    ambient: 'sector_a_panic',
    appendText: '...',
  }],
}
```

### 추천 조합

**A를 기본**으로 깔고, **임팩트가 다른 장면(S15, S24b 2회차, 엔딩)만 B**로 별도 트랙 지정.

## 작업 흐름

1. `00_style.md`에서 공통 negative·BPM/Key 가이드 숙지.
2. Suno에서 새 곡 만들 때:
   - **Custom Mode** ON
   - **Instrumental** ON
   - **Loop** ON (Advanced Options)
   - **BPM, Key** 트랙별 권장값 입력
   - **Style of Sound** 칸에 트랙별 프롬프트 (500자 이내) 붙여넣기
   - **Negative Tags** 칸에 공통 negative 붙여넣기
3. 4~6번 generate 해서 가장 정적이고 사건 없는 테이크 채택.
4. mp3 다운로드 → `game/public/audio/{track_id}.mp3`로 저장.
5. `AudioManager.ts` + `GameScreen.tsx`를 옵션 A 방식으로 수정.
6. 필요하면 옵션 B로 노드 오버라이드 추가.
