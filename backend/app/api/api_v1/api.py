from fastapi import APIRouter
from .endpoints import users, cards, inventory

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(cards.router, prefix="/cards", tags=["cards"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
