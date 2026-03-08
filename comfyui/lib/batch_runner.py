"""
batch_runner.py — 배치 실행 엔진

씬 목록을 우선순위 + 의존성 기반으로 정렬하고 순차/병렬 실행 지원.
"""
import copy
import random
from collections import defaultdict, deque
from .schema import infer_scene_type, normalize_weights
from .workflow_loader import load_workflow, inject_params
from .ref_manager import prepare_ref_image, copy_output_as_ref, collect_output
from .config import TEMP_DIR, DEFAULT_OUT_DIR


# Phase 실행 순서 (낮을수록 먼저)
_PHASE_ORDER = {
    "reference":         0,
    "environment":       1,
    "macro":             1,
    "special":           1,
    "character_scene":   2,
    "character_closeup": 2,
}


def resolve_execution_order(scenes: list) -> list:
    """
    우선순위 + 의존성(depends_on / chain_from)을 고려해 실행 순서를 반환.
    반환: 씬 dict의 정렬된 flat 리스트 (의존성 위배 없음).

    정렬 기준:
      1. scene_type phase (_PHASE_ORDER)
      2. depends_on / chain_from 부모가 먼저 실행되어야 함
      3. priority 필드 (낮을수록 먼저, 기본 99)
    """
    scene_map = {s["id"]: s for s in scenes}

    # 의존성 그래프 구성 (depends_on 또는 chain_from)
    graph = defaultdict(list)   # parent_id → [child_id]
    in_degree = {s["id"]: 0 for s in scenes}

    for scene in scenes:
        parent_id = scene.get("depends_on") or scene.get("chain_from")
        if parent_id and parent_id in scene_map:
            graph[parent_id].append(scene["id"])
            in_degree[scene["id"]] += 1

    # Kahn 알고리즘 (위상 정렬)
    def _phase(sid):
        st = infer_scene_type(scene_map[sid])
        return _PHASE_ORDER.get(st, 99)

    def _priority(sid):
        return scene_map[sid].get("priority", 99)

    ready = deque(sorted(
        [sid for sid, deg in in_degree.items() if deg == 0],
        key=lambda sid: (_phase(sid), _priority(sid))
    ))
    order = []

    while ready:
        sid = ready.popleft()
        order.append(scene_map[sid])
        children = sorted(graph[sid], key=lambda c: (_phase(c), _priority(c)))
        for child in children:
            in_degree[child] -= 1
            if in_degree[child] == 0:
                ready.append(child)

    if len(order) != len(scenes):
        raise ValueError("순환 의존성 감지. depends_on / chain_from 관계를 확인하세요.")

    return order


def run_batch(scenes: list, client, parallel: int = 1,
              variants: int = 1, out_dir: str = DEFAULT_OUT_DIR,
              fixed_seed: bool = False) -> dict:
    """
    씬 목록을 순서대로 실행.
    variants > 1이면 각 씬을 N가지 seed로 반복 생성.
    반환: {scene_id: [로컬_파일_경로, ...]}
    """
    try:
        ordered = resolve_execution_order(scenes)
    except ValueError as e:
        print(f"Error resolving order: {e}")
        ordered = scenes

    outputs = {}   # scene_id → 가장 최근 생성 파일 경로 (체이닝용)
    results = {}   # scene_id → [variant 파일 경로 목록]

    for scene in ordered:
        scene_id = scene["id"]
        scene_type = scene.get("scene_type") or infer_scene_type(scene)
        source = scene.get("_source", "unknown")
        style_w, comp_w = normalize_weights(scene, scene_type)

        # 부모 출력 (chain/depends_on 체이닝)
        parent_id = scene.get("depends_on") or scene.get("chain_from")
        chain_output = outputs.get(parent_id) if parent_id else None

        variant_paths = []

        for v in range(variants):
            seed = scene.get("seed", 0) if fixed_seed else random.randint(1, 1125899906842624)
            prefix = f"{out_dir}/{source}_{scene_id}_{seed}"

            wf = copy.deepcopy(load_workflow(scene_type))

            # 레퍼런스 결정: 체인 출력 > composition_ref > style_ref
            if chain_output and scene.get("use_prev_output", scene.get("chain_from")):
                alias = f"_chain_{scene_id}_v{v}.png"
                ref_file = copy_output_as_ref(chain_output, alias)
            else:
                ref_path = scene.get("style_ref", "")
                ref_file = prepare_ref_image(ref_path) if ref_path else None

            wf = inject_params(wf, scene, seed, style_w, comp_w, ref_file, prefix)

            print(f"  [{scene_id}] v{v+1}/{variants} | type={scene_type} | seed={seed}")
            try:
                resp = client.queue_prompt(wf)
                prompt_id = resp.get("prompt_id", "")
                if prompt_id:
                    client.wait_for_prompt(prompt_id)
                local_path = collect_output(prefix, scene_id, TEMP_DIR)
                if local_path:
                    variant_paths.append(local_path)
                    outputs[scene_id] = local_path  # 마지막 성공본 저장
            except Exception as e:
                print(f"  Failed [{scene_id}] v{v+1}: {e}")

        results[scene_id] = variant_paths

    return results
