from http.server import BaseHTTPRequestHandler
import json
import os
import re
import requests
from bs4 import BeautifulSoup

# Recipe extraction logic
def extract_from_website(url: str):
    """Extract recipe from a website URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        html = response.text
        
        # Try JSON-LD extraction
        soup = BeautifulSoup(html, 'html.parser')
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                if isinstance(data, dict) and '@graph' in data:
                    data = data['@graph']
                
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') in ['Recipe', 'recipe']:
                            data = item
                            break
                
                if isinstance(data, dict) and data.get('@type') in ['Recipe', 'recipe']:
                    ingredients = data.get('recipeIngredient', [])
                    instructions = data.get('recipeInstructions', [])
                    
                    parsed_instructions = []
                    if isinstance(instructions, list):
                        for inst in instructions:
                            if isinstance(inst, str):
                                parsed_instructions.append(inst)
                            elif isinstance(inst, dict):
                                text = inst.get('text', inst.get('name', ''))
                                if text:
                                    parsed_instructions.append(text)
                    elif isinstance(instructions, str):
                        parsed_instructions = [instructions]
                    
                    image = data.get('image')
                    if isinstance(image, list):
                        image = image[0] if image else None
                    
                    return {
                        "title": data.get('name', 'Unknown Recipe'),
                        "ingredients": ingredients,
                        "instructions": parsed_instructions,
                        "prep_time": data.get('prepTime'),
                        "cook_time": data.get('cookTime'),
                        "total_time": data.get('totalTime'),
                        "servings": str(data.get('recipeYield', '')) if data.get('recipeYield') else None,
                        "image_url": image,
                        "source_url": url,
                        "source_type": "website"
                    }
            except json.JSONDecodeError:
                continue
        
        return None
    except Exception as e:
        print(f"Extraction error: {e}")
        return None


def is_video_url(url: str) -> bool:
    """Check if URL is from a video platform."""
    video_patterns = [
        r'youtube\.com', r'youtu\.be', r'tiktok\.com',
        r'instagram\.com/reel', r'instagram\.com/p/', r'vimeo\.com',
    ]
    for pattern in video_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            return True
    return False


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            url = data.get('url', '').strip()
            
            if not url:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "URL is required"}).encode())
                return
            
            if is_video_url(url):
                # Video extraction requires OpenAI - return message
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "title": "Video Recipe",
                    "ingredients": [],
                    "instructions": [],
                    "source_url": url,
                    "source_type": "video",
                    "error": "Video extraction requires OpenAI API. Please use recipe websites for the hosted version, or run locally for video support."
                }).encode())
                return
            
            recipe = extract_from_website(url)
            
            if not recipe:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "title": "",
                    "ingredients": [],
                    "instructions": [],
                    "source_url": url,
                    "source_type": "website",
                    "error": "Could not extract recipe from this website."
                }).encode())
                return
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(recipe).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
