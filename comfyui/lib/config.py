import os

# ComfyUI Connection
COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_WS_URL = "ws://127.0.0.1:8188/ws"

# Local ComfyUI Directories (Adjust if different)
COMFYUI_INPUT_DIR = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"

# Project Directories
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COMFYUI_DIR = os.path.join(PROJECT_ROOT, "comfyui")
PROMPT_DIR = os.path.join(COMFYUI_DIR, "prompt")
WORKFLOW_DIR = os.path.join(COMFYUI_DIR, "workflow")
IMAGES_DIR = os.path.join(COMFYUI_DIR, "images")
TEMP_DIR = os.path.join(IMAGES_DIR, "temp")
COMP_DIR = os.path.join(IMAGES_DIR, "comp")
REF_DIR = os.path.join(IMAGES_DIR, "ref")
MANIFEST_FILE = os.path.join(COMFYUI_DIR, "manifest.json")

# Default Workflow Files
WORKFLOWS = {
    "environment": "sdxl_scene.json",
    "character_scene": "sdxl_outpaint.json",
    "character_closeup": "sdxl_character_closeup.json",
    "macro": "sdxl_scene.json",
    "special": "sdxl_scene.json",
    "reference": "sd15_reference.json"
}

# Image Settings
WIDTH = 1920
HEIGHT = 1080
DEFAULT_OUT_DIR = "facility-7"

# Default Weights
DEFAULT_STYLE_WEIGHT = 0.4
DEFAULT_COMP_WEIGHT = 0.8
