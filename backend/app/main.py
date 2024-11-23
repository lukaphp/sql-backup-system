from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from typing import List
import uvicorn

app = FastAPI(title="SQL Backup System API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes will be imported here
from app.api import auth, backups, storage, monitoring

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(backups.router, prefix="/api/backups", tags=["Backups"])
app.include_router(storage.router, prefix="/api/storage", tags=["Storage"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])

@app.get("/")
async def root():
    return {"message": "SQL Backup System API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
