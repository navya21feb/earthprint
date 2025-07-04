# main.py - Integrated version
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import spacy
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os

# Initialize FastAPI app
app = FastAPI(title="Voice Carbon Footprint Tracker")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models
whisper_model = None
nlp_model = None

@app.on_event("startup")
async def startup_event():
    global whisper_model, nlp_model
    try:
        print("Loading Whisper model...")
        whisper_model = whisper.load_model("base")
        print("Whisper model loaded successfully!")
        
        print("Loading spaCy model...")
        nlp_model = spacy.load("en_core_web_sm")
        print("spaCy model loaded successfully!")
    except Exception as e:
        print(f"Error loading models: {e}")

# Carbon footprint calculation functions
EMISSION_FACTORS = {
    "drive": 0.21,    # kg CO2e per km
    "cook": 0.5,      # kg CO2e per meal
    "laundry": 0.6,   # kg CO2e per load
    "car_gasoline": 0.21,
    "car_electric": 0.05,
    "bus": 0.089,
    "train": 0.041,
    "plane": 0.255,
    "walk": 0.0,
    "bike": 0.0,
    "beef": 27.0,
    "chicken": 5.7,
    "vegetables": 0.4,
    "shower": 0.7,    # per minute
    "electricity": 0.233,  # per kWh
}

ACTIVITY_KEYWORDS = {
    "drive": ["drive", "drove", "driving", "car", "commute", "road trip", "vehicle"],
    "cook": ["cook", "cooked", "cooking", "meal", "breakfast", "lunch", "dinner", "ate", "eating"],
    "laundry": ["laundry", "wash", "washing", "clothes", "detergent"],
    "shower": ["shower", "bath", "bathing"],
    "walk": ["walk", "walked", "walking"],
    "bike": ["bike", "bicycle", "cycling"],
    "fly": ["fly", "flew", "flight", "plane"],
    "train": ["train", "railway", "metro"],
    "bus": ["bus", "public transport"],
}

def extract_numbers_and_units(text):
    """Extract numbers with units from text"""
    result = {}
    
    # Distance patterns
    distance_match = re.search(r"(\d+(?:\.\d+)?)\s?(km|kilometers|miles|mi|m|meters)", text.lower())
    if distance_match:
        value = float(distance_match.group(1))
        unit = distance_match.group(2)
        # Convert to km
        if unit in ["miles", "mi"]:
            value *= 1.609
        elif unit in ["m", "meters"]:
            value *= 0.001
        result["distance"] = value
    
    # Time patterns
    time_match = re.search(r"(\d+(?:\.\d+)?)\s?(hours|hour|h|minutes|mins|min)", text.lower())
    if time_match:
        value = float(time_match.group(1))
        unit = time_match.group(2)
        # Convert to minutes
        if unit in ["hours", "hour", "h"]:
            value *= 60
        result["duration"] = value
    
    # Quantity patterns
    quantity_match = re.search(r"(\d+(?:\.\d+)?)\s?(times|loads|meals|servings|cups)", text.lower())
    if quantity_match:
        value = float(quantity_match.group(1))
        result["quantity"] = value
    
    return result

def get_smart_defaults(activity_type, sentence):
    """Provide intelligent defaults based on context"""
    defaults = {}
    
    if activity_type == "drive":
        if "work" in sentence or "office" in sentence:
            defaults.setdefault("distance", 15)  # Average commute
        elif "store" in sentence or "shop" in sentence:
            defaults.setdefault("distance", 5)   # Local shopping
        elif "airport" in sentence:
            defaults.setdefault("distance", 25)  # Airport trip
        else:
            defaults.setdefault("distance", 10)  # General default
        
        if "round trip" in sentence:
            defaults["distance"] = defaults.get("distance", 10) * 2
    
    elif activity_type == "cook":
        defaults.setdefault("quantity", 1)
        if "beef" in sentence or "steak" in sentence:
            defaults["food_type"] = "beef"
        elif "chicken" in sentence:
            defaults["food_type"] = "chicken"
        elif "vegetables" in sentence or "salad" in sentence:
            defaults["food_type"] = "vegetables"
    
    elif activity_type == "shower":
        defaults.setdefault("duration", 10)  # 10 minutes default
    
    elif activity_type == "laundry":
        defaults.setdefault("quantity", 1)
    
    elif activity_type in ["walk", "bike"]:
        defaults.setdefault("distance", 2)  # Short distance default
    
    elif activity_type == "fly":
        defaults.setdefault("distance", 500)  # Domestic flight default
    
    elif activity_type in ["train", "bus"]:
        defaults.setdefault("distance", 20)  # Public transport default
    
    return defaults

def extract_activities(text, nlp=None):
    """Extract activities from text with enhanced pattern matching"""
    if nlp:
        doc = nlp(text.lower())
        sentences = [sent.text for sent in doc.sents]
    else:
        # Simple sentence splitting if no NLP model available
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        # Also try splitting by common delimiters
        all_sentences = []
        for sent in sentences:
            # Split by common separators
            parts = re.split(r'[.!?;,]\s+', sent)
            all_sentences.extend([p.strip() for p in parts if p.strip()])
        sentences = all_sentences
    
    activities = []
    
    for sentence in sentences:
        sentence_lower = sentence.lower()
        
        # Check each activity type
        for activity_type, keywords in ACTIVITY_KEYWORDS.items():
            if any(keyword in sentence_lower for keyword in keywords):
                activity = {
                    "type": activity_type,
                    "sentence": sentence,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Extract numbers and units
                numbers = extract_numbers_and_units(sentence)
                if numbers:
                    activity.update(numbers)
                
                # Apply intelligent defaults
                activity.update(get_smart_defaults(activity_type, sentence_lower))
                
                activities.append(activity)
                break  # Only match first found activity type per sentence
    
    return activities

def calculate_single_emission(activity):
    """Calculate emission for a single activity"""
    activity_type = activity["type"]
    
    if activity_type == "drive":
        distance = activity.get("distance", 10)
        return EMISSION_FACTORS["drive"] * distance
    
    elif activity_type == "cook":
        quantity = activity.get("quantity", 1)
        food_type = activity.get("food_type", "general")
        
        if food_type == "beef":
            return EMISSION_FACTORS["beef"] * quantity * 0.25  # Per serving
        elif food_type == "chicken":
            return EMISSION_FACTORS["chicken"] * quantity * 0.25
        elif food_type == "vegetables":
            return EMISSION_FACTORS["vegetables"] * quantity
        else:
            return EMISSION_FACTORS["cook"] * quantity
    
    elif activity_type == "laundry":
        quantity = activity.get("quantity", 1)
        return EMISSION_FACTORS["laundry"] * quantity
    
    elif activity_type == "shower":
        duration = activity.get("duration", 10)
        return EMISSION_FACTORS["shower"] * duration
    
    elif activity_type == "fly":
        distance = activity.get("distance", 500)
        return EMISSION_FACTORS["plane"] * distance
    
    elif activity_type == "train":
        distance = activity.get("distance", 20)
        return EMISSION_FACTORS["train"] * distance
    
    elif activity_type == "bus":
        distance = activity.get("distance", 20)
        return EMISSION_FACTORS["bus"] * distance
    
    elif activity_type in ["walk", "bike"]:
        return 0.0  # No emissions
    
    else:
        return 0.0

def get_calculation_details(activity, emission):
    """Get detailed calculation information"""
    details = {
        "method": f"Used {activity['type']} emission factor",
        "assumptions": []
    }
    
    # Add assumptions based on what defaults were used
    if activity.get("distance") and "distance" not in str(activity.get("sentence", "")):
        details["assumptions"].append(f"Assumed distance: {activity['distance']} km")
    
    if activity.get("duration") and "minutes" not in str(activity.get("sentence", "")):
        details["assumptions"].append(f"Assumed duration: {activity['duration']} minutes")
    
    if activity.get("quantity") and not any(word in str(activity.get("sentence", "")) for word in ["times", "loads", "meals"]):
        details["assumptions"].append(f"Assumed quantity: {activity['quantity']}")
    
    return details

def calculate_emissions(activities):
    """Calculate emissions for activities with enhanced logic"""
    results = []
    total = 0
    
    for activity in activities:
        emission = calculate_single_emission(activity)
        total += emission
        
        result = {
            "activity": activity["sentence"],
            "type": activity["type"],
            "emission": round(emission, 2),
            "details": get_calculation_details(activity, emission)
        }
        results.append(result)
    
    # Add total
    results.append({
        "activity": "Total",
        "emission": round(total, 2),
        "type": "summary"
    })
    
    return results

# API endpoints
@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """Process uploaded audio file and return carbon footprint analysis"""
    try:
        if not whisper_model:
            raise HTTPException(status_code=500, detail="Whisper model not loaded")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Transcribe audio
            result = whisper_model.transcribe(tmp_file_path)
            transcription = result["text"]
            
            # Extract activities
            activities = extract_activities(transcription, nlp_model)
            
            # Calculate emissions
            emissions = calculate_emissions(activities)
            
            return {
                "transcription": transcription,
                "activities": activities,
                "emissions": emissions,
                "total_emission": emissions[-1]["emission"] if emissions else 0
            }
            
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-text")
async def analyze_text(data: dict):
    """Analyze text input for carbon footprint"""
    try:
        text = data.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided")
        
        # Extract activities
        activities = extract_activities(text, nlp_model)
        
        # Calculate emissions
        emissions = calculate_emissions(activities)
        
        return {
            "text": text,
            "activities": activities,
            "emissions": emissions,
            "total_emission": emissions[-1]["emission"] if emissions else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "whisper_loaded": whisper_model is not None,
        "spacy_loaded": nlp_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)