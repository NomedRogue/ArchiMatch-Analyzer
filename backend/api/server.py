import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .routes import router

app = FastAPI(title="ArchiMatch Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Harici modüllerin API endpointlerini ekle
app.include_router(router, prefix="/api")

# Frontend klasörünün tam yolunu al (Kök dizin -> frontend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend", "build")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "ArchiMatch Backend is running"}

# Statik frontend servisini (index.html vb.) doğrudan FastAPI üzerinden sun!
@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        return {"error": "Endpoint not found"}
        
    file_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA yönlendirmesi
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend build dosyaları bulunamadı. Lütfen npm run build komutunu çalıştırın."}


if __name__ == "__main__":
    import uvicorn
    # Local olarak çalıştırıldığında
    uvicorn.run("backend.api.server:app", host="127.0.0.1", port=8000, reload=True)
