import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db, init_db, User, SavedRecipe
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    get_optional_user
)
from schemas import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    RecipeExtractRequest,
    RecipeResponse,
    SaveRecipeRequest,
    SavedRecipeResponse
)
from extractors import extract_from_website, extract_from_video, is_video_url
from extractors.ai_parser import parse_recipe_with_ai

app = FastAPI(
    title="Recipe Extractor API",
    description="Extract recipes from websites and videos",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


# ==================== AUTH ROUTES ====================

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== RECIPE EXTRACTION ROUTES ====================

@app.post("/api/extract", response_model=RecipeResponse)
async def extract_recipe(request: RecipeExtractRequest):
    url = request.url.strip()
    
    if not url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL is required"
        )
    
    try:
        if is_video_url(url):
            # Extract from video
            video_data = extract_from_video(url)
            
            if not video_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract video information"
                )
            
            # Combine transcript and description for AI parsing
            text_content = ""
            if video_data.get('transcript'):
                text_content += video_data['transcript']
            if video_data.get('description'):
                text_content += "\n\n" + video_data['description']
            
            if not text_content.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No transcript or description available for this video"
                )
            
            # Parse with AI
            recipe = parse_recipe_with_ai(
                text_content, 
                video_data.get('title', ''),
                video_data.get('platform', 'video')
            )
            
            if not recipe or "error" in recipe:
                error_msg = recipe.get("error", "Could not extract recipe from video") if recipe else "AI parsing failed"
                return RecipeResponse(
                    title="",
                    ingredients=[],
                    instructions=[],
                    source_url=url,
                    source_type="video",
                    error=error_msg
                )
            
            return RecipeResponse(
                title=recipe.get("title", video_data.get("title", "Video Recipe")),
                ingredients=recipe.get("ingredients", []),
                instructions=recipe.get("instructions", []),
                prep_time=recipe.get("prep_time"),
                cook_time=recipe.get("cook_time"),
                servings=recipe.get("servings"),
                image_url=video_data.get("thumbnail"),
                source_url=url,
                source_type="video",
                platform=video_data.get("platform"),
                tips=recipe.get("tips", [])
            )
            
        else:
            # Extract from website
            recipe = extract_from_website(url)
            
            if not recipe:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract recipe from this website. The page may not contain a valid recipe."
                )
            
            return RecipeResponse(
                title=recipe.get("title", "Unknown Recipe"),
                ingredients=recipe.get("ingredients", []),
                instructions=recipe.get("instructions", []),
                prep_time=recipe.get("prep_time"),
                cook_time=recipe.get("cook_time"),
                total_time=recipe.get("total_time"),
                servings=recipe.get("servings"),
                image_url=recipe.get("image_url"),
                source_url=url,
                source_type="website"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract recipe: {str(e)}"
        )


# ==================== SAVED RECIPES ROUTES ====================

@app.post("/api/recipes/save", response_model=SavedRecipeResponse)
async def save_recipe(
    recipe_data: SaveRecipeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = SavedRecipe(
        title=recipe_data.title,
        source_url=recipe_data.source_url,
        image_url=recipe_data.image_url,
        ingredients=json.dumps(recipe_data.ingredients),
        instructions=json.dumps(recipe_data.instructions),
        prep_time=recipe_data.prep_time,
        cook_time=recipe_data.cook_time,
        servings=recipe_data.servings,
        user_id=current_user.id
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    
    return SavedRecipeResponse(
        id=recipe.id,
        title=recipe.title,
        source_url=recipe.source_url,
        image_url=recipe.image_url,
        ingredients=json.loads(recipe.ingredients),
        instructions=json.loads(recipe.instructions),
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        servings=recipe.servings,
        created_at=recipe.created_at
    )


@app.get("/api/recipes", response_model=List[SavedRecipeResponse])
async def get_saved_recipes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipes = db.query(SavedRecipe).filter(
        SavedRecipe.user_id == current_user.id
    ).order_by(SavedRecipe.created_at.desc()).all()
    
    return [
        SavedRecipeResponse(
            id=r.id,
            title=r.title,
            source_url=r.source_url,
            image_url=r.image_url,
            ingredients=json.loads(r.ingredients),
            instructions=json.loads(r.instructions),
            prep_time=r.prep_time,
            cook_time=r.cook_time,
            servings=r.servings,
            created_at=r.created_at
        )
        for r in recipes
    ]


@app.get("/api/recipes/{recipe_id}", response_model=SavedRecipeResponse)
async def get_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == current_user.id
    ).first()
    
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
    
    return SavedRecipeResponse(
        id=recipe.id,
        title=recipe.title,
        source_url=recipe.source_url,
        image_url=recipe.image_url,
        ingredients=json.loads(recipe.ingredients),
        instructions=json.loads(recipe.instructions),
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        servings=recipe.servings,
        created_at=recipe.created_at
    )


@app.delete("/api/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(SavedRecipe).filter(
        SavedRecipe.id == recipe_id,
        SavedRecipe.user_id == current_user.id
    ).first()
    
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
    
    db.delete(recipe)
    db.commit()
    
    return {"message": "Recipe deleted successfully"}


# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
