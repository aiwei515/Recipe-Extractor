import json
from typing import Optional, Dict, Any
from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

RECIPE_EXTRACTION_PROMPT = """You are a recipe extraction expert. Analyze the following text (which may be a video transcript, description, or webpage content) and extract the recipe information.

Return a JSON object with the following structure:
{
    "title": "Recipe name",
    "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
    "instructions": ["step 1", "step 2", ...],
    "prep_time": "prep time if mentioned, or null",
    "cook_time": "cook time if mentioned, or null",
    "servings": "servings if mentioned, or null",
    "tips": ["any tips or notes mentioned"]
}

Important rules:
1. Include EXACT quantities for all ingredients (e.g., "2 cups flour", "1 tbsp olive oil")
2. If quantities are unclear, estimate based on context or note "to taste"
3. Instructions should be clear, numbered steps
4. Preserve the original cooking techniques and methods
5. If the text doesn't contain a recipe, return {"error": "No recipe found"}

Text to analyze:
"""


def parse_recipe_with_ai(text: str, title: str = "", platform: str = "unknown") -> Optional[Dict[str, Any]]:
    """Use AI to parse unstructured text into a recipe format."""
    if not client:
        return {
            "error": "OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file."
        }
    
    if not text or len(text.strip()) < 50:
        return {
            "error": "Not enough text content to extract a recipe."
        }
    
    try:
        # Combine title and text for better context
        full_text = f"Title: {title}\n\nContent:\n{text[:8000]}"  # Limit text length
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that extracts recipe information from text. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": RECIPE_EXTRACTION_PROMPT + full_text
                }
            ],
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        if "error" in result:
            return result
            
        # Add metadata
        result["source_type"] = "video"
        result["platform"] = platform
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"error": "Failed to parse AI response"}
    except Exception as e:
        print(f"AI parsing error: {e}")
        return {"error": f"AI processing failed: {str(e)}"}


def enhance_website_recipe(recipe: Dict[str, Any]) -> Dict[str, Any]:
    """Use AI to enhance/clean up a website-extracted recipe if needed."""
    if not client:
        return recipe
    
    # If recipe already looks good, return as-is
    if recipe.get("ingredients") and recipe.get("instructions"):
        if len(recipe["ingredients"]) > 2 and len(recipe["instructions"]) > 1:
            return recipe
    
    # Otherwise, try to enhance with AI
    try:
        text = f"""
Recipe Title: {recipe.get('title', 'Unknown')}
Ingredients: {json.dumps(recipe.get('ingredients', []))}
Instructions: {json.dumps(recipe.get('instructions', []))}
"""
        enhanced = parse_recipe_with_ai(text, recipe.get('title', ''), 'website')
        
        if enhanced and "error" not in enhanced:
            # Merge enhanced data
            recipe["ingredients"] = enhanced.get("ingredients", recipe.get("ingredients", []))
            recipe["instructions"] = enhanced.get("instructions", recipe.get("instructions", []))
            
    except Exception as e:
        print(f"Enhancement error: {e}")
    
    return recipe
