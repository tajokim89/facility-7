import json
import urllib.request
import urllib.parse
import websocket
import uuid
import time
import os
import shutil
import glob
from .config import COMFYUI_URL, COMFYUI_WS_URL, COMFYUI_OUTPUT_ROOT, TEMP_DIR

class ComfyUIClient:
    def __init__(self, server_address=COMFYUI_URL, ws_address=COMFYUI_WS_URL):
        self.server_address = server_address
        self.ws_address = ws_address
        self.client_id = str(uuid.uuid4())
        self.ws = None
        
    def connect(self):
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(f"{self.ws_address}?clientId={self.client_id}")
            return True
        except Exception as e:
            print(f"WebSocket connection failed: {e}")
            self.ws = None
            return False

    def queue_prompt(self, prompt_workflow):
        p = {"prompt": prompt_workflow, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        req = urllib.request.Request(f"{self.server_address}/prompt", data=data)
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))

    def get_history(self, prompt_id):
        with urllib.request.urlopen(f"{self.server_address}/history/{prompt_id}") as response:
            return json.loads(response.read().decode('utf-8'))

    def wait_for_prompt(self, prompt_id, timeout=300):
        """Waits for a prompt to complete using WebSocket, with polling fallback."""
        start_time = time.time()
        
        if self.ws and self.ws.connected:
            print(f"Tracking prompt {prompt_id} via WebSocket...")
            while time.time() - start_time < timeout:
                try:
                    out = self.ws.recv()
                    if isinstance(out, str):
                        message = json.loads(out)
                        if message['type'] == 'executing':
                            data = message['data']
                            if data['node'] is None and data['prompt_id'] == prompt_id:
                                # Execution finished
                                return True
                except Exception as e:
                    print(f"WebSocket error during tracking: {e}")
                    break
        
        # Fallback to polling
        print(f"Polling for prompt {prompt_id} completion...")
        while time.time() - start_time < timeout:
            history = self.get_history(prompt_id)
            if prompt_id in history:
                return True
            time.sleep(5)
            
        return False

    def copy_outputs(self, prompt_id, scene_id, dest_dir=TEMP_DIR):
        """Retrieves history for prompt_id and copies generated images to dest_dir."""
        history = self.get_history(prompt_id).get(prompt_id, {})
        outputs = history.get('outputs', {})
        copied_files = []
        
        for node_id, node_output in outputs.items():
            if 'images' in node_output:
                for image in node_output['images']:
                    filename = image['filename']
                    subfolder = image.get('subfolder', '')
                    
                    # Search in output root
                    src_path = os.path.join(COMFYUI_OUTPUT_ROOT, subfolder, filename)
                    if not os.path.exists(src_path):
                        # Try searching recursively if subfolder logic is complex
                        search_pattern = os.path.join(COMFYUI_OUTPUT_ROOT, "**", filename)
                        found = glob.glob(search_pattern, recursive=True)
                        if found:
                            src_path = found[0]
                    
                    if os.path.exists(src_path):
                        target_name = f"{scene_id}_{filename}"
                        target_path = os.path.join(dest_dir, target_name)
                        os.makedirs(dest_dir, exist_ok=True)
                        shutil.copy2(src_path, target_path)
                        copied_files.append(target_path)
                        print(f"Saved: {target_path}")
                    else:
                        print(f"Warning: Could not find output image {filename} at {src_path}")
                        
        return copied_files
