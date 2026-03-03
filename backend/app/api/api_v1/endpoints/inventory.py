from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....core.database import get_db
from ....schemas import schemas
from ....models import card as card_models

router = APIRouter()

@router.get("/", response_model=List[schemas.Inventory])
def read_inventory(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    inventory = db.query(card_models.Inventory).offset(skip).limit(limit).all()
    return inventory

@router.post("/", response_model=schemas.Inventory)
def add_to_inventory(item: schemas.InventoryCreate, user_id: int, db: Session = Depends(get_db)):
    db_inventory = card_models.Inventory(**item.dict(), owner_id=user_id)
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory
