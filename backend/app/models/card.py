from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base

class CardCondition(str, enum.Enum):
    MT = "MT"
    NM = "NM"
    LP = "LP"
    MP = "MP"
    HP = "HP"
    DMG = "DMG"

class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, index=True) # ID from pokemontcg.io
    name = Column(String, index=True)
    set_name = Column(String, index=True)
    set_code = Column(String, index=True)
    number = Column(String)
    rarity = Column(String)
    image_url = Column(String)
    
    inventory_items = relationship("Inventory", back_populates="card")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    condition = Column(Enum(CardCondition), default=CardCondition.NM)
    language = Column(String, default="pt")
    price_paid = Column(Float, nullable=True)
    price_suggested = Column(Float, nullable=True)
    location_physical = Column(String) # e.g., "Pasta 1, Pag 2"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    card = relationship("Card", back_populates="inventory_items")
