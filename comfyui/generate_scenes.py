import json
import urllib.request
import urllib.parse
import os
import glob
import argparse
import random
import shutil
import time

# ComfyUI API Address
COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "comfyui/emotion.json"
PROMPT_DIR = "comfyui/prompt"

# --- NEW: Paths for Auto-Copy ---
COMFYUI_INPUT_DIR = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"
PROJECT_TEMP_DIR = "comfyui/images/temp"
PROJECT_COMP_DIR = "comfyui/images/comp"

# Ensure project directories exist
os.makedirs(PROJECT_TEMP_DIR, exist_ok=True)
os.makedirs(PROJECT_COMP_DIR, exist_ok=True)

# Stable High Resolution (FHD)
WIDTH = 1920
HEIGHT = 1080

# Aesthetic: "Clinical Photography" - Extremely high detail, realistic skin, cinematic lighting.
REF_NEGATIVE_PROMPT = "(semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime:1.4), text, cropped, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, blurry, dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck"
SCENE_NEGATIVE_PROMPT = REF_NEGATIVE_PROMPT + ", close up"

def prepare_style_ref(file_path):
    """Ensures the style reference image exists in ComfyUI's input directory."""
    if not file_path:
        return None
        
    file_name = os.path.basename(file_path)
    target_path = os.path.join(COMFYUI_INPUT_DIR, file_name)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        if not os.path.exists(target_path):
            print(f"Copying {file_path} -> {target_path}")
            shutil.copy2(file_path, target_path)
        return file_name
    
    local_search_paths = [".", "comfyui", "comfyui/input"]
    for p in local_search_paths:
        local_path = os.path.join(p, file_path)
        if os.path.exists(local_path) and os.path.isfile(local_path):
            if not os.path.exists(target_path):
                print(f"Copying local {local_path} -> {target_path}")
                shutil.copy2(local_path, target_path)
            return file_name
            
    return file_name

def wait_and_copy_output(filename_prefix, scene_id):
    """Waits for the image to be generated and copies it to the project's temp folder."""
    # ComfyUI appends _00001, _00002 etc. to the prefix
    search_pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    print(f"Waiting for {scene_id} output...")
    
    timeout = 120 # 2 minutes
    start_time = time.time()
    while time.time() - start_time < timeout:
        files = glob.glob(search_pattern)
        if files:
            # Sort by modification time to get the latest if multiple exist
            files.sort(key=os.path.getmtime, reverse=True)
            latest_file = files[0]
            target_name = f"{scene_id}_{os.path.basename(latest_file)}"
            target_path = os.path.join(PROJECT_TEMP_DIR, target_name)
            
            # Small delay to ensure file is fully written
            time.sleep(1)
            shutil.copy2(latest_file, target_path)
            print(f"Captured: {target_path}")
            return target_path
        time.sleep(3)
    print(f"Timeout waiting for {scene_id}")
    return None

def load_scenes_from_dir(directory):
    """Loads all scenes from JSON files in the specified directory."""
    all_scenes = []
    json_files = glob.glob(os.path.join(directory, "*.json"))
    
    for file_path in json_files:
        # Get filename without extension for output prefix
        file_name = os.path.splitext(os.path.basename(file_path))[0]
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                scenes = json.load(f)
                if isinstance(scenes, list):
                    for scene in scenes:
                        scene['_source_file'] = file_name  # Store source filename
                    all_scenes.extend(scenes)
                else:
                    print(f"Warning: {file_path} is not a list of scenes. Skipping.")
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            
    return all_scenes

def queue_prompt(prompt_workflow):
    p = {"prompt": prompt_workflow}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    parser = argparse.ArgumentParser(description="Queue prompts for ComfyUI from JSON files.")
    parser.add_argument("--fixed", action="store_true", help="Use fixed seeds from JSON instead of random seeds.")
    parser.add_argument("--ids", nargs="+", help="Specific scene IDs to queue (e.g., S01 S02).")
    parser.add_argument("--weight", type=float, default=0.8, help="IP-Adapter weight (default: 0.8).")
    parser.add_argument("--weight_type", type=str, default="standard", choices=["standard", "prompt is more important", "style transfer"], help="IP-Adapter weight type (default: standard).")
    parser.add_argument("--style_ref", type=str, default="style_reference.png", help="Default style reference image filename (Tone).")
    parser.add_argument("--comp_ref", type=str, default="", help="Default composition reference image filename (Character/Person).")
    parser.add_argument("--out_dir", type=str, default="facility-7", help="Subfolder in ComfyUI output directory.")
    args = parser.parse_args()

    if not os.path.exists(WORKFLOW_FILE):
        print(f"Error: {WORKFLOW_FILE} not found.")
        return

    if not os.path.exists(PROMPT_DIR):
        print(f"Error: Prompt directory {PROMPT_DIR} not found.")
        return

    scenes = load_scenes_from_dir(PROMPT_DIR)
    
    if args.ids:
        scenes = [s for s in scenes if s.get('id') in args.ids]
    
    if not scenes:
        print("No matching scenes found.")
        return

    with open(WORKFLOW_FILE, 'r', encoding='utf-8') as f:
        base_workflow = json.load(f)
        
    sdxl_workflow_file = "comfyui/sdxl_scene.json"
    if os.path.exists(sdxl_workflow_file):
        with open(sdxl_workflow_file, 'r', encoding='utf-8') as f:
            sdxl_workflow = json.load(f)
    else:
        sdxl_workflow = base_workflow

    sdxl_out_file = "comfyui/sdxl_outpaint.json"
    if os.path.exists(sdxl_out_file):
        with open(sdxl_out_file, 'r', encoding='utf-8') as f:
            sdxl_out_workflow = json.load(f)
    else:
        sdxl_out_workflow = sdxl_workflow

    seed_mode = "FIXED (from JSON)" if args.fixed else "RANDOM"
    print(f"Queueing ALL {len(scenes)} scenes from {PROMPT_DIR}")
    print(f"Settings: FHD ({WIDTH}x{HEIGHT}), Seed Mode: {seed_mode}")
    print(f"Output Subfolder: {args.out_dir}")

    for i, scene in enumerate(scenes):
        scene_id = scene.get('id', '')
        is_ref = scene_id.startswith('REF_') or scene.get('is_reference', False)
        # Character scenes usually have a composition_ref (face)
        has_char = bool(scene.get('composition_ref'))
        use_outpaint = scene.get('use_outpaint', False)
        
        # Prepare References
        raw_ref = scene.get('composition_ref') or scene.get('style_ref', args.style_ref)
        current_ref = prepare_style_ref(raw_ref)
        
        if is_ref:
            workflow = json.loads(json.dumps(base_workflow)) # SD 1.5
            if "8" in workflow:
                workflow["8"]["inputs"]["width"] = 768
                workflow["8"]["inputs"]["height"] = 768
            if "15" in workflow:
                workflow["15"]["inputs"]["weight"] = 0.0
            print(f"Using BASE (SD 1.5) workflow for REFERENCE {scene_id}.")
            final_neg_text = REF_NEGATIVE_PROMPT
        elif has_char or use_outpaint:
            workflow = json.loads(json.dumps(sdxl_out_workflow)) # SDXL Outpaint
            mode_desc = "CHARACTER" if has_char else "OUTPAINT REQUESTED"
            print(f"Using SDXL OUTPAINT for {mode_desc} {scene_id} (Ensuring single subject focus).")
            final_neg_text = "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy, (multiple subjects, duplicate:1.4)"
        else:
            workflow = json.loads(json.dumps(sdxl_workflow)) # SDXL Direct Wide
            print(f"Using SDXL DIRECT for SCENE {scene_id}.")
            final_neg_text = "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy"

        # Update Prompts
        pos_prompt = scene.get('prompt', '')
        workflow["10"]["inputs"]["text"] = pos_prompt
        scene_neg = scene.get('negative_prompt', '')
        if scene_neg:
            final_neg_text = f"{final_neg_text}, {scene_neg}"
        workflow["9"]["inputs"]["text"] = final_neg_text
        
        # IP-Adapter Application
        if "14" in workflow:
            workflow["14"]["inputs"]["image"] = current_ref
        
        if "15" in workflow:
            # High weight for characters, lower for environment style
            workflow["15"]["inputs"]["weight"] = scene.get('weight', 0.8 if has_char else 0.5)
        
        # Handle Seed Logic
        if args.fixed:
            current_seed = scene.get('seed', 0)
        else:
            current_seed = random.randint(1, 1125899906842624)
        
        if "6" in workflow:
            workflow["6"]["inputs"]["seed"] = current_seed
        if "20" in workflow: # For outpaint KSampler
            workflow["20"]["inputs"]["seed"] = current_seed + 1

        # Update Filename Prefix (#12)
        source_file = scene.get('_source_file', 'unknown')
        if "12" in workflow:
            workflow["12"]["inputs"]["filename_prefix"] = f"{args.out_dir}/{source_file}_{scene_id}_{current_seed}"

        try:
            response = queue_prompt(workflow)
            prefix = workflow["12"]["inputs"]["filename_prefix"]
            print(f"[{i+1}/{len(scenes)}] Queued {scene_id} (Ref: {current_ref}, Weight: {workflow['15']['inputs']['weight']})")
            # Wait and copy to project temp folder
            wait_and_copy_output(prefix, scene_id)
        except Exception as e:
            print(f"Failed to queue {scene_id}: {e}")

    print(f"\nDone! All {len(scenes)} nodes are now in the ComfyUI queue.")

if __name__ == "__main__":
    main()
