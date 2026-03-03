"""
generate_sequence.py — IP-Adapter 체이닝 씬 생성기

chain_from 필드가 있는 씬을 의존성 순서대로 실행합니다.
이전 씬의 출력 이미지가 다음 씬의 composition_ref로 자동 연결됩니다.

사용 예:
  python comfyui/generate_sequence.py                 # 전체 체인 씬
  python comfyui/generate_sequence.py --start S14     # 특정 씬부터
  python comfyui/generate_sequence.py --ids S15 S15a  # 특정 씬만
  python comfyui/generate_sequence.py --chain-weight 0.7  # 체인 IP-Adapter weight
"""

import json
import urllib.request
import os
import glob
import argparse
import random
import shutil
import time
from collections import defaultdict, deque

# ComfyUI API
COMFYUI_URL = "http://127.0.0.1:8188"

# 워크플로우 (체이닝은 항상 Outpaint 사용 — 인물 연속성 보장)
WORKFLOW_OUTPAINT = "comfyui/workflow/sdxl_outpaint.json"
WORKFLOW_SDXL     = "comfyui/workflow/sdxl_scene.json"

PROMPT_DIR          = "comfyui/prompt"
COMFYUI_INPUT_DIR   = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"
PROJECT_TEMP_DIR    = "comfyui/images/temp"

os.makedirs(PROJECT_TEMP_DIR, exist_ok=True)


# ── 유틸리티 ──────────────────────────────────────────────

def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def prepare_ref_image(file_path):
    """레퍼런스 이미지를 ComfyUI input 폴더로 복사하고 파일명 반환."""
    if not file_path:
        return None
    file_name = os.path.basename(file_path)
    target = os.path.join(COMFYUI_INPUT_DIR, file_name)
    for candidate in [file_path, os.path.join("comfyui", file_path)]:
        if os.path.isfile(candidate):
            if not os.path.exists(target):
                print(f"  Copy ref: {candidate} -> {target}")
                shutil.copy2(candidate, target)
            return file_name
    return file_name


def wait_and_copy(filename_prefix, scene_id, timeout=120):
    """ComfyUI output 폴링 후 temp에 저장. 저장된 경로 반환."""
    pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    print(f"  Waiting [{scene_id}]...", end="", flush=True)
    start = time.time()
    while time.time() - start < timeout:
        files = glob.glob(pattern)
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            dest = os.path.join(PROJECT_TEMP_DIR, f"{scene_id}_{os.path.basename(files[0])}")
            time.sleep(1)
            shutil.copy2(files[0], dest)
            print(f" -> {dest}")
            return dest
        print(".", end="", flush=True)
        time.sleep(3)
    print(f" TIMEOUT ({timeout}s)")
    return None


def copy_to_comfyui_input(local_path, alias_name):
    """생성된 이미지를 ComfyUI input 폴더에 복사해 다음 씬 ref로 사용."""
    if not local_path or not os.path.isfile(local_path):
        return None
    dest = os.path.join(COMFYUI_INPUT_DIR, alias_name)
    shutil.copy2(local_path, dest)
    return alias_name


# ── 의존성 그래프 ─────────────────────────────────────────

def build_graph(scenes):
    """
    chain_from 필드를 기반으로 의존성 그래프를 구성합니다.
    반환:
      - graph: {parent_id: [child_id, ...]}
      - in_degree: {scene_id: 의존하는 부모 수}
      - roots: 시작 씬 목록 (chain_from 없는 씬)
    """
    scene_map = {s["id"]: s for s in scenes}
    graph = defaultdict(list)
    in_degree = {s["id"]: 0 for s in scenes}

    for scene in scenes:
        parent_id = scene.get("chain_from")
        if parent_id:
            graph[parent_id].append(scene["id"])
            in_degree[scene["id"]] += 1

    roots = [sid for sid, deg in in_degree.items() if deg == 0]
    return graph, in_degree, roots, scene_map


def topological_sort(scenes):
    """Kahn 알고리즘으로 위상 정렬된 실행 순서 반환."""
    graph, in_degree, roots, scene_map = build_graph(scenes)
    queue = deque(sorted(roots))  # 알파벳순 정렬로 재현성 확보
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for child in sorted(graph[node]):
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)

    if len(order) != len(scenes):
        raise ValueError("순환 의존성(Cycle) 감지됨. chain_from 관계를 확인하세요.")

    return order, scene_map


# ── 씬 로딩 ───────────────────────────────────────────────

def load_chain_scenes(directory, filter_ids=None, start_id=None):
    """
    prompt/*.json 에서 chain_from 필드가 있는 씬만 로드.
    start_id 지정 시 해당 씬부터의 체인 전체를 포함.
    """
    all_scenes = {}
    for path in glob.glob(os.path.join(directory, "*.json")):
        if path.endswith("_refs.json"):
            continue
        source = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for scene in data:
                if not scene.get("is_reference"):
                    scene["_source"] = source
                    all_scenes[scene["id"]] = scene
        except Exception as e:
            print(f"Error loading {path}: {e}")

    # chain_from 있는 씬 + 그 부모(root) 포함
    chained = {sid: s for sid, s in all_scenes.items() if s.get("chain_from")}

    # start_id 기반 필터: 해당 씬을 루트로 하는 서브그래프만 추출
    if start_id:
        chained = _subgraph_from(start_id, all_scenes)

    # filter_ids 기반 필터 (체인 루트까지 자동 포함)
    if filter_ids:
        needed = set(filter_ids)
        for sid in list(filter_ids):
            _collect_ancestors(sid, all_scenes, needed)
        chained = {sid: all_scenes[sid] for sid in needed if sid in all_scenes}

    return list(chained.values())


def _subgraph_from(root_id, all_scenes):
    """root_id를 시작점으로 하는 체인 씬 전체 수집 (BFS)."""
    result = {}
    queue = deque([root_id])
    # 역방향 인덱스: parent → children
    children_of = defaultdict(list)
    for sid, scene in all_scenes.items():
        parent = scene.get("chain_from")
        if parent:
            children_of[parent].append(sid)

    while queue:
        cur = queue.popleft()
        if cur in all_scenes:
            result[cur] = all_scenes[cur]
        for child in children_of[cur]:
            queue.append(child)
    return result


def _collect_ancestors(scene_id, all_scenes, collected):
    """scene_id의 chain_from 조상을 재귀적으로 수집."""
    scene = all_scenes.get(scene_id)
    if not scene:
        return
    parent = scene.get("chain_from")
    if parent and parent not in collected:
        collected.add(parent)
        _collect_ancestors(parent, all_scenes, collected)


# ── 워크플로우 실행 ──────────────────────────────────────

def run_scene(scene, workflow_template, chain_output, chain_weight, fixed_seed, out_dir):
    """
    씬 하나를 생성합니다.
    chain_output: 이전 씬의 로컬 출력 파일 경로 (None이면 씬 자체 ref 사용)
    반환: 생성된 이미지의 로컬 경로 (다음 씬의 chain_output으로 전달)
    """
    scene_id = scene["id"]
    workflow = json.loads(json.dumps(workflow_template))

    # ── 레퍼런스 결정 ──
    # 우선순위: chain_output > composition_ref > style_ref
    if chain_output:
        # 이전 씬 출력을 ComfyUI input에 복사하고 사용
        chain_alias = f"_chain_{scene_id}.png"
        ref_file = copy_to_comfyui_input(chain_output, chain_alias)
        effective_weight = chain_weight
        ref_source = f"CHAIN({scene.get('chain_from')})"
    elif scene.get("composition_ref"):
        ref_file = prepare_ref_image(scene["composition_ref"])
        effective_weight = scene.get("weight", 0.8)
        ref_source = scene["composition_ref"]
    else:
        ref_file = prepare_ref_image(scene.get("style_ref", ""))
        effective_weight = scene.get("weight", 0.3)
        ref_source = scene.get("style_ref", "")

    # ── Negative prompt ──
    neg_base = "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy, (multiple subjects, duplicate:1.4)"
    scene_neg = scene.get("negative_prompt", "")
    final_neg = f"{neg_base}, {scene_neg}" if scene_neg else neg_base

    # ── 워크플로우 노드 주입 ──
    workflow["10"]["inputs"]["text"] = scene.get("prompt", "")
    workflow["9"]["inputs"]["text"]  = final_neg

    if "14" in workflow and ref_file:
        workflow["14"]["inputs"]["image"] = ref_file
    if "15" in workflow:
        workflow["15"]["inputs"]["weight"] = effective_weight

    seed = scene.get("seed", 0) if fixed_seed else random.randint(1, 1125899906842624)
    if "6"  in workflow: workflow["6"]["inputs"]["seed"]  = seed
    if "20" in workflow: workflow["20"]["inputs"]["seed"] = seed + 1

    source = scene.get("_source", "unknown")
    prefix = f"{out_dir}/{source}_{scene_id}_{seed}"
    if "12" in workflow:
        workflow["12"]["inputs"]["filename_prefix"] = prefix

    print(f"  Scene: {scene_id} | ref={ref_source} | weight={effective_weight:.2f} | seed={seed}")

    try:
        queue_prompt(workflow)
        return wait_and_copy(prefix, scene_id)
    except Exception as e:
        print(f"  Failed [{scene_id}]: {e}")
        return None


# ── 메인 ──────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="IP-Adapter 체이닝 씬 생성기")
    parser.add_argument("--start",        type=str,   help="이 씬부터 시작하는 체인 전체 실행 (예: S14)")
    parser.add_argument("--ids",          nargs="+",  help="특정 씬 ID만 실행 (조상 자동 포함)")
    parser.add_argument("--chain-weight", type=float, default=0.65,
                        help="체이닝 시 IP-Adapter weight (기본: 0.65)")
    parser.add_argument("--fixed",        action="store_true", help="JSON seed 고정 사용")
    parser.add_argument("--out_dir",      type=str, default="facility-7",
                        help="ComfyUI output 하위 폴더명")
    args = parser.parse_args()

    # 워크플로우 로드
    for path in [WORKFLOW_OUTPAINT, WORKFLOW_SDXL]:
        if not os.path.exists(path):
            print(f"Error: workflow not found: {path}")
            return
    with open(WORKFLOW_OUTPAINT, "r", encoding="utf-8") as f:
        outpaint_wf = json.load(f)
    with open(WORKFLOW_SDXL, "r", encoding="utf-8") as f:
        sdxl_wf = json.load(f)

    # 씬 로드 및 정렬
    scenes = load_chain_scenes(
        PROMPT_DIR,
        filter_ids=args.ids,
        start_id=args.start,
    )
    if not scenes:
        print("No chained scenes found.")
        print("  Hint: chain_from 필드가 있는 씬이 없습니다.")
        return

    try:
        exec_order, scene_map = topological_sort(scenes)
    except ValueError as e:
        print(f"Error: {e}")
        return

    print(f"=== Sequence Generation ===")
    print(f"Scenes : {len(exec_order)} | chain-weight: {args.chain_weight} | Seed: {'FIXED' if args.fixed else 'RANDOM'}")
    print(f"Order  : {' -> '.join(exec_order)}")
    print()

    # 실행: {scene_id: 출력 파일 경로}
    outputs = {}

    for idx, scene_id in enumerate(exec_order):
        scene = scene_map[scene_id]
        parent_id = scene.get("chain_from")
        chain_output = outputs.get(parent_id) if parent_id else None

        has_char = bool(scene.get("composition_ref")) or bool(chain_output)
        wf_template = outpaint_wf if has_char or scene.get("use_outpaint") else sdxl_wf

        print(f"[{idx+1}/{len(exec_order)}] {scene_id}" +
              (f" (chain from: {parent_id})" if parent_id else " (chain root)"))

        result = run_scene(
            scene       = scene,
            workflow_template = wf_template,
            chain_output  = chain_output,
            chain_weight  = args.chain_weight,
            fixed_seed    = args.fixed,
            out_dir       = args.out_dir,
        )
        if result:
            outputs[scene_id] = result
        else:
            print(f"  Warning: {scene_id} 생성 실패. 하위 체인에 영향을 줄 수 있습니다.")

    print(f"\nDone! {len(outputs)}/{len(exec_order)} scenes generated.")
    if len(outputs) < len(exec_order):
        failed = [sid for sid in exec_order if sid not in outputs]
        print(f"Failed: {', '.join(failed)}")


if __name__ == "__main__":
    main()
