from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from ..models.card import CardCondition

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CardBase(BaseModel):
    external_id: str
    name: str
    set_name: str
    set_code: str
    number: str
    rarity: Optional[str] = None
    image_url: Optional[str] = None

class Card(CardBase):
    id: int

    class Config:
        from_attributes = True

class InventoryBase(BaseModel):
    card_id: int
    condition: CardCondition = CardCondition.NM
    language: str = "pt"
    price_paid: Optional[float] = None
    price_suggested: Optional[float] = None
    location_physical: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class Inventory(InventoryBase):
    id: int
    owner_id: int
    created_at: datetime
    card: Card

    class Config:
        from_attributes = True
