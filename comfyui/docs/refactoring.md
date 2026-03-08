# ComfyUI 워크플로우 & 파이프라인 리팩토링 계획

> 작성일: 2026-03-08

## 배경 및 문제점

facility-7 이미지 생성 파이프라인의 3가지 핵심 문제:

1. **워크플로우 혼란**: 5개 중 2개(emotion.json, emotion_outpaint.json) 미사용. 워크플로우 선택이 `composition_ref`/`use_outpaint` 추론 의존
2. **코드 중복**: 3개 파이썬 스크립트(generate_scenes/references/sequence)에 `queue_prompt`, `prepare_ref_image`, `wait_and_copy` 동일 코드 반복
3. **비효율**: 3초 sleep 폴링, 수동 temp→comp 이동, 생성 이력 추적 없음

**목표**: 워크플로우 4개로 정리 + 통합 CLI + WebSocket 완료추적 + 품질관리 파이프라인

---

## Step 1: 공통 라이브러리 생성 (`comfyui/lib/`)

중복 코드를 모듈로 추출. 기존 3개 스크립트에서 공통 패턴 재사용.

### 1-1. `lib/config.py` — 상수 통합

3개 스크립트에 흩어진 경로/URL 상수를 한 곳으로:
- `generate_scenes.py:11-27` (COMFYUI_URL, 경로들)
- `generate_references.py:9-20` (동일 상수 중복)
- `generate_sequence.py:25-34` (동일 상수 중복)

```python
# 핵심 상수
COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_WS_URL = "ws://127.0.0.1:8188/ws"
COMFYUI_INPUT_DIR = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"
PROJECT_TEMP_DIR = "comfyui/images/temp"
PROJECT_COMP_DIR = "comfyui/images/comp"
PROJECT_REF_DIR = "comfyui/images/ref"
PROMPT_DIR = "comfyui/prompt"

# 워크플로우 경로 (scene_type → workflow 파일 매핑)
WORKFLOW_MAP = {
    "environment":       "comfyui/workflow/sdxl_scene.json",
    "character_scene":   "comfyui/workflow/sdxl_outpaint.json",
    "macro":             "comfyui/workflow/sdxl_scene.json",
    "character_closeup": "comfyui/workflow/sdxl_character_closeup.json",
    "special":           "comfyui/workflow/sdxl_scene.json",
    "reference":         "comfyui/workflow/sd15_reference.json",
}

# scene_type별 기본 weight
DEFAULT_WEIGHTS = {
    "environment":       {"style": 0.4, "composition": 0.0},
    "character_scene":   {"style": 0.3, "composition": 0.8},
    "macro":             {"style": 0.3, "composition": 0.0},
    "character_closeup": {"style": 0.2, "composition": 0.9},
    "special":           {"style": 0.3, "composition": 0.0},
}
```

### 1-2. `lib/schema.py` — v2 스키마 검증 + v1 호환

**핵심 역할**: `scene_type` 필드 기반 워크플로우 결정. v1 데이터 자동 변환.

```python
def infer_scene_type(scene: dict) -> str:
    """v1 호환: scene_type 없으면 기존 필드에서 추론"""
    if scene.get("scene_type"):
        return scene["scene_type"]
    if scene.get("is_reference"):
        return "reference"
    if scene.get("composition_ref"):
        return "character_scene"
    if scene.get("use_outpaint"):
        return "character_scene"
    return "environment"

def normalize_weights(scene: dict, scene_type: str) -> tuple[float, float]:
    """style_weight/composition_weight 분리. v1의 단일 weight 호환"""
    defaults = DEFAULT_WEIGHTS[scene_type]
    style_w = scene.get("style_weight", defaults["style"])
    comp_w = scene.get("composition_weight", defaults["composition"])
    # v1 호환: 단일 weight → scene_type에 따라 분배
    if "weight" in scene and "style_weight" not in scene:
        if scene_type in ("character_scene", "character_closeup"):
            comp_w = scene["weight"]
        else:
            style_w = scene["weight"]
    return style_w, comp_w
```

### 1-3. `lib/comfyui_client.py` — API + WebSocket 완료 추적

기존 코드 위치:
- `generate_scenes.py:99-103` → `queue_prompt()`
- `generate_scenes.py:53-71` → `wait_and_copy()` (3초 폴링)

**개선**: WebSocket(`ws://127.0.0.1:8188/ws`)으로 실시간 완료 감지. 실패 시 폴링 fallback.

```python
class ComfyUIClient:
    def queue_prompt(self, workflow) -> str:
        """프롬프트 큐잉, prompt_id 반환"""

    def wait_for_completion(self, prompt_id, timeout=120) -> bool:
        """WebSocket으로 완료 대기. 실패 시 폴링 fallback"""
        try:
            return self._wait_ws(prompt_id, timeout)
        except Exception:
            return self._wait_polling(prompt_id, timeout)

    def _wait_ws(self, prompt_id, timeout):
        """ws://127.0.0.1:8188/ws 연결, executing/executed 이벤트 감시"""
        # ComfyUI WebSocket 프로토콜:
        # {"type": "executing", "data": {"node": "6", "prompt_id": "xxx"}}
        # {"type": "executed", "data": {"prompt_id": "xxx"}}

    def _wait_polling(self, prompt_id, timeout):
        """기존 3초 폴링 fallback (generate_scenes.py:58-70 로직)"""
```

**의존성**: `websocket-client` 패키지 (없으면 폴링만 사용)

### 1-4. `lib/ref_manager.py` — 레퍼런스 이미지 관리

기존 코드 위치:
- `generate_scenes.py:36-50` → `prepare_ref_image()`
- `generate_sequence.py:48-60` → 동일 함수 복사본
- `generate_sequence.py:83-89` → `copy_to_comfyui_input()`

```python
def prepare_ref_image(file_path: str) -> str | None:
    """레퍼런스 이미지를 ComfyUI input 폴더로 복사, 파일명 반환"""

def copy_output_as_ref(local_path: str, alias_name: str) -> str | None:
    """생성된 이미지를 ComfyUI input에 복사 (체이닝용)"""

def collect_output(prefix: str, scene_id: str, dest_dir: str) -> str | None:
    """ComfyUI output에서 생성 이미지를 프로젝트 폴더로 복사"""
```

### 1-5. `lib/workflow_loader.py` — 워크플로우 로드 + 파라미터 주입

기존 코드 위치:
- `generate_scenes.py:106-112` → `select_workflow()`
- `generate_scenes.py:145-184` → 노드 주입 로직
- `generate_sequence.py:208-256` → `run_scene()` 내 동일 로직

**핵심 변경**: `scene_type` 기반 워크플로우 선택 (추론 제거)

```python
def load_workflow(scene_type: str) -> dict:
    """scene_type → 워크플로우 JSON 로드"""

def inject_params(workflow: dict, scene: dict, seed: int,
                  style_weight: float, comp_weight: float,
                  ref_file: str, prefix: str) -> dict:
    """워크플로우 노드에 파라미터 주입"""
    # 노드 10: positive prompt
    # 노드 9:  negative prompt (scene_type별 base neg 자동 적용)
    # 노드 14: style ref 이미지
    # 노드 16: composition ref 이미지 (dual-ref 워크플로우만)
    # 노드 15: IP-Adapter weight
    # 노드 6/20: seed
    # 노드 12: filename_prefix
```

### 1-6. `lib/batch_runner.py` — 배치 실행 엔진

기존 코드 위치:
- `generate_sequence.py:94-133` → `topological_sort()` (Kahn 알고리즘)
- `generate_sequence.py:138-203` → 의존성 그래프 로딩

```python
def resolve_execution_order(scenes: list[dict]) -> list[list[dict]]:
    """우선순위 + 의존성 기반 실행 순서. 단계별 그룹 반환.
    Phase 1: REF (sequential)
    Phase 2: environment/macro (parallel)
    Phase 3: character_scene (parallel, REF 이후)
    Phase 4: depends_on 있는 씬 (topological sort)
    """

def run_batch(scenes, client, parallel=1, variants=1):
    """배치 실행. variants>1이면 다른 seed로 N회 반복."""
```

### 1-7. `lib/manifest.py` — 생성 이력 추적

**신규 기능**: `comfyui/manifest.json`에 생성/검수 상태 기록.

```python
def record_generation(scene_id, seed, path, workflow, variant_idx):
    """생성 기록 추가 (status=pending)"""

def accept_variant(scene_id, variant_idx):
    """variant 승인 → comp/로 복사, status=accepted"""

def reject_all(scene_id):
    """모든 variant 거부, status=rejected"""

def get_pending() -> list:
    """미검수 씬 목록"""
```

---

## Step 2: 워크플로우 수정

### 2-1. `sdxl_outpaint.json` — Dual-ref ImageBatch 추가

현재: 노드 14(LoadImage) → 15(IPAdapter) 단일 ref.
목표: emotion.json의 14+16+17 패턴을 SDXL에 이식.

```json
// 추가할 노드:
"16": {
  "inputs": { "image": "style_reference.png", "upload": "image" },
  "class_type": "LoadImage",
  "_meta": { "title": "Load Image (Composition - Character)" }
},
"17": {
  "inputs": { "image1": ["14", 0], "image2": ["16", 0] },
  "class_type": "ImageBatch",
  "_meta": { "title": "Image Batch (Combine Refs)" }
}

// 수정할 노드:
// "15".inputs.image: ["14", 0] → ["17", 0]
// "18".inputs.feathering: 128 → 160
```

파이썬 대응 (`workflow_loader.py`):
- `composition_ref` 있으면: 노드14=style_ref, 노드16=composition_ref
- `composition_ref` 없으면: 노드14=노드16=style_ref (기존과 동일 효과)

### 2-2. `sdxl_character_closeup.json` 신규 생성

sdxl_scene.json 기반, 변경 사항:
- 해상도: 1024x1024 (정사각, 인물 포커스)
- IP-Adapter: `ip-adapter-plus-face_sdxl_vit-h.safetensors` (얼굴 특화)
- KSampler steps: 40 (얼굴 디테일 강화)
- weight 기본값: 0.9

대상 씬: S15b, ENDING_C(거울 속 얼굴)

### 2-3. 미사용 워크플로우 퇴역

```bash
mv comfyui/workflow/emotion.json comfyui/achive/
mv comfyui/workflow/emotion_outpaint.json comfyui/achive/
```

---

## Step 3: 통합 CLI (`comfyui/generate.py`)

기존 3개 스크립트를 argparse subcommands로 통합:

```bash
python comfyui/generate.py refs [--ids REF_X]
python comfyui/generate.py scenes [--ids S01 S03] [--type environment]
python comfyui/generate.py batch [--chapter 1] [--variants 3] [--parallel 2]
python comfyui/generate.py review [--pending] [--scene S03 --accept 2]
```

내부적으로 `lib/` 모듈 호출. 기존 3개 스크립트 → `comfyui/achive/`로 이동.

---

## Step 4: 프롬프트 마이그레이션 (v2 스키마)

### `chapter_01.json` — `scene_type` 추가

| 씬 | scene_type | 근거 |
|:---|:---|:---|
| S01, S02, S06, S07, S10, S20-S24, S24b, S26a | `environment` | style_ref만, 배경/소품 |
| S03, S08, S09, S14, S17, S18, S25 | `character_scene` | composition_ref 사용 |
| S15, S15a | `environment` | chain_from 있지만 배경 매크로 |
| S15b | `character_closeup` | 얼굴 클로즈업 |
| S19 | `macro` | 소품 클로즈업 (컵) |
| ENDING_A~D | `environment` | 환경/소품 중심 |
| ENDING_C | `character_closeup` 후보 | 거울 속 얼굴 |

추가 필드:
- `style_weight`, `composition_weight` (기존 `weight` 유지하되 분리)
- `priority` (배치 실행 순서)
- `tags` (필터링용)
- `chain_from` → `depends_on` 리네이밍 + `use_prev_output` 추가

### `intro.json` — `scene_type` 추가

TITLE_NORMAL, TITLE_GLITCH → `scene_type: "special"`

### `chapter_01_refs.json` — 변경 없음

REF 스키마 현행 유지. `is_reference: true` 그대로.

---

## Step 5: 품질 관리 (`lib/quality.py` + `review` 서브커맨드)

### 자동 검증 (heuristic)

```python
def validate_image(path: str, expected_resolution: tuple) -> list[str]:
    """이미지 품질 자동 체크. 문제 목록 반환. (PIL/Pillow)"""
    # - 해상도 확인 (1920x1080 or 1024x1024)
    # - 검은/흰 테두리 감지 (outpaint 아티팩트)
    # - 밝기 히스토그램 (평균 < 30 or > 240 → 플래그)
    # - 파일 크기 이상치 (< 100KB → 의심)
```

### `review` 서브커맨드

```bash
python comfyui/generate.py review --pending              # 미검수 목록
python comfyui/generate.py review --scene S03 --accept 2 # variant 2 승인 → comp/
python comfyui/generate.py review --scene S03 --reject-all
```

---

## 수정 대상 파일 총정리

| 파일 | 조치 |
|:---|:---|
| `comfyui/lib/__init__.py` | 신규 |
| `comfyui/lib/config.py` | 신규 |
| `comfyui/lib/schema.py` | 신규 |
| `comfyui/lib/comfyui_client.py` | 신규 |
| `comfyui/lib/ref_manager.py` | 신규 |
| `comfyui/lib/workflow_loader.py` | 신규 |
| `comfyui/lib/batch_runner.py` | 신규 |
| `comfyui/lib/manifest.py` | 신규 |
| `comfyui/lib/quality.py` | 신규 |
| `comfyui/generate.py` | 신규 (통합 CLI) |
| `comfyui/workflow/sdxl_outpaint.json` | 수정 (dual-ref + feathering) |
| `comfyui/workflow/sdxl_character_closeup.json` | 신규 |
| `comfyui/prompt/chapter_01.json` | 수정 (scene_type 추가) |
| `comfyui/prompt/intro.json` | 수정 (scene_type 추가) |
| `comfyui/manifest.json` | 신규 (빈 `{}`) |
| `comfyui/docs/refactoring.md` | 신규 (이 파일) |
| `comfyui/comfyui.md` | 수정 (문서 갱신) |
| `comfyui/generate_scenes.py` | achive/ 이동 |
| `comfyui/generate_references.py` | achive/ 이동 |
| `comfyui/generate_sequence.py` | achive/ 이동 |
| `comfyui/workflow/emotion.json` | achive/ 이동 |
| `comfyui/workflow/emotion_outpaint.json` | achive/ 이동 |

---

## 구현 순서 (의존성 기반)

```
1. lib/ 모듈: config → schema → ref_manager → comfyui_client → workflow_loader → batch_runner → manifest → quality
2. 워크플로우 JSON 수정/생성: sdxl_outpaint, sdxl_character_closeup, 퇴역 파일 이동
3. generate.py 통합 CLI
4. 프롬프트 JSON 마이그레이션: chapter_01.json, intro.json
5. quality.py + review 서브커맨드
6. comfyui.md 문서 갱신
7. 기존 스크립트 achive/ 이동
```

---

## 검증 방법

1. `python comfyui/generate.py refs` — REF 5개 큐잉 정상
2. `python comfyui/generate.py scenes --ids S01 S03` — environment + character_scene 각 1개
3. `python comfyui/generate.py scenes --ids S15b` — character_closeup 워크플로우 동작
4. `python comfyui/generate.py batch --chapter 1 --variants 1` — 전체 배치 (우선순위+의존성 순서)
5. `python comfyui/generate.py review --pending` — manifest.json 상태 확인
6. WebSocket 연결 끊을 때 폴링 fallback 동작 확인
7. v1 스키마 JSON (scene_type 없는) 하위호환 확인
