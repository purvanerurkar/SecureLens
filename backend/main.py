from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.scanner import SecurityScanner


app = FastAPI(
    title="SecureLens AI",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    target_url: str


@app.get("/")
def root():
    return {
        "success": True,
        "message": "🛡️ SecureLens AI Backend Running",
        "version": "1.0.0"
    }


@app.get("/api/health")
def health():
    return {
        "success": True,
        "status": "healthy"
    }


@app.post("/api/scan")
def scan(request: ScanRequest):

    scanner = SecurityScanner(request.target_url)

    result = scanner.scan()

    return {
        "success": True,
        "scan": result
    }