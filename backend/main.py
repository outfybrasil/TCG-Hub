from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api_v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

cors_origins = [
    origin.strip()
    for origin in settings.BACKEND_CORS_ORIGINS.split(',')
    if origin.strip()
]

# Restrict CORS to configured origins instead of wildcard credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Welcome to TCGHub API v1.0", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
