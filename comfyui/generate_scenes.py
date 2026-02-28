import json
import urllib.request
import urllib.parse
import os
import glob
import argparse
import random

# ComfyUI API Address
COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "comfyui/emotion.json"
PROMPT_DIR = "comfyui/prompt"

# Stable High Resolution (FHD)
WIDTH = 1920
HEIGHT = 1080

# Aesthetic: "Clinical Horror" - Extremely clean, minimalist, but uncanny and terrifying.
NEGATIVE_PROMPT = "(low quality, worst quality:1.4), (bad anatomy), (deformed), (text, watermark, logo), (bright colors, cheerful), (cartoon, 2d, anime:1.2), blurry, messy, distorted, extra limbs, extra fingers, unrealistic, duplicate, morphed, tiling, border, frame, split screen, grid."

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
        workflow = json.load(f)

    seed_mode = "FIXED (from JSON)" if args.fixed else "RANDOM"
    print(f"Queueing ALL {len(scenes)} scenes from {PROMPT_DIR}")
    print(f"Settings: FHD ({WIDTH}x{HEIGHT}), Seed Mode: {seed_mode}")

    for i, scene in enumerate(scenes):
        # Update Resolution (#8)
        workflow["8"]["inputs"]["width"] = WIDTH
        workflow["8"]["inputs"]["height"] = HEIGHT

        # Update Positive Prompt (#10)
        workflow["10"]["inputs"]["text"] = scene.get('prompt', '')
        
        # Update Negative Prompt (#9)
        workflow["9"]["inputs"]["text"] = NEGATIVE_PROMPT
        
        # Handle Seed Logic
        if args.fixed:
            current_seed = scene.get('seed', 0)
        else:
            current_seed = random.randint(1, 1125899906842624)
        
        workflow["6"]["inputs"]["seed"] = current_seed

        # Update Filename Prefix (#12) - Format: {json파일명}_{신번호}_{시드번호}
        scene_id = scene.get('id', f'unknown_{i}')
        source_file = scene.get('_source_file', 'unknown')
        workflow["12"]["inputs"]["filename_prefix"] = f"{source_file}_{scene_id}_{current_seed}"

        try:
            response = queue_prompt(workflow)
            print(f"[{i+1}/{len(scenes)}] Queued Node {scene_id} (Seed: {current_seed})")
        except Exception as e:
            print(f"Failed to queue {scene_id}: {e}")

    print(f"\nDone! All {len(scenes)} nodes are now in the ComfyUI queue.")

if __name__ == "__main__":
    main()
