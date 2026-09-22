#!/usr/bin/env python3
"""
PDF Unlock Server using pikepdf
Run with: python unlock_server.py
Then open http://localhost:8000 in your browser or use the app.
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response
import pikepdf
import io
import uvicorn

app = FastAPI(title="PDF Unlock API")

@app.post("/unlock-pdf")
async def unlock_pdf(
    file: UploadFile = File(...),
    password: str = Form("")
):
    try:
        pdf_bytes = await file.read()
        
        # Open with password (empty string tries without password)
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password) as pdf:
            output = io.BytesIO()
            pdf.save(output)
            output.seek(0)
            pdf_data = output.read()
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{file.filename.replace(".pdf", "_desbloqueado.pdf")}"'
            }
        )
    except Exception as e:
        return Response(
            content=str(e).encode(),
            media_type="text/plain",
            status_code=400
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
