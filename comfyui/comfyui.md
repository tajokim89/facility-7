# ComfyUI 이미지 생성 시스템 문서

> 최종 업데이트: 2026-03-08
> 리팩토링 상세: `docs/refactoring.md` 참조

---

## 1. 디렉토리 구조

```
comfyui/
├── generate.py              # 통합 CLI (refs / scenes / batch / review)
│
├── lib/                     # 공통 라이브러리
│   ├── config.py            # 경로 상수, WORKFLOW_MAP, DEFAULT_WEIGHTS
│   ├── schema.py            # 씬 로드, v1→v2 마이그레이션, scene_type 추론
│   ├── comfyui_client.py    # HTTP API + WebSocket 완료 추적
│   ├── ref_manager.py       # 레퍼런스 이미지 복사/수집
│   ├── workflow_loader.py   # 워크플로우 로드 + 파라미터 주입
│   ├── batch_runner.py      # 배치 실행 엔진 (위상 정렬)
│   ├── manifest.py          # 생성 이력 추적 (manifest.json)
│   └── quality.py           # 이미지 품질 자동 검증 (PIL)
│
├── workflow/                # ComfyUI 워크플로우 JSON
│   ├── sd15_reference.json          # SD 1.5 - 캐릭터 레퍼런스 전용
│   ├── sdxl_scene.json              # SDXL - 환경/배경/macro/special
│   ├── sdxl_outpaint.json           # SDXL Outpaint - 캐릭터 씬 (dual-ref)
│   └── sdxl_character_closeup.json  # SDXL - 얼굴 클로즈업 전용 (1024x1024)
│
├── prompt/                  # 프롬프트 데이터 (v2 스키마)
│   ├── chapter_01.json      # Chapter 01 씬 (scene_type 명시)
│   ├── chapter_01_refs.json # Chapter 01 캐릭터 REF
│   └── intro.json           # 타이틀 화면 (TITLE_NORMAL, TITLE_GLITCH)
│
├── images/
│   ├── temp/    # 생성 직후 자동 저장 (검수 전)
│   ├── comp/    # 검수 승인 최종본
│   └── ref/     # 캐릭터 레퍼런스 (고정 파일명: {REF_ID}.png)
│
├── manifest.json            # 생성 이력 추적 DB
├── docs/
│   └── refactoring.md       # 리팩토링 계획 문서
└── achive/                  # 구버전 보관 (참조용)
```

---

## 2. 실행 명령어 (통합 CLI)

> 반드시 프로젝트 루트 `facility-7/`에서 실행

```bash
# -- 레퍼런스 생성 --
python comfyui/generate.py refs                        # 전체 REF 생성
python comfyui/generate.py refs --ids REF_HAN_SE_JIN   # 특정 REF만

# -- 씬 생성 --
python comfyui/generate.py scenes --ids S03 S08        # 특정 씬
python comfyui/generate.py scenes --type character_scene  # scene_type 필터
python comfyui/generate.py scenes --fixed --ids S01    # seed 고정 재현

# -- 배치 생성 (전체 / 챕터별) --
python comfyui/generate.py batch                       # 전체 배치
python comfyui/generate.py batch --chapter 1           # Chapter 01만
python comfyui/generate.py batch --variants 3          # 씬당 3가지 variant

# -- 검수 --
python comfyui/generate.py review --pending                      # 미검수 목록
python comfyui/generate.py review --scene S03                    # S03 상태 조회
python comfyui/generate.py review --scene S03 --accept 0         # variant 0 승인 (comp/로 복사)
python comfyui/generate.py review --scene S03 --reject-all       # 전부 거부
```

---

## 3. scene_type 시스템

### scene_type → 워크플로우 매핑

| scene_type | 워크플로우 | 해상도 | 용도 |
|:---|:---|:---|:---|
| `environment` | `sdxl_scene.json` | 1920×1080 | 배경, 환경, 소품 |
| `macro` | `sdxl_scene.json` | 1920×1080 | 오브젝트 클로즈업 |
| `special` | `sdxl_scene.json` | 1920×1080 | 특수 씬 (타이틀 등) |
| `character_scene` | `sdxl_outpaint.json` | 1920×1080 | 인물 포함 씬, dual-ref |
| `character_closeup` | `sdxl_character_closeup.json` | 1024×1024 | 얼굴 클로즈업 |
| `reference` | `sd15_reference.json` | 768×768 | 캐릭터 REF 생성 |

### scene_type별 기본 IP-Adapter weight

| scene_type | style_weight | composition_weight |
|:---|:---:|:---:|
| `environment` | 0.4 | 0.0 |
| `macro` | 0.3 | 0.0 |
| `special` | 0.3 | 0.0 |
| `character_scene` | 0.3 | 0.8 |
| `character_closeup` | 0.2 | 0.9 |

---

## 4. 프롬프트 스키마 (v2)

### 씬 오브젝트

```json
{
  "id": "S03",
  "scene_type": "character_scene",
  "prompt": "...",
  "negative_prompt": "...",
  "style_ref": "style_reference.png",
  "composition_ref": "images/ref/REF_HAN_SE_JIN.png",
  "style_weight": 0.3,
  "composition_weight": 0.8,
  "weight": 0.8,
  "priority": 3,
  "depends_on": "S14",
  "use_prev_output": false
}
```

| 필드 | 설명 | 기본값 |
|:---|:---|:---|
| `scene_type` | 워크플로우 결정 (필수) | v1 자동 추론 |
| `style_ref` | IP-Adapter 스타일 레퍼런스 | - |
| `composition_ref` | IP-Adapter 구도/인물 레퍼런스 | - |
| `style_weight` | 스타일 ref IP 강도 | scene_type 기본값 |
| `composition_weight` | 인물 ref IP 강도 | scene_type 기본값 |
| `priority` | 배치 실행 우선순위 (낮을수록 먼저) | 99 |
| `depends_on` | 의존 씬 ID (해당 씬 완료 후 실행) | - |
| `use_prev_output` | 부모 씬 출력을 ref로 체이닝 | false |

### 레퍼런스 오브젝트

```json
{
  "id": "REF_HAN_SE_JIN",
  "prompt": "...",
  "negative_prompt": "...",
  "is_reference": true
}
```

### v1 하위호환

`scene_type` 없는 v1 JSON은 자동 추론:
- `composition_ref` 있거나 `use_outpaint: true` → `character_scene`
- `is_reference: true` 또는 ID가 `REF_` 시작 → `reference`
- 나머지 → `environment`

---

## 5. 워크플로우 노드 매핑

### SDXL 계열 공통 (sdxl_scene / sdxl_outpaint / sdxl_character_closeup)

| 노드 | 역할 | 주입 값 |
|:---|:---|:---|
| `"9"` | CLIP Negative | scene_type별 기본 neg + scene.negative_prompt |
| `"10"` | CLIP Positive | scene.prompt |
| `"14"` | LoadImage (style ref) | style_ref 파일명 |
| `"15"` | IPAdapter | composition_weight (character) / style_weight (기타) |
| `"16"` | LoadImage (comp ref, outpaint만) | composition_ref 파일명 |
| `"17"` | ImageBatch (outpaint만) | 14 + 16 결합 → 15에 전달 |
| `"18"` | ImagePadForOutpaint | feathering=160 |
| `"6"` | KSampler | seed |
| `"20"` | KSampler (outpaint 2단계) | seed + 1 |
| `"12"` | SaveImage | filename_prefix |

### sd15_reference 노드

| 노드 | 역할 |
|:---|:---|
| `"1"` | Seed |
| `"3"` | filename_prefix |
| `"5"` | Positive 프롬프트 |
| `"6"` | Negative 프롬프트 |

---

## 6. Chapter 01 씬 목록

### 레퍼런스 캐릭터

| ID | 설명 |
|:---|:---|
| `REF_HAN_SE_JIN` | 한세진 (선임 관찰자, 20대 후반 여성) |
| `REF_LEE_JUN_HYEOK` | 이준혁 (남성 관찰자, 냉소적) |
| `REF_SUB_117` | 대상자 #117 (중년 남성, 공허한 눈) |
| `REF_SUB_203` | 대상자 #203 (20대 여성, 공포) |
| `REF_SUB_089` | 대상자 #089 (60대 남성, 평온한 공허) |

### 씬 목록

| 씬 ID | scene_type | 레퍼런스 | priority | 의존성 |
|:---|:---|:---|:---:|:---|
| S01 | environment | style_ref (w=0.0) | 5 | - |
| S02 | environment | style_ref | 5 | - |
| S03 | character_scene | REF_HAN_SE_JIN (cw=0.8) | 3 | - |
| S06 | environment | style_ref | 5 | - |
| S07 | environment | style_ref | 5 | - |
| S08 | character_scene | REF_HAN_SE_JIN (cw=0.8) | 3 | - |
| S09 | character_scene | REF_SUB_117 (cw=0.4) | 3 | - |
| S10 | macro | style_ref | 5 | - |
| S14 | character_scene | REF_SUB_203 (cw=0.5) | 2 | - |
| S15 | environment | style_ref | 4 | S14 |
| S15a | environment | style_ref | 4 | S15 |
| S15b | character_closeup | REF_SUB_203 (cw=0.9) | 3 | S15 |
| S17 | character_scene | style_ref (outpaint) | 4 | - |
| S18 | character_scene | REF_LEE_JUN_HYEOK (cw=0.8) | 3 | - |
| S19 | macro | style_ref (outpaint) | 5 | - |
| S20~S24b | environment | style_ref | 5 | - |
| S25 | character_scene | REF_SUB_089 (cw=0.4) | 3 | - |
| S26a | environment | style_ref | 5 | - |
| ENDING_A~D | environment | style_ref | 6 | - |

### 타이틀 화면

| ID | scene_type | 설명 |
|:---|:---|:---|
| TITLE_NORMAL | special | 경비실 데스크, 정상 상태 |
| TITLE_GLITCH | special | 동일 구도, 글리치/공포 버전 |

---

## 7. 검수 흐름

```
generate.py batch
      |
      v
images/temp/   <- 자동 저장 + manifest.json 기록 (status=pending)
      |
      v
generate.py review --pending   <- 미검수 목록 확인
      |
      +-- --accept N  --> images/comp/{scene_id}.png (status=accepted)
      +-- --reject-all            (status=rejected)
```

---

## 8. 배치 실행 순서 (우선순위 + 의존성)

```
Phase 1 (priority=1): special     - TITLE_NORMAL, TITLE_GLITCH
Phase 2 (priority=2): character   - S14 (REF_SUB_203, 의존성 루트)
Phase 3 (priority=3): character   - S03, S08, S09, S15b, S18, S25
Phase 4 (priority=4): environment - S15, S15a, S17 (의존성 후순위)
Phase 5 (priority=5): environment/macro - 나머지 배경씬
Phase 6 (priority=6): environment - ENDING_A~D
```

---

## 9. 주의사항

- ComfyUI 서버: `http://127.0.0.1:8188` 실행 필요
- WebSocket 자동 완료 추적 → 연결 실패 시 폴링 fallback (5초 간격)
- 레퍼런스 이미지: `C:/comfyui/ComfyUI/input/`에 자동 복사
- REF 저장: `images/ref/{REF_ID}.png` 고정명 (덮어쓰기)
- 새 챕터 추가: `prompt/chapter_02.json` + `prompt/chapter_02_refs.json` 형태로 생성 시 자동 인식
- `sdxl_character_closeup.json`은 1024×1024 출력 - 게임에서 레터박싱 처리 필요
