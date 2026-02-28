from fastapi import FastAPI, UploadFile, File
import random
import asyncio

app = FastAPI(title="TCGHub AI Service", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Welcome to TCGHub AI Service v1.0"}

@app.post("/scan")
async def scan_card(file: UploadFile = File(...)):
    # Simulate processing time
    await asyncio.sleep(2)
    
    # Mock identification and grading
    cards = [
        {"name": "Charizard", "set": "Base Set", "set_code": "base1", "number": "4"},
        {"name": "Blastoise", "set": "Base Set", "set_code": "base1", "number": "2"},
        {"name": "Venusaur", "set": "Base Set", "set_code": "base1", "number": "15"},
    ]
    grades = ["MT", "NM", "LP", "MP", "HP", "DMG"]
    
    selected_card = random.choice(cards)
    selected_grade = random.choice(grades)
    confidence = round(random.uniform(0.85, 0.99), 2)
    
    return {
        "identified_card": selected_card,
        "suggested_grade": selected_grade,
        "confidence": confidence,
        "analysis": {
            "whitening": random.uniform(0, 0.2),
            "scratches": random.uniform(0, 0.1),
            "centering": random.uniform(0.45, 0.55)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
