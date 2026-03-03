# ComfyUI 이미지 생성 시스템 문서

## 1. 디렉토리 구조

```
comfyui/
├── generate_scenes.py          # 씬 이미지 생성 스크립트
├── generate_references.py      # 캐릭터 레퍼런스 이미지 생성 스크립트
│
├── workflow/                   # ComfyUI 워크플로우 JSON (모두 여기서 관리)
│   ├── emotion.json            # SD 1.5 base (레퍼런스 생성 fallback)
│   ├── sd15_reference.json     # SD 1.5 레퍼런스 전용
│   ├── sdxl_scene.json         # SDXL Direct — 배경/환경 씬
│   ├── sdxl_outpaint.json      # SDXL Outpaint — 캐릭터/와이드샷 씬
│   └── emotion_outpaint.json   # Outpaint 변형 워크플로우
│
├── prompt/                     # 프롬프트 데이터
│   ├── chapter_01.json         # Chapter 01 씬 프롬프트 (S01~ENDING)
│   ├── chapter_01_refs.json    # Chapter 01 캐릭터 레퍼런스 프롬프트
│   └── intro.json              # 타이틀 화면 프롬프트 (TITLE_NORMAL, TITLE_GLITCH)
│
├── images/                     # 생성 이미지 저장소
│   ├── temp/                   # 1차 자동 저장 (검수 전)
│   ├── comp/                   # 검수 완료 최종본 (수동 이동)
│   └── ref/                    # 캐릭터 레퍼런스 최종본
├── images_v2/                  # v2 버전 이미지
│   ├── temp/
│   └── ref/
│
└── achive/                     # 구버전 보관
    ├── generate_scenes_backup.py
    └── comfyui_prompts.txt
```

---

## 2. 파일 역할 분리 원칙

| 파일 | 대상 | 워크플로우 |
|---|---|---|
| `generate_references.py` | `prompt/*_refs.json` — `is_reference: true` 항목 | `workflow/sd15_reference.json` (SD 1.5) |
| `generate_scenes.py` | `prompt/*.json` — `*_refs.json` 제외, 씬만 | `workflow/sdxl_scene.json` / `workflow/sdxl_outpaint.json` |

> **규칙:** 레퍼런스 프롬프트는 반드시 `*_refs.json` 파일에, 씬 프롬프트는 나머지 JSON에 작성한다.

---

## 3. 워크플로우 상세

### 워크플로우 선택 로직 (`generate_scenes.py`)

| 조건 | 워크플로우 | 모델 |
|---|---|---|
| `composition_ref` 있음 (캐릭터 씬) | `sdxl_outpaint.json` | `juggernautXL_ragnarokBy.safetensors` |
| `use_outpaint: true` | `sdxl_outpaint.json` | `juggernautXL_ragnarokBy.safetensors` |
| 나머지 배경/환경 씬 | `sdxl_scene.json` | `juggernautXL_ragnarokBy.safetensors` |

### 레퍼런스 워크플로우 (`generate_references.py`)

| 조건 | 워크플로우 | 모델 |
|---|---|---|
| `is_reference: true` | `sd15_reference.json` | `majicmixRealistic_v7.safetensors` |

### 워크플로우 공통 노드 매핑

| 노드 ID | 역할 | 스크립트에서 주입하는 값 |
|---|---|---|
| `"6"` | KSampler (메인) | `seed` |
| `"8"` | EmptyLatentImage | 해상도 (1920×1080) |
| `"9"` | CLIP Negative | `final_neg` 문자열 |
| `"10"` | CLIP Positive | `scene["prompt"]` |
| `"11"` | CheckpointLoader | (모델 고정, 수정 불필요) |
| `"12"` | SaveImage | `filename_prefix` |
| `"14"` | IPAdapter Image Input | 레퍼런스 이미지 파일명 |
| `"15"` | IPAdapter | `weight` |
| `"20"` | KSampler (Outpaint 2단계) | `seed + 1` |

### `sd15_reference.json` 노드 매핑 (별도 구조)

| 노드 ID | 역할 |
|---|---|
| `"1"` | Seed |
| `"3"` | filename_prefix |
| `"5"` | Positive 프롬프트 |
| `"6"` | Negative 프롬프트 |

### KSampler 설정 비교

| 항목 | SD 1.5 (레퍼런스) | SDXL (씬) |
|---|---|---|
| steps | 25 | 35 |
| cfg | 7 | 7 |
| sampler | euler | dpmpp_2m_sde |
| scheduler | simple | karras |
| 해상도 | 768×768 | 1920×1080 |

---

## 4. 프롬프트 데이터 구조

### 씬 오브젝트 스키마 (`chapter_01.json`, `intro.json`)

```json
{
  "id": "S01",
  "prompt": "...",
  "negative_prompt": "...",
  "style_ref": "style_reference.png",
  "composition_ref": "images/ref/REF_HAN_SE_JIN.png",
  "weight": 0.8,
  "use_outpaint": true,
  "seed": 12345
}
```

### 레퍼런스 오브젝트 스키마 (`chapter_01_refs.json`)

```json
{
  "id": "REF_HAN_SE_JIN",
  "prompt": "...",
  "negative_prompt": "...",
  "is_reference": true
}
```

### IP-Adapter Weight 가이드

| 상황 | weight | 비고 |
|---|---|---|
| 캐릭터 얼굴 고정 | 0.8 | `composition_ref` 사용 |
| 캐릭터 느슨한 참조 | 0.4~0.5 | 포즈/환경 유연성 |
| 소품/스타일 힌트 | 0.3 | `use_outpaint` 병용 |
| 환경/배경만 | 0.0 | `style_ref` 또는 weight 0 |

---

## 5. Chapter 01 씬 목록 및 생성 전략

### 레퍼런스 캐릭터 (`chapter_01_refs.json`)

| ID | 설명 |
|---|---|
| `REF_HAN_SE_JIN` | 한세진 (선임 관찰자, 20대 후반 여성, 무표정) |
| `REF_LEE_JUN_HYEOK` | 이준혁 (남성 관찰자, 냉소적 반소) |
| `REF_SUB_117` | 대상자 #117 (중년 남성, 피폐·공허한 눈) |
| `REF_SUB_203` | 대상자 #203 (20대 여성, 공포에 질린 눈) |
| `REF_SUB_089` | 대상자 #089 (60대 남성, 평온한 공허함) |

### 씬 생성 계획 (`chapter_01.json`)

| 씬 ID | 주요 내용 | 생성 | 레퍼런스 | 워크플로우 |
|:---|:---|:---:|:---|:---|
| **S01** | 태블릿 POV, 의료 데이터 화면 | O | style_ref (w=0.0) | SDXL Direct |
| **S02** | 엘리베이터 B9, 폐쇄공포 | O | style_ref | SDXL Direct |
| **S03** | 한세진 첫 등장, 무한 복도 | O | `comp: REF_HAN_SE_JIN` (w=0.8) | SDXL Outpaint |
| S04~S05 | 구역/규칙 설명 (대사 위주) | X | S03 재사용 | — |
| **S06** | 텅 빈 로커룸, PROCESSED 라벨 | O | style_ref | SDXL Direct |
| **S07** | A구역, 빈 의자+투명관 | O | style_ref | SDXL Direct |
| **S08** | A구역의 한세진, 태블릿 소지 | O | `comp: REF_HAN_SE_JIN` (w=0.8) | SDXL Outpaint |
| **S09** | 대상자 #117, 추출 의자 착석 | O | `comp: REF_SUB_117` (w=0.4) | SDXL Outpaint |
| **S10** | 투명관 흐르는 회색 액체 | O | style_ref | SDXL Direct |
| S11~13 | 대상자 대화 및 퇴장 | X | S10 재사용 | — |
| **S14** | 대상자 #203, 붉은 액체 공포 | O | `comp: REF_SUB_203` (w=0.5) | SDXL Outpaint |
| **S15** | 비상 알림, 끓는 붉은 액체 | O | style_ref | SDXL Direct |
| **S17** | 휴게실, 무표정 관찰자들 | O | style_ref | SDXL Outpaint |
| **S18** | 이준혁 등장 | O | `comp: REF_LEE_JUN_HYEOK` (w=0.8) | SDXL Outpaint |
| **S19** | 자판기 컵, 회색 액체 | O | style_ref (w=0.3) | SDXL Outpaint |
| **S20** | PA 스피커 클로즈업 | O | style_ref | SDXL Direct |
| **S21** | B구역 입구, 유리 장치들 | O | style_ref | SDXL Direct |
| **S22** | B구역 은빛 액체 | O | style_ref | SDXL Direct |
| **S23** | 복도 구역 표지판 | O | style_ref | SDXL Direct |
| **S24** | G구역 금속 문 | O | style_ref | SDXL Direct |
| **S24b** | 거울의 방 (G구역 내부) | O | style_ref | SDXL Direct |
| **S25** | 대상자 #089, 노란 액체 | O | `comp: REF_SUB_089` (w=0.4) | SDXL Outpaint |
| **S26a** | 글리치 태블릿 화면 | O | style_ref | SDXL Direct |
| **ENDING_A** | 시설 밖 외로운 뒷모습 | O | style_ref | SDXL Direct |
| **ENDING_B** | 어두운 방의 태블릿 | O | style_ref | SDXL Direct |
| **ENDING_C** | 거울 속 얼굴, #042 글리치 | O | style_ref | SDXL Direct |
| **ENDING_D** | 검은 태블릿 화면 | O | style_ref | SDXL Direct |

### 타이틀 화면 (`intro.json`)

| ID | 설명 | 워크플로우 |
|---|---|---|
| `TITLE_NORMAL` | 경비실 데스크, 정상 상태 | SDXL Outpaint |
| `TITLE_GLITCH` | 동일 구도, 글리치/공포 버전 | SDXL Outpaint |

---

## 6. 실행 명령어

```bash
# 프로젝트 루트(facility-7/)에서 실행

# --- 씬 생성 ---
python comfyui/generate_scenes.py                      # 전체 씬 (랜덤 seed)
python comfyui/generate_scenes.py --ids S03 S08        # 특정 씬만
python comfyui/generate_scenes.py --fixed --ids S01    # seed 고정 재현
python comfyui/generate_scenes.py --ids S03 --weight 0.9  # weight 조정

# --- 레퍼런스 생성 ---
python comfyui/generate_references.py                  # 모든 *_refs.json 처리
```

---

## 7. Negative Prompt 전략

### 씬 유형별 기본값 (자동 적용)

| 씬 유형 | Negative Prompt |
|---|---|
| 캐릭터 씬 / Outpaint | `text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy, (multiple subjects, duplicate:1.4)` |
| 배경/환경 씬 | `text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy` |
| SD 1.5 레퍼런스 | `(low quality, worst quality:1.4), text, watermark, blurry, distorted, extra limbs, bad anatomy, (cartoon, anime, 3d, render:1.3)` |

> JSON의 `"negative_prompt"` 값은 위 기본값 **뒤에 추가**됨.

---

## 8. 이미지 파일 관리

### 파일명 패턴

```
# temp 폴더 (generate_scenes.py 자동 저장)
{scene_id}_{out_dir}/{source}_{scene_id}_{seed}_00001_.png
예: S03_facility-7/chapter_01_S03_348076396875676_00001_.png

# ref 폴더 (generate_references.py 자동 저장)
{ref_id}.png
예: REF_HAN_SE_JIN.png
```

### 검수 흐름

```
생성 완료 → images/temp/  (자동)
     ↓ 검수 통과
           → images/comp/  (수동 이동)

레퍼런스   → images/ref/   (자동, 고정 파일명 덮어쓰기)
```

---

## 9. 주의사항

- **ComfyUI 서버**: `http://127.0.0.1:8188` 실행 필요
- **실행 위치**: 반드시 프로젝트 루트 `facility-7/`에서 실행
- **레퍼런스 이미지**: `C:/comfyui/ComfyUI/input/`에 자동 복사됨 (경로 고정)
- **폴링 타임아웃**: 씬 120초, 레퍼런스 60초
- **새 챕터 추가 시**: `prompt/chapter_02.json` (씬) + `prompt/chapter_02_refs.json` (레퍼런스) 형태로 생성하면 자동 인식
