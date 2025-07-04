from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import logging
from typing import Optional
import json
import base64
import asyncio
from io import BytesIO
import wave

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Carbon Footprint Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
whisper_model = None
nlp = None

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    global whisper_model, nlp
    
    # Load Whisper model
    try:
        logger.info("Loading Whisper model...")
        import whisper
        whisper_model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully!")
    except ImportError:
        logger.error("Whisper not installed. Run: pip install openai-whisper")
        whisper_model = None
    except Exception as e:
        logger.error(f"Error loading Whisper model: {e}")
        whisper_model = None

    # Load spaCy model
    try:
        logger.info("Loading spaCy model...")
        import spacy
        nlp = spacy.load("en_core_web_sm")
        logger.info("spaCy model loaded successfully!")
    except ImportError:
        logger.error("spaCy not installed. Run: pip install spacy")
        nlp = None
    except OSError:
        logger.error("spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm")
        nlp = None
    except Exception as e:
        logger.error(f"Error loading spaCy model: {e}")
        nlp = None

    # Load utils functions
    try:
        global extract_activities, calculate_emissions
        from utils import extract_activities, calculate_emissions
        logger.info("Utils module loaded successfully!")
    except ImportError:
        logger.error("utils.py not found. Make sure it exists in the same directory.")
        raise Exception("utils.py module is required")
    except Exception as e:
        logger.error(f"Error loading utils module: {e}")
        raise Exception(f"Error loading utils module: {e}")

@app.get("/")
async def root():
    return {"message": "Carbon Footprint API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "whisper_loaded": whisper_model is not None,
        "spacy_loaded": nlp is not None,
        "models_ready": whisper_model is not None and nlp is not None
    }

def process_audio_data(audio_data: bytes) -> dict:
    """Process audio data and return results"""
    # Check if models are loaded
    if not whisper_model:
        raise HTTPException(
            status_code=500, 
            detail="Whisper model not loaded. Please check server logs and ensure whisper is installed."
        )
    
    if not nlp:
        raise HTTPException(
            status_code=500, 
            detail="spaCy model not loaded. Please check server logs and ensure spacy model is installed."
        )
    
    temp_audio_path = None
    try:
        logger.info(f"Processing audio data ({len(audio_data)} bytes)")
        
        # Validate data
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Audio data is empty")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_audio_path = temp_file.name
        
        logger.info(f"Saved temporary file: {temp_audio_path}")
        
        # Transcribe audio
        logger.info("Starting transcription...")
        try:
            result = whisper_model.transcribe(temp_audio_path)
            text = result["text"].strip()
            logger.info(f"Transcription completed: '{text}'")
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
        if not text:
            return {
                "transcription": "No speech detected",
                "activities": [],
                "emissions": []
            }
        
        # Extract activities
        logger.info("Extracting activities...")
        try:
            activities = extract_activities(text, nlp)
            logger.info(f"Found {len(activities)} activities: {activities}")
        except Exception as e:
            logger.error(f"Activity extraction failed: {e}")
            raise HTTPException(status_code=500, detail=f"Activity extraction failed: {str(e)}")
        
        # Calculate emissions
        logger.info("Calculating emissions...")
        try:
            emissions = calculate_emissions(activities)
            logger.info(f"Calculated {len(emissions)} emissions")
        except Exception as e:
            logger.error(f"Emission calculation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Emission calculation failed: {str(e)}")
        
        return {
            "transcription": text,
            "activities": activities,
            "emissions": emissions
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing audio: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
                logger.info(f"Cleaned up temporary file: {temp_audio_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {e}")

@app.post("/api/upload-audio")
async def upload_audio(audio: UploadFile = File(...)):
    """Upload and process audio file for carbon footprint analysis"""
    
    temp_audio_path = None
    try:
        logger.info(f"Received file: {audio.filename}")
        
        # Validate file
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Get file extension
        file_extension = ".wav"
        if audio.filename:
            _, ext = os.path.splitext(audio.filename)
            if ext.lower() in ['.mp3', '.wav', '.m4a', '.ogg', '.flac']:
                file_extension = ext
            else:
                logger.warning(f"Unusual file extension: {ext}")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await audio.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Uploaded file is empty")
            
            temp_file.write(content)
            temp_audio_path = temp_file.name
        
        # Process the audio using the shared function
        result = process_audio_data(content)
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing audio: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
                logger.info(f"Cleaned up temporary file: {temp_audio_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temporary file: {e}")

@app.post("/api/process-audio")
async def process_audio_endpoint(audio_data: dict):
    """Process base64 encoded audio data from web recorder"""
    try:
        # Extract base64 audio data
        if "audio_data" not in audio_data:
            raise HTTPException(status_code=400, detail="No audio_data provided")
        
        base64_data = audio_data["audio_data"]
        
        # Remove data URL prefix if present
        if base64_data.startswith("data:audio"):
            base64_data = base64_data.split(",")[1]
        
        # Decode base64 data
        try:
            audio_bytes = base64.b64decode(base64_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")
        
        # Process the audio
        result = process_audio_data(audio_bytes)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing audio data: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

@app.websocket("/ws/audio")
async def websocket_audio(websocket: WebSocket):
    """WebSocket endpoint for real-time audio processing"""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            # Receive audio data
            data = await websocket.receive_text()
            
            try:
                # Parse JSON data
                audio_message = json.loads(data)
                
                if audio_message.get("type") == "audio_data":
                    base64_data = audio_message.get("data", "")
                    
                    # Remove data URL prefix if present
                    if base64_data.startswith("data:audio"):
                        base64_data = base64_data.split(",")[1]
                    
                    # Decode and process audio
                    audio_bytes = base64.b64decode(base64_data)
                    result = process_audio_data(audio_bytes)
                    
                    # Send result back
                    await websocket.send_text(json.dumps({
                        "type": "result",
                        "data": result
                    }))
                    
                elif audio_message.get("type") == "ping":
                    # Respond to ping
                    await websocket.send_text(json.dumps({
                        "type": "pong"
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON data"
                }))
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

@app.post("/api/start-recording")
async def start_recording():
    """Endpoint to signal recording start (for compatibility)"""
    return {"message": "Recording started", "status": "ready"}

@app.post("/api/stop-recording")
async def stop_recording():
    """Endpoint to signal recording stop (for compatibility)"""
    return {"message": "Recording stopped", "status": "ready"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")