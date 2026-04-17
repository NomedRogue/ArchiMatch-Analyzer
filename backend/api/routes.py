import os
import shutil
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from backend.core.excel_parser import ExcelProcessor

router = APIRouter()

# Uploads klasörünü oluştur
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.xls', '.xlsx', '.xlsm')):
        return JSONResponse(status_code=400, content={"message": "Geçersiz format. Lütfen .xls, .xlsx veya .xlsm formatında bir dosya yükleyin."})

    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        sonuc = await asyncio.to_thread(ExcelProcessor.process_file, file_path)

        if os.path.exists(file_path):
            os.remove(file_path)

        if sonuc.get("status") == "error":
            return JSONResponse(status_code=400, content={"message": sonuc.get("message")})

        return JSONResponse(content=sonuc)

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Beklenmeyen bir hata oluştu: {str(e)}"})

@router.post("/shutdown")
async def shutdown_system():
    os._exit(0)
    return {"message": "Kapanıyor"}
