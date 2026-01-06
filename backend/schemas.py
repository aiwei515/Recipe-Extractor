from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Recipe schemas
class RecipeExtractRequest(BaseModel):
    url: str


class RecipeResponse(BaseModel):
    title: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    total_time: Optional[str] = None
    servings: Optional[str] = None
    image_url: Optional[str] = None
    source_url: str
    source_type: str
    platform: Optional[str] = None
    tips: Optional[List[str]] = None
    error: Optional[str] = None


class SaveRecipeRequest(BaseModel):
    title: str
    source_url: str
    image_url: Optional[str] = None
    ingredients: List[str]
    instructions: List[str]
    prep_time: Optional[str] = None
    cook_time: Optional[str] = None
    servings: Optional[str] = None


class SavedRecipeResponse(BaseModel):
    id: int
    title: str
    source_url: str
    image_url: Optional[str]
    ingredients: List[str]
    instructions: List[str]
    prep_time: Optional[str]
    cook_time: Optional[str]
    servings: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
