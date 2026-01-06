import json
import re
from typing import Optional, Dict, Any
from recipe_scrapers import scrape_html
import requests
from bs4 import BeautifulSoup


def extract_from_website(url: str) -> Optional[Dict[str, Any]]:
    """Extract recipe from a website URL using recipe-scrapers library."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        html = response.text
        
        # Try recipe-scrapers first
        try:
            scraper = scrape_html(html, org_url=url)
            
            recipe = {
                "title": scraper.title() if hasattr(scraper, 'title') else "Unknown Recipe",
                "ingredients": scraper.ingredients() if hasattr(scraper, 'ingredients') else [],
                "instructions": scraper.instructions_list() if hasattr(scraper, 'instructions_list') else [scraper.instructions()] if hasattr(scraper, 'instructions') else [],
                "prep_time": str(scraper.prep_time()) if hasattr(scraper, 'prep_time') and scraper.prep_time() else None,
                "cook_time": str(scraper.cook_time()) if hasattr(scraper, 'cook_time') and scraper.cook_time() else None,
                "total_time": str(scraper.total_time()) if hasattr(scraper, 'total_time') and scraper.total_time() else None,
                "servings": str(scraper.yields()) if hasattr(scraper, 'yields') and scraper.yields() else None,
                "image_url": scraper.image() if hasattr(scraper, 'image') else None,
                "source_url": url,
                "source_type": "website"
            }
            
            # Clean up empty instructions
            if recipe["instructions"] and isinstance(recipe["instructions"], list):
                recipe["instructions"] = [i.strip() for i in recipe["instructions"] if i and i.strip()]
            
            return recipe
            
        except Exception as e:
            print(f"recipe-scrapers failed: {e}")
            # Fall back to JSON-LD extraction
            return extract_json_ld(html, url)
            
    except Exception as e:
        print(f"Website extraction error: {e}")
        return None


def extract_json_ld(html: str, url: str) -> Optional[Dict[str, Any]]:
    """Extract recipe from JSON-LD structured data."""
    try:
        soup = BeautifulSoup(html, 'html.parser')
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Handle @graph structure
                if isinstance(data, dict) and '@graph' in data:
                    data = data['@graph']
                
                # Find recipe in list
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get('@type') in ['Recipe', 'recipe']:
                            data = item
                            break
                
                if isinstance(data, dict) and data.get('@type') in ['Recipe', 'recipe']:
                    ingredients = data.get('recipeIngredient', [])
                    instructions = data.get('recipeInstructions', [])
                    
                    # Parse instructions
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
                    
                    return {
                        "title": data.get('name', 'Unknown Recipe'),
                        "ingredients": ingredients,
                        "instructions": parsed_instructions,
                        "prep_time": data.get('prepTime'),
                        "cook_time": data.get('cookTime'),
                        "total_time": data.get('totalTime'),
                        "servings": data.get('recipeYield'),
                        "image_url": data.get('image', [None])[0] if isinstance(data.get('image'), list) else data.get('image'),
                        "source_url": url,
                        "source_type": "website"
                    }
                    
            except json.JSONDecodeError:
                continue
                
        return None
        
    except Exception as e:
        print(f"JSON-LD extraction error: {e}")
        return None
