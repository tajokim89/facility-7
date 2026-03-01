import json
import urllib.request
import os
import glob
import random
import shutil
import time

COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "comfyui/sd15_reference.json"
PROMPT_DIR = "comfyui/prompt"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"
PROJECT_REF_DIR = "comfyui/images/ref"

os.makedirs(PROJECT_REF_DIR, exist_ok=True)

def queue_prompt(prompt_workflow):
    p = {"prompt": prompt_workflow}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def wait_and_copy(filename_prefix, ref_id):
    search_pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    timeout = 60
    start_time = time.time()
    while time.time() - start_time < timeout:
        files = glob.glob(search_pattern)
        if files:
            files.sort(key=os.path.getmtime, reverse=True)
            latest = files[0]
            target_path = os.path.join(PROJECT_REF_DIR, f"{ref_id}.png")
            time.sleep(1)
            shutil.copy2(latest, target_path)
            print(f"Ref Updated: {target_path}")
            return target_path
        time.sleep(2)
    return None

def main():
    with open(WORKFLOW_FILE, 'r', encoding='utf-8') as f:
        workflow = json.load(f)

    json_files = glob.glob(os.path.join(PROMPT_DIR, "*.json"))
    for file_path in json_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            scenes = json.load(f)
            for scene in scenes:
                if scene.get('is_reference'):
                    ref_id = scene['id']
                    prompt = scene['prompt']
                    neg_prompt = scene.get('negative_prompt', "(low quality, worst quality:1.4), text, watermark, blurry, distorted, extra limbs, bad anatomy, (cartoon, anime, 3d, render:1.3)")
                    print(f"Generating Ref for {ref_id}...")
                    
                    workflow["5"]["inputs"]["text"] = prompt
                    workflow["6"]["inputs"]["text"] = neg_prompt
                    workflow["1"]["inputs"]["seed"] = random.randint(1, 10**15)
                    workflow["3"]["inputs"]["filename_prefix"] = f"REF_GEN_{ref_id}"
                    
                    queue_prompt(workflow)
                    wait_and_copy(f"REF_GEN_{ref_id}", ref_id)

if __name__ == "__main__":
    main()
