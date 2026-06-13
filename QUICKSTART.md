# Quick Start Guide

## Installation

### 1. Clone or Navigate to Project
```bash
cd organ-donation-platform
```

### 2. Run Setup Script
```bash
chmod +x setup.sh
./setup.sh
```

Or manually:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run Demo
```bash
python demo.py
```

This will demonstrate the complete workflow with sample data.

### 5. Start Server
```bash
python backend/app.py
```

Server will start at `http://localhost:5001` by default.

If you want a different port, set `PORT`, for example:
```bash
PORT=8000 python backend/app.py
```

---

## Quick API Tests

### 1. Health Check
```bash
curl http://localhost:5001/health
```

### 2. Get Organ Specifications
```bash
curl http://localhost:5001/api/organs
```

### 3. Register Patient
```bash
curl -X POST http://localhost:5001/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P-TEST-001",
    "name": "Test Patient",
    "age": 45,
    "blood_type": "O",
    "organ_required": "Heart",
    "urgency_level": 4,
    "location": {"lat": 12.9716, "lng": 77.5946},
    "medical_status": "Test condition",
    "contact_info": "+91-9999999999"
  }'
```

### 4. Find Matches
```bash
curl -X POST http://localhost:5001/api/matches/find \
  -H "Content-Type: application/json" \
  -d '{
    "donor_id": "D-TEST-001",
    "donor_blood_type": "O",
    "donor_location": {"lat": 12.9716, "lng": 77.5946},
    "organ_type": "Heart",
    "search_radius_km": 50
  }'
```

### 5. Plan Routes
```bash
curl -X POST http://localhost:5001/api/routes/plan \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 12.9716, "lng": 77.5946},
    "destination": {"lat": 13.0827, "lng": 77.5877},
    "match_id": "M-TEST-001",
    "organ_type": "Heart",
    "num_routes": 3
  }'
```

---

## Project Structure

```
organ-donation-platform/
├── backend/
│   ├── models/          # Data models and schemas
│   │   ├── __init__.py
│   │   ├── schemas.py   # Pydantic models
│   │   └── organs.py    # Organ specifications
│   ├── services/        # Business logic
│   │   ├── __init__.py
│   │   ├── matching.py  # Matching algorithm
│   │   ├── routing.py   # Route optimization
│   │   ├── notifications.py  # Alert system
│   │   └── error_handler.py  # Error management
│   ├── utils/           # Utilities
│   │   ├── __init__.py
│   │   └── export.py    # Data export
│   └── app.py           # Flask application
├── docs/
│   └── API.md           # API documentation
├── demo.py              # Demo script
├── requirements.txt     # Python dependencies
├── package.json         # Project metadata
├── .env.example         # Environment template
├── .gitignore
└── README.md
```

---

## Key Features

✅ **Organ Management**: 6 organ types with storage specs  
✅ **Patient Registration**: Comprehensive medical data  
✅ **Smart Matching**: Multi-criteria algorithm (compatibility, proximity, urgency)  
✅ **Route Planning**: 3-4 optimal routes with green corridor support  
✅ **Secure Chat**: End-to-end encrypted communication  
✅ **Notifications**: Real-time alerts with delivery tracking  
✅ **Error Handling**: Comprehensive failure management  
✅ **Data Export**: JSON, CSV, and HTML formats  

---

## Example Workflow

1. **Register patients** waiting for transplants
2. **Donor organ becomes available**
3. **System finds matches** using multi-criteria algorithm
4. **Routes are planned** with traffic optimization
5. **Green corridor** notification sent to traffic dept
6. **Medical teams** coordinate via secure chat
7. **All actions logged** for compliance

---

## Output Format Examples

### PatientRegistration
```json
{
  "patient_id": "P-2026-00123",
  "name": "John Doe",
  "age": 45,
  "blood_type": "O",
  "organ_required": "Heart",
  "urgency_level": 4,
  "location": {"lat": 12.9716, "lng": 77.5946},
  "medical_status": "Severe heart failure",
  "contact_info": "+91-9876543210"
}
```

### MatchOutput
```json
{
  "match_id": "M-2026-00456",
  "donor_id": "D-2026-00789",
  "recipient_id": "P-2026-00123",
  "organ_type": "Heart",
  "match_score": 87.5,
  "compatibility_score": 92.0,
  "proximity_km": 8.3,
  "urgency_level": 4,
  "survival_probability": 0.78,
  "criticality": "High",
  "timestamp": "2026-01-03T10:30:00Z"
}
```

### TransportRoute
```json
{
  "route_id": "R-2026-00111",
  "origin": {"lat": 12.9716, "lng": 77.5946},
  "destination": {"lat": 13.0827, "lng": 77.5877},
  "distance_km": 15.2,
  "estimated_time_min": 28,
  "directions": ["Start at...", "Take highway..."],
  "risk_level": "low",
  "traffic_status": "moderate",
  "green_corridor_status": "approved"
}
```

---

## Next Steps

1. Run the demo to see the system in action
2. Explore the API documentation in `docs/API.md`
3. Start the server and test endpoints
4. Review the code structure and data models
5. Customize for your specific region/requirements

---

## Support

For issues or questions, review the code comments and API documentation.
