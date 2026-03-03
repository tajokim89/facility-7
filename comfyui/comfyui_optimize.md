╭───────────────────────────────────────────────────────────────────────────────────────────────╮
│ Plan to implement                                                                             │
│                                                                                               │
│ ComfyUI 워크플로우 & 파이프라인 최적화 전략                                                   │
│                                                                                               │
│ Context                                                                                       │
│                                                                                               │
│ facility-7 프로젝트는 공포 비주얼 노벨로, Chapter 1에 28개 씬 + 4개 엔딩이 있고, 향후 Chapter │
│  2~4까지 총 55-60장의 씬 이미지 + 10-12개 캐릭터 REF + 13개 환경 REF가 필요함.                │
│                                                                                               │
│ 현재 문제:                                                                                    │
│ - 워크플로우 5개 중 2개(emotion.json, emotion_outpaint.json)가 미사용                         │
│ - 워크플로우 선택 로직이 composition_ref/use_outpaint 추론에 의존 (불안정)                    │
│ - 3개 파이썬 스크립트에 중복 코드 다수 (queue_prompt, prepare_ref_image, wait_and_copy)       │
│ - 폴링 기반 완료 체크 (3초 sleep loop) — 비효율적                                             │
│ - 품질 관리 파이프라인 없음 (temp/ → comp/ 수동 이동)                                         │
│ - generate_sequence.py의 IP-Adapter 체이닝이 비주얼 노벨에 부적합                             │
│                                                                                               │
│ ---                                                                                           │
│ Phase 1: 워크플로우 재설계                                                                    │
│                                                                              │
│ 1-1. 워크플로우 정리 (5개 → 4개)                                                              │
│                                                                                               │
│ ┌─────────────────────────────┬────────────────┬─────────────────────────────────────┐        │
│ │         워크플로우          │      조치      │                용도                 │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ sdxl_scene.json             │   유지+수정    │ 배경/환경, 매크로, 소품             │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ sdxl_outpaint.json          │   유지+수정    │ 캐릭터+환경 합성 (full/medium shot) │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ sdxl_character_closeup.json │      신규      │ 캐릭터 얼굴 클로즈업, 엔딩          │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ sd15_reference.json         │      유지      │ 캐릭터 레퍼런스 초상                │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ emotion.json                │ 퇴역 → achive/ │                                     │        │
│ ├─────────────────────────────┼────────────────┼─────────────────────────────────────┤        │
│ │ emotion_outpaint.json       │ 퇴역 → achive/ │                                     │        │
│ └─────────────────────────────┴────────────────┴─────────────────────────────────────┘        │
│                                                                                               │
│ 1-2. sdxl_outpaint.json 수정                                                                  │
│                                                                                               │
│ - Dual-ref ImageBatch 도입: emotion.json의 노드 14+16+17 패턴을 SDXL에 이식                   │
│   - 노드 14: style_ref 로드 (스타일 일관성)                                                   │
│   - 노드 16 (신규): composition_ref 로드 (캐릭터)                                             │
│   - 노드 17 (신규): ImageBatch → IP-Adapter에 전달                                            │
│ - feathering 128 → 160으로 증가 (경계 블렌딩 개선)                                            │
│                                                                                               │
│ 1-3. sdxl_character_closeup.json 신규 생성                                                    │
│                                                                                               │
│ - 해상도: 1024x1024 (정사각, 인물 포커스)                                                     │
│ - IP-Adapter: ip-adapter-plus-face_sdxl_vit-h.safetensors (얼굴 특화)                         │
│ - weight: 0.85~0.95 (높은 얼굴 일관성)                                                        │
│ - steps: 40 (얼굴 디테일 강화)                                                                │
│ - 출력: 1024x1024 또는 레터박싱으로 1920x1080                                                 │
│ - 대상 씬: S15b, ENDING_C, 향후 감정 클로즈업 씬                                              │
│                                                                                               │
│ ---                                                                                           │
│ Phase 2: 프롬프트 스키마 v2                                                                   │
│                                                                                               │
│ 2-1. 핵심 변경: scene_type 필드 추가                                                          │
│                                                                                               │
│ {                                                                                             │
│   "id": "S03",                                                                                │
│   "scene_type": "character_scene",                                                            │
│   "prompt": "...",                                                                            │
│   "negative_prompt": "...",                                                                   │
│   "style_ref": "style_reference.png",                                                         │
│   "composition_ref": "images/ref/REF_HAN_SE_JIN.png",                                         │
│   "style_weight": 0.3,                                                                        │
│   "composition_weight": 0.8,                                                                  │
│   "variants": 1,                                                                              │
│   "priority": 2,                                                                              │
│   "tags": ["chapter1", "character", "han_sejin"],                                             │
│   "seed": null                                                                                │
│ }                                                                                             │
│                                                                                               │
│ 2-2. scene_type → 워크플로우 매핑                                                             │
│                                                                                               │
│ ┌───────────────────┬────────────────────────┬───────────────────┬──────────────────┐         │
│ │    scene_type     │       워크플로우       │ style_weight 기본 │ comp_weight 기본 │         │
│ ├───────────────────┼────────────────────────┼───────────────────┼──────────────────┤         │
│ │ environment       │ sdxl_scene             │        0.4        │       0.0        │         │
│ ├───────────────────┼────────────────────────┼───────────────────┼──────────────────┤         │
│ │ character_scene   │ sdxl_outpaint          │        0.3        │       0.8        │         │
│ ├───────────────────┼────────────────────────┼───────────────────┼──────────────────┤         │
│ │ macro             │ sdxl_scene             │        0.3        │       0.0        │         │
│ ├───────────────────┼────────────────────────┼───────────────────┼──────────────────┤         │
│ │ character_closeup │ sdxl_character_closeup │        0.2        │       0.9        │         │
│ ├───────────────────┼────────────────────────┼───────────────────┼──────────────────┤         │
│ │ special           │ sdxl_scene             │        0.3        │       0.0        │         │
│ └───────────────────┴────────────────────────┴───────────────────┴──────────────────┘         │
│                                                                                               │
│ 2-3. chain_from → depends_on + use_prev_output                                                │
│                                                                                               │
│ - depends_on: 실행 순서만 보장 (기본)                                                         │
│ - use_prev_output: true: 이전 씬 출력을 IP-Adapter ref로 사용 (선택적)                        │
│                                                                                               │
│ 2-4. 하위호환                                                                                 │
│                                                                                               │
│ - scene_type 없으면 → composition_ref/use_outpaint로 추론 (기존 로직)                         │
│ - weight 단일 필드 → scene_type에 따라 style/composition으로 자동 분배                        │
│                                                                                               │
│ ---                                                                                           │
│ Phase 3: 파이썬 파이프라인 통합                                                               │
│                                                                                               │
│ 3-1. 디렉토리 구조                                                                            │
│                                                                                               │
│ comfyui/                                                                                      │
│   generate.py              # 통합 CLI (argparse subcommands)                                  │
│   lib/                                                                                        │
│     __init__.py                                                                               │
│     config.py              # 경로, URL, 상수                                                  │
│     schema.py              # 스키마 검증 + v1→v2 마이그레이션                                 │
│     workflow_loader.py     # 워크플로우 로드 + 파라미터 주입                                  │
│     comfyui_client.py      # ComfyUI API (queue + WebSocket 완료 추적)                        │
│     ref_manager.py         # 레퍼런스 이미지 복사/조회                                        │
│     batch_runner.py        # 배치 실행 (우선순위, 의존성, 병렬)                               │
│     manifest.py            # 생성 이력 추적 (manifest.json)                                   │
│   workflow/                # (기존 유지)                                                      │
│   prompt/                  # (기존 유지)                                                      │
│   images/                  # (기존 유지)                                                      │
│                                                                                               │
│ 3-2. 통합 CLI                                                                                 │
│                                                                                               │
│ # 레퍼런스 생성                                                                               │
│ python comfyui/generate.py refs [--ids REF_X]                                                 │
│                                                                                               │
│ # 씬 생성                                                                                     │
│ python comfyui/generate.py scenes [--ids S01 S03] [--type environment] [--tag chapter1]       │
│                                                                                               │
│ # 전체 배치 (우선순위 순서대로)                                                               │
│ python comfyui/generate.py batch [--chapter 1] [--variants 3] [--parallel 2]                  │
│                                                                                               │
│ # 리뷰                                                                                        │
│ python comfyui/generate.py review [--pending] [--scene S03] [--accept 2]                      │
│                                                                                               │
│ 3-3. 핵심 개선사항                                                                            │
│                                                                                               │
│ ComfyUI WebSocket 클라이언트:                                                                 │
│ - 현재 3초 폴링 → ws://127.0.0.1:8188/ws WebSocket으로 실시간 완료 추적                       │
│ - prompt_id 기반 이벤트 매칭                                                                  │
│ - 폴링은 WebSocket 실패 시 fallback                                                           │
│                                                                                               │
│ 배치 실행 순서:                                                                               │
│ Phase 1: REF 생성 (priority=0, sequential)                                                    │
│ Phase 2: 환경/매크로 씬 (캐릭터 의존 없음, parallel up to N)                                  │
│ Phase 3: 캐릭터 씬 (REF 필요, parallel up to N)                                               │
│ Phase 4: 의존성 씬 (depends_on 순서, sequential)                                              │
│                                                                                               │
│ Manifest 추적 (manifest.json):                                                                │
│ {                                                                                             │
│   "S01": {                                                                                    │
│     "status": "accepted|pending|rejected",                                                    │
│     "variants": [{"seed": 123, "path": "images/temp/S01_v1.png"}],                            │
│     "accepted_path": "images/comp/S01.png",                                                   │
│     "workflow": "sdxl_scene",                                                                 │
│     "generated_at": "2026-03-01T15:14:00Z"                                                    │
│   }                                                                                           │
│ }                                                                                             │
│                                                                                               │
│ 3-4. 기존 스크립트 처리                                                                       │
│                                                                                               │
│ ┌────────────────────────┬──────────────────────────────────────────────────────────────────┐ │
│ │       기존 파일        │                               조치                               │ │
│ ├────────────────────────┼──────────────────────────────────────────────────────────────────┤ │
│ │ generate_scenes.py     │ → generate.py scenes 서브커맨드로 흡수                           │ │
│ ├────────────────────────┼──────────────────────────────────────────────────────────────────┤ │
│ │ generate_references.py │ → generate.py refs 서브커맨드로 흡수                             │ │
│ ├────────────────────────┼──────────────────────────────────────────────────────────────────┤ │
│ │ generate_sequence.py   │ → batch_runner.py의 의존성 해석 로직으로 흡수 (topological sort  │ │
│ │                        │ 재사용)                                                          │ │
│ ├────────────────────────┼──────────────────────────────────────────────────────────────────┤ │
│ │ 기존 3파일             │ → achive/로 이동                                                 │ │
│ └────────────────────────┴──────────────────────────────────────────────────────────────────┘ │
│                                                                                               │
│ ---                                                                                           │
│ Phase 4: 스타일 일관성 전략                                                                   │
│                                                                                               │
│ 4-1. 계층형 레퍼런스 시스템                                                                   │
│                                                                                               │
│ Tier 0: 글로벌 스타일 (style_reference.png) — 전체 톤/팔레트                                  │
│ Tier 1: 챕터별 스타일 (chapter_XX_style.png) — 챕터 무드                                      │
│ Tier 2: 캐릭터 REF (REF_*.png) — 얼굴/인물 일관성                                             │
│                                                                                               │
│ 4-2. Dual-ref 적용                                                                            │
│                                                                                               │
│ - 캐릭터 씬: Tier 0/1 (스타일) + Tier 2 (캐릭터) → ImageBatch → IP-Adapter                    │
│ - 환경 씬: Tier 0/1만 사용                                                                    │
│                                                                                               │
│ ---                                                                                           │
│ Phase 5: 품질 관리                                                                            │
│                                                                                               │
│ 5-1. 자동 검증 (heuristic)                                                                    │
│                                                                                               │
│ - 해상도 확인 (1920x1080)                                                                     │
│ - 검은/흰 테두리 감지 (outpaint 아티팩트)                                                     │
│ - 밝기 히스토그램 (너무 어두움/밝음 플래그)                                                   │
│ - 파일 크기 이상치 감지                                                                       │
│                                                                                               │
│ 5-2. 리뷰 CLI                                                                                 │
│                                                                                               │
│ python comfyui/generate.py review --pending        # 미검수 목록                              │
│ python comfyui/generate.py review --scene S03 --accept 2  # variant 2 승인 → comp/로 복사     │
│ python comfyui/generate.py review --scene S03 --reject-all --regenerate  # 거부 + 재생성      │
│                                                                                               │
│ ---                                                                                           │
│ 구현 순서                                                                                     │
│                                                                                               │
│ Step 1: 기반 작업                                                                             │
│                                                                                               │
│ - comfyui/lib/ 모듈 구조 생성                                                                 │
│ - config.py: 경로/URL/상수 통합                                                               │
│ - schema.py: v2 검증 + v1 호환                                                                │
│ - comfyui_client.py: queue_prompt + WebSocket 완료 추적                                       │
│ - ref_manager.py: prepare_ref_image 통합                                                      │
│                                                                                               │
│ Step 2: 워크플로우 수정                                                                       │
│                                                                                               │
│ - sdxl_character_closeup.json 신규 생성                                                       │
│ - sdxl_outpaint.json에 Dual-ref ImageBatch 노드 추가                                          │
│ - sdxl_outpaint.json feathering 160으로 조정                                                  │
│ - emotion.json, emotion_outpaint.json → achive/ 이동                                          │
│                                                                                               │
│ Step 3: 파이프라인 통합                                                                       │
│                                                                                               │
│ - workflow_loader.py: scene_type 기반 워크플로우 선택 + 파라미터 주입                         │
│ - batch_runner.py: 우선순위 정렬 + 의존성 해석 + 병렬 큐잉                                    │
│ - manifest.py: 생성 이력 추적                                                                 │
│ - generate.py: 통합 CLI (refs, scenes, batch 서브커맨드)                                      │
│                                                                                               │
│ Step 4: 프롬프트 마이그레이션                                                                 │
│                                                                                               │
│ - chapter_01.json → v2 스키마 (scene_type 추가)                                               │
│ - chapter_01_refs.json 확인 (REF_SUB_089 누락 확인)                                           │
│ - intro.json → v2 스키마                                                                      │
│ - comfyui.md 문서 갱신                                                                        │
│                                                                                               │
│ Step 5: 품질 관리                                                                             │
│                                                                                               │
│ - quality.py: 자동 검증 로직                                                                  │
│ - generate.py review 서브커맨드 구현                                                          │
│ - --variants N 멀티 변형 생성 지원                                                            │
│                                                                                               │
│ ---                                                                                           │
│ 수정 대상 파일                                                                                │
│                                                                                               │
│ ┌──────────────────────────────────────────────┬─────────────────────────────┐                │
│ │                     파일                     │            조치             │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/lib/*.py (7개)                       │ 신규 생성                   │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/generate.py                          │ 신규 생성 (통합 CLI)        │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/workflow/sdxl_outpaint.json          │ 수정 (dual-ref, feathering) │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/workflow/sdxl_character_closeup.json │ 신규 생성                   │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/prompt/chapter_01.json               │ 수정 (scene_type 추가)      │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/prompt/intro.json                    │ 수정 (scene_type 추가)      │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/comfyui.md                           │ 수정 (문서 갱신)            │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/manifest.json                        │ 신규 생성                   │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/generate_scenes.py                   │ → achive/ 이동              │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/generate_sequence.py                 │ → achive/ 이동              │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/generate_references.py               │ → achive/ 이동              │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/workflow/emotion.json                │ → achive/ 이동              │                │
│ ├──────────────────────────────────────────────┼─────────────────────────────┤                │
│ │ comfyui/workflow/emotion_outpaint.json       │ → achive/ 이동              │                │
│ └──────────────────────────────────────────────┴─────────────────────────────┘                │
│                                                                                               │
│ 검증 방법                                                                                     │
│                                                                                               │
│ 1. python comfyui/generate.py refs — REF 5개 정상 생성 확인                                   │
│ 2. python comfyui/generate.py scenes --ids S01 S03 — 환경+캐릭터 씬 각 1개 테스트             │
│ 3. python comfyui/generate.py batch --chapter 1 --variants 1 — 전체 배치 실행                 │
│ 4. python comfyui/generate.py review --pending — 리뷰 CLI 동작 확인                           │
│ 5. manifest.json 상태 추적 정상 확인                                                          │
│ 6. WebSocket 연결 실패 시 폴링 fallback 동작 확인                                             │
╰───────────────────────────────────────────────────────────────────────────────────────────────╯