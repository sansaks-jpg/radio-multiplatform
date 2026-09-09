from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'restream_config.json')

def get_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            try:
                return json.load(f)
            except:
                pass
    return {"youtube_enabled": False, "youtube_key": ""}

@app.route('/config', methods=['GET'])
def read_config():
    return jsonify(get_config())

@app.route('/config', methods=['POST'])
def update_config():
    data = request.json
    config = get_config()
    
    if "youtube_enabled" in data:
        config["youtube_enabled"] = data["youtube_enabled"]
    if "youtube_key" in data:
        config["youtube_key"] = data["youtube_key"]
        
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)
        
    return jsonify({"status": "success", "config": config})

if __name__ == '__main__':
    # Listen on all interfaces so Next.js API can POST to it
    app.run(host='0.0.0.0', port=8092)
