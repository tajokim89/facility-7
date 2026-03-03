import json
import urllib.request
import os
import glob
import argparse
import random
import shutil
import time

# ComfyUI API
COMFYUI_URL = "http://127.0.0.1:8188"

# Workflow files (모두 workflow/ 하위)
WORKFLOW_SD15   = "comfyui/workflow/emotion.json"         # SD 1.5 base (fallback)
WORKFLOW_SDXL   = "comfyui/workflow/sdxl_scene.json"      # SDXL Direct (배경/환경)
WORKFLOW_OUTPAINT = "comfyui/workflow/sdxl_outpaint.json" # SDXL Outpaint (캐릭터/와이드)

# Prompt directory — *_refs.json 파일은 generate_references.py 담당, 여기서는 제외
PROMPT_DIR = "comfyui/prompt"

# ComfyUI 경로
COMFYUI_INPUT_DIR   = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"

# 프로젝트 출력 경로
PROJECT_TEMP_DIR = "comfyui/images/temp"
PROJECT_COMP_DIR = "comfyui/images/comp"

os.makedirs(PROJECT_TEMP_DIR, exist_ok=True)
os.makedirs(PROJECT_COMP_DIR, exist_ok=True)

WIDTH  = 1920
HEIGHT = 1080


def prepare_ref_image(file_path):
    """레퍼런스 이미지를 ComfyUI input 폴더로 복사하고 파일명 반환."""
    if not file_path:
        return None
    file_name = os.path.basename(file_path)
    target_path = os.path.join(COMFYUI_INPUT_DIR, file_name)

    for candidate in [file_path, os.path.join("comfyui", file_path)]:
        if os.path.isfile(candidate):
            if not os.path.exists(target_path):
                print(f"  Copy ref: {candidate} -> {target_path}")
                shutil.copy2(candidate, target_path)
            return file_name

    return file_name  # 없어도 이름만 반환 (ComfyUI에 이미 있을 수 있음)


def wait_and_copy(filename_prefix, scene_id, timeout=120):
    """ComfyUI output 폴더를 폴링해 생성된 이미지를 temp 폴더로 복사."""
    pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    print(f"  Waiting for [{scene_id}] output...", end="", flush=True)
    start = time.time()
    while time.time() - start < timeout:
        files = glob.glob(pattern)
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            latest = files[0]
            dest = os.path.join(PROJECT_TEMP_DIR, f"{scene_id}_{os.path.basename(latest)}")
            time.sleep(1)
            shutil.copy2(latest, dest)
            print(f" -> {dest}")
            return dest
        print(".", end="", flush=True)
        time.sleep(3)
    print(f" TIMEOUT ({timeout}s)")
    return None


def load_scenes(directory):
    """prompt/ 디렉토리에서 씬 JSON 로드. *_refs.json 파일은 건너뜀."""
    scenes = []
    for path in glob.glob(os.path.join(directory, "*.json")):
        if path.endswith("_refs.json"):
            continue  # 레퍼런스 파일은 generate_references.py 담당
        source = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                print(f"Warning: {path} is not a list, skipping.")
                continue
            for scene in data:
                if scene.get("is_reference"):
                    continue  # refs는 generate_references.py 담당
                if scene.get("chain_from"):
                    continue  # 체인 씬은 generate_sequence.py 담당
                scene["_source"] = source
            scenes.extend(data)
        except Exception as e:
            print(f"Error loading {path}: {e}")
    return scenes


def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def select_workflow(scene, sdxl_wf, outpaint_wf):
    """씬 속성에 따라 적절한 워크플로우 선택."""
    has_char   = bool(scene.get("composition_ref"))
    use_outpaint = scene.get("use_outpaint", False)
    if has_char or use_outpaint:
        return json.loads(json.dumps(outpaint_wf)), "SDXL_OUTPAINT"
    return json.loads(json.dumps(sdxl_wf)), "SDXL_DIRECT"


def main():
    parser = argparse.ArgumentParser(description="ComfyUI 씬 이미지 생성기")
    parser.add_argument("--fixed",       action="store_true", help="JSON seed 고정 사용")
    parser.add_argument("--ids",         nargs="+",           help="생성할 씬 ID 목록 (예: S03 S08)")
    parser.add_argument("--weight",      type=float, default=0.8, help="IP-Adapter 기본 weight")
    parser.add_argument("--out_dir",     type=str, default="facility-7", help="ComfyUI output 하위 폴더명")
    args = parser.parse_args()

    # 워크플로우 로드
    for wf_path in [WORKFLOW_SDXL, WORKFLOW_OUTPAINT]:
        if not os.path.exists(wf_path):
            print(f"Error: workflow not found: {wf_path}")
            return

    with open(WORKFLOW_SDXL,    "r", encoding="utf-8") as f: sdxl_wf     = json.load(f)
    with open(WORKFLOW_OUTPAINT,"r", encoding="utf-8") as f: outpaint_wf = json.load(f)

    # 씬 로드 및 필터
    scenes = load_scenes(PROMPT_DIR)
    if args.ids:
        scenes = [s for s in scenes if s.get("id") in args.ids]
    if not scenes:
        print("No scenes found.")
        return

    seed_mode = "FIXED" if args.fixed else "RANDOM"
    print(f"=== Scene Generation ===")
    print(f"Scenes : {len(scenes)} | Seed: {seed_mode} | out_dir: {args.out_dir}")
    print()

    for i, scene in enumerate(scenes):
        scene_id = scene.get("id", "unknown")
        workflow, wf_type = select_workflow(scene, sdxl_wf, outpaint_wf)

        # 레퍼런스 이미지
        ref_path = scene.get("composition_ref") or scene.get("style_ref", "")
        ref_file = prepare_ref_image(ref_path)

        # Negative prompt
        neg_base = (
            "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy, "
            "(multiple subjects, duplicate:1.4)"
            if (scene.get("composition_ref") or scene.get("use_outpaint"))
            else "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy"
        )
        scene_neg = scene.get("negative_prompt", "")
        final_neg = f"{neg_base}, {scene_neg}" if scene_neg else neg_base

        # Prompt 주입
        workflow["10"]["inputs"]["text"] = scene.get("prompt", "")
        workflow["9"]["inputs"]["text"]  = final_neg

        # IP-Adapter
        if "14" in workflow:
            workflow["14"]["inputs"]["image"] = ref_file
        if "15" in workflow:
            has_char = bool(scene.get("composition_ref"))
            workflow["15"]["inputs"]["weight"] = scene.get("weight", args.weight if has_char else 0.5)

        # Seed
        seed = scene.get("seed", 0) if args.fixed else random.randint(1, 1125899906842624)
        if "6"  in workflow: workflow["6"]["inputs"]["seed"]  = seed
        if "20" in workflow: workflow["20"]["inputs"]["seed"] = seed + 1

        # 파일명 prefix
        source = scene.get("_source", "unknown")
        prefix = f"{args.out_dir}/{source}_{scene_id}_{seed}"
        if "12" in workflow:
            workflow["12"]["inputs"]["filename_prefix"] = prefix

        weight_val = workflow.get("15", {}).get("inputs", {}).get("weight", "-")
        print(f"[{i+1}/{len(scenes)}] {scene_id} | {wf_type} | ref={ref_file} | weight={weight_val}")

        try:
            queue_prompt(workflow)
            wait_and_copy(prefix, scene_id)
        except Exception as e:
            print(f"  Failed: {e}")

    print(f"\nDone! {len(scenes)} scenes queued.")


if __name__ == "__main__":
    main()
