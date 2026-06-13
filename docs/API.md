# API Documentation

## Base URL
```
http://localhost:5001/api
```

You can override the backend port by setting `PORT` when starting the server.

## Authentication
*Currently in development mode. In production, all endpoints will require JWT authentication.*

---

## Endpoints

### Health Check

#### GET /health
Check system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-03T10:00:00Z",
  "version": "1.0.0"
}
```

---

### Organ Information

#### GET /api/organs
Get specifications for all supported organs.

**Response:**
```json
[
  {
    "organ": "Heart",
    "normal_storage_temp_C": "0-8 (typically 4)",
    "viability_time_hours": "4-6",
    "preservation_solutions": ["UW", "Custodiol"]
  }
]
```

#### GET /api/organs/{organ_type}
Get specifications for a specific organ.

**Parameters:**
- `organ_type` (path): Organ type (Heart, Lungs, Kidneys, Liver, Pancreas, Intestine)

---

### Patient Management

#### POST /api/patients
Register a new patient for transplant waiting list.

**Request Body:**
```json
{
  "patient_id": "P-2026-00123",
  "name": "John Doe",
  "age": 45,
  "blood_type": "O",
  "organ_required": "Heart",
  "urgency_level": 4,
  "location": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "medical_status": "Severe heart failure",
  "contact_info": "+91-9876543210"
}
```

**Response:** `201 Created`
```json
{
  "patient": { ... },
  "notification": { ... }
}
```

#### GET /api/patients
Get all registered patients with filtering and sorting.

**Query Parameters:**
- `organ_required` (optional): Filter by organ type
- `urgency_min` (optional): Minimum urgency level (1-5)
- `sort_by` (optional): Sort field (default: urgency_level)
- `order` (optional): Sort order (asc/desc, default: desc)
- `format` (optional): Export format (json/csv/html, default: json)

---

### Matching Engine

#### POST /api/matches/find
Find potential matches for a donor organ.

**Request Body:**
```json
{
  "donor_id": "D-2026-00789",
  "donor_blood_type": "O",
  "donor_location": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "organ_type": "Heart",
  "search_radius_km": 50
}
```

**Response:**
```json
{
  "matches": [
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
      "criticality": "High"
    }
  ],
  "count": 1
}
```

#### GET /api/matches
Get all matches with sorting and filtering.

**Query Parameters:**
- `sort_by` (optional): Sort field (match_score, urgency_level, proximity_km, survival_probability)
- `order` (optional): Sort order (asc/desc, default: desc)
- `format` (optional): Export format (json/csv/html, default: json)
- `min_score` (optional): Minimum match score filter

---

### Route Planning

#### POST /api/routes/plan
Generate optimal transport routes.

**Request Body:**
```json
{
  "origin": {
    "lat": 12.9716,
    "lng": 77.5946
  },
  "destination": {
    "lat": 13.0827,
    "lng": 77.5877
  },
  "match_id": "M-2026-00456",
  "organ_type": "Heart",
  "num_routes": 4
}
```

**Response:**
```json
{
  "routes": [
    {
      "route_id": "R-2026-00111",
      "distance_km": 15.2,
      "estimated_time_min": 28,
      "risk_level": "low",
      "green_corridor_status": "approved"
    }
  ],
  "green_corridor_notification": { ... }
}
```

#### GET /api/routes
Get all planned routes.

**Query Parameters:**
- `sort_by` (optional): Sort field (estimated_time_min, distance_km, risk_level)
- `order` (optional): Sort order (asc/desc, default: asc)
- `format` (optional): Export format (json/csv/html, default: json)

---

### Notifications

#### GET /api/notifications
Get notifications with filtering.

**Query Parameters:**
- `recipient_id` (optional): Filter by recipient
- `status` (optional): Filter by status (sent/delivered/read/failed)
- `format` (optional): Export format (json/csv/html, default: json)

---

### Error Management

#### GET /api/errors
Get error logs with filtering.

**Query Parameters:**
- `error_type` (optional): Filter by type (no_match, system_error, privacy_breach, data_error, transport_error)
- `severity` (optional): Filter by severity (low, medium, high, critical)
- `unresolved_only` (optional): Show only unresolved errors (true/false)
- `format` (optional): Export format (json/csv/html, default: json)

#### GET /api/errors/summary
Get error statistics summary.

**Response:**
```json
{
  "total_errors": 5,
  "by_type": {
    "no_match": 2,
    "system_error": 3
  },
  "by_severity": {
    "high": 3,
    "medium": 2
  },
  "unresolved_count": 2
}
```

---

### Secure Chat

#### POST /api/chat/send
Send encrypted message.

**Request Body:**
```json
{
  "sender_id": "DR-001",
  "recipient_id": "DR-002",
  "message": "Patient status update...",
  "case_id": "M-2026-00456"
}
```

#### GET /api/chat/audit
Get audit logs for compliance.

**Query Parameters:**
- `case_id` (optional): Filter by case ID

---

## Data Export Formats

All list endpoints support three export formats:

### JSON (default)
```
GET /api/patients?format=json
```

### CSV
```
GET /api/patients?format=csv
```
Returns CSV file with flattened data structure.

### HTML Table
```
GET /api/patients?format=html
```
Returns HTML table for display purposes.

---

## Error Responses

All endpoints return standard error format:

```json
{
  "error": {
    "error_id": "E-2026-00333",
    "error_type": "data_error",
    "message": "User-friendly error message",
    "recommended_action": "What to do next",
    "severity": "medium"
  }
}
```

---

## Rate Limiting

*To be implemented in production:*
- 60 requests per minute per IP
- 1000 requests per hour per API key

---

## Compliance & Security

- All sensitive data is encrypted at rest and in transit
- Audit logs maintained for all operations
- HIPAA-compliant data handling
- Role-based access control (to be implemented)
