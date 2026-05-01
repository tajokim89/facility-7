# ComfyUI 이미지 생성 파이프라인 사용법

> 최종 업데이트: 2026-03-08

---

## 사전 조건

- **ComfyUI 서버** `http://127.0.0.1:8188` 실행 중이어야 함
- Python 3.10+ (타입 힌트 `str | None` 사용)
- 선택 의존성: `websocket-client` (없으면 자동으로 폴링 fallback)
- **반드시 프로젝트 루트 `facility-7/`에서 실행**

```bash
pip install websocket-client  # WebSocket 완료 추적 (권장)
pip install Pillow            # 품질 자동 검증 (권장)
```

---

## 기본 구조

```
python comfyui/generate.py [공통 옵션] <서브커맨드> [서브커맨드 옵션
**공통 옵션** (모든 서브커맨드에 적용):
```
| 옵션 | 기본값 | 설명 |
|:---|:---|:---|
| `--fixed` | off | JSON에 지정된 seed 고정 사용 (재현용) |
| `--out_dir NAME` | `facility-7` | ComfyUI output 하위 폴더명 |

---

## 서브커맨드

### 1. `refs` — 캐릭터 레퍼런스 이미지 생성

```bash
# 전체 REF 생성 (5개 캐릭터)
python comfyui/generate.py refs

# 특정 REF만 생성
python comfyui/generate.py refs --ids REF_HAN_SE_JIN
python comfyui/generate.py refs --ids REF_HAN_SE_JIN REF_LEE_JUN_HYEOK
```

**결과**: `comfyui/images/ref/{REF_ID}.png` 고정명으로 저장

사용 가능한 REF ID:
- `REF_HAN_SE_JIN` — 한세진 (선임 관찰자, 20대 후반 여성)
- `REF_LEE_JUN_HYEOK` — 이준혁 (남성 관찰자, 냉소적)
- `REF_SUB_117` — 대상자 #117 (중년 남성)
- `REF_SUB_203` — 대상자 #203 (20대 여성)
- `REF_SUB_089` — 대상자 #089 (60대 남성)

---

### 2. `scenes` — 개별 씬 생성

```bash
# 특정 씬 ID로 생성
python comfyui/generate.py scenes --ids S03
python comfyui/generate.py scenes --ids S03 S08 S14

# scene_type 필터로 일괄 생성
python comfyui/generate.py scenes --type environment
python comfyui/generate.py scenes --type character_scene
python comfyui/generate.py scenes --type character_closeup

# seed 고정 재현 (JSON에 seed 필드 있을 때)
python comfyui/generate.py scenes --ids S03 --fixed
```

**결과**: `comfyui/images/temp/` 에 저장 + `manifest.json` 기록

사용 가능한 `--type` 값:
| 값 | 워크플로우 | 해상도 |
|:---|:---|:---|
| `environment` | sdxl_scene.json | 1920×1080 |
| `macro` | sdxl_scene.json | 1920×1080 |
| `special` | sdxl_scene.json | 1920×1080 |
| `character_scene` | sdxl_outpaint.json | 1920×1080 |
| `character_closeup` | sdxl_character_closeup.json | 1024×1024 |

---

### 3. `batch` — 전체 배치 생성

의존성과 우선순위를 자동으로 계산해서 올바른 순서로 실행.

```bash
# Chapter 01 전체 배치 (29씬)
python comfyui/generate.py batch

# 특정 챕터만
python comfyui/generate.py batch --chapter 1

# 씬당 3가지 variant 생성
python comfyui/generate.py batch --variants 3

# 챕터 + variant 조합
python comfyui/generate.py batch --chapter 1 --variants 2
```

**실행 순서** (자동 결정):
```
Phase 1 (priority=1): TITLE_NORMAL, TITLE_GLITCH
Phase 2 (priority=2): S14 (의존성 루트)
Phase 3 (priority=3): S03, S08, S09, S15b, S18, S25
Phase 4 (priority=4): S15, S15a, S17 (의존성 후순위)
Phase 5 (priority=5): 나머지 배경/매크로 씬
Phase 6 (priority=6): ENDING_A~D
```

**의존성**: `depends_on`이 있는 씬은 부모 씬 완료 후 실행됨
(예: S15, S15a, S15b는 S14 완료 후 실행)

---

### 4. `review` — 검수 워크플로우

생성된 이미지를 확인하고 최종본을 `comp/` 폴더로 옮김.

```bash
# 미검수 목록 확인
python comfyui/generate.py review --pending

# 특정 씬 상태 조회
python comfyui/generate.py review --scene S03

# variant N 번 승인 (comp/ 폴더로 복사)
python comfyui/generate.py review --scene S03 --accept 0

# 모든 variant 거부 (재생성 필요)
python comfyui/generate.py review --scene S03 --reject-all
```

**검수 흐름**:
```
batch/scenes 실행
    -> images/temp/ 저장 + manifest.json (status=pending)
    -> review --pending 으로 목록 확인
    -> review --scene S03 으로 variant 확인
    -> --accept N 으로 승인 -> images/comp/{scene_id}.png
```

---

## 전형적인 작업 흐름

### 처음 시작 (캐릭터 REF 먼저)

```bash
# 1. REF 생성
python comfyui/generate.py refs

# 2. REF 이미지 확인 후 씬 생성 시작
python comfyui/generate.py batch --chapter 1
```

### 특정 씬만 재생성

```bash
# S14가 마음에 안 들면
python comfyui/generate.py scenes --ids S14

# 여러 개 한꺼번에
python comfyui/generate.py scenes --ids S14 S15 S15b
```

### 배리언트 비교 후 검수

```bash
# 3가지 버전 생성
python comfyui/generate.py scenes --ids S03 --variants 3   # batch가 아닌 경우 variants는 별도 3회 실행

# 검수
python comfyui/generate.py review --scene S03             # 상태 보기
python comfyui/generate.py review --scene S03 --accept 1  # 2번째 variant 승인
```

---

## 파일 경로 정리

| 경로 | 설명 |
|:---|:---|
| `comfyui/images/ref/` | 캐릭터 REF 이미지 (`{REF_ID}.png`) |
| `comfyui/images/temp/` | 생성 직후 임시 저장 (검수 전) |
| `comfyui/images/comp/` | 검수 승인 최종본 |
| `comfyui/manifest.json` | 생성 이력 DB |
| `comfyui/prompt/` | 씬 프롬프트 JSON |
| `comfyui/workflow/` | ComfyUI 워크플로우 JSON |

---

## 자주 발생하는 문제

### ComfyUI 서버 연결 실패
```
WebSocket 연결 실패. 폴링 모드로 fallback.
```
ComfyUI가 실행 중인지 확인: `http://127.0.0.1:8188`

### 레퍼런스 이미지 없음
```
실패 [S03]: ...
```
씬 생성 전에 `python comfyui/generate.py refs` 로 REF 먼저 생성.

### character_closeup 이미지 크기
`sdxl_character_closeup.json`은 1024×1024 출력. 게임에서 레터박싱 처리 필요.

### Windows 환경
- Python 명령어는 `python` (PATH에 등록된 경우)
- 경로 구분자는 자동 처리됨 (`os.path` 사용)
