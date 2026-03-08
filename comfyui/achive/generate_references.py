import json
import urllib.request
import os
import glob
import random
import shutil
import time

# ComfyUI API
COMFYUI_URL = "http://127.0.0.1:8188"

# 레퍼런스 전용 워크플로우 (SD 1.5)
WORKFLOW_FILE = "comfyui/workflow/sd15_reference.json"

# *_refs.json 파일만 읽음
PROMPT_DIR = "comfyui/prompt"

# 출력 경로
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"
PROJECT_REF_DIR     = "comfyui/images/ref"

os.makedirs(PROJECT_REF_DIR, exist_ok=True)


def queue_prompt(workflow):
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_and_copy(filename_prefix, ref_id, timeout=60):
    """ComfyUI output 폴링 후 ref 폴더에 고정 파일명으로 저장."""
    pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    print(f"  Waiting for [{ref_id}]...", end="", flush=True)
    start = time.time()
    while time.time() - start < timeout:
        files = glob.glob(pattern)
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            dest = os.path.join(PROJECT_REF_DIR, f"{ref_id}.png")
            time.sleep(1)
            shutil.copy2(files[0], dest)
            print(f" -> {dest}")
            return dest
        print(".", end="", flush=True)
        time.sleep(2)
    print(f" TIMEOUT ({timeout}s)")
    return None


def load_refs(directory):
    """prompt/ 디렉토리에서 *_refs.json 파일만 로드."""
    refs = []
    for path in glob.glob(os.path.join(directory, "*_refs.json")):
        source = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                if item.get("is_reference"):
                    item["_source"] = source
                    refs.append(item)
        except Exception as e:
            print(f"Error loading {path}: {e}")
    return refs


def main():
    if not os.path.exists(WORKFLOW_FILE):
        print(f"Error: workflow not found: {WORKFLOW_FILE}")
        return

    with open(WORKFLOW_FILE, "r", encoding="utf-8") as f:
        base_workflow = json.load(f)

    refs = load_refs(PROMPT_DIR)
    if not refs:
        print("No reference entries found in *_refs.json files.")
        return

    print(f"=== Reference Generation ===")
    print(f"Refs: {len(refs)} | Workflow: {WORKFLOW_FILE}")
    print()

    for i, ref in enumerate(refs):
        ref_id = ref["id"]
        workflow = json.loads(json.dumps(base_workflow))

        neg_default = (
            "(low quality, worst quality:1.4), text, watermark, blurry, distorted, "
            "extra limbs, bad anatomy, (cartoon, anime, 3d, render:1.3)"
        )

        workflow["5"]["inputs"]["text"] = ref["prompt"]
        workflow["6"]["inputs"]["text"] = ref.get("negative_prompt", neg_default)
        workflow["1"]["inputs"]["seed"]  = random.randint(1, 10**15)
        workflow["3"]["inputs"]["filename_prefix"] = f"REF_GEN_{ref_id}"

        print(f"[{i+1}/{len(refs)}] Generating: {ref_id}")
        try:
            queue_prompt(workflow)
            wait_and_copy(f"REF_GEN_{ref_id}", ref_id)
        except Exception as e:
            print(f"  Failed: {e}")

    print(f"\nDone! {len(refs)} references generated.")


if __name__ == "__main__":
    main()
