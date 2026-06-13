# SQLite Database Schema Documentation

## ✅ DATABASE IMPLEMENTATION COMPLETE

### Database File
- **Location:** `organ_donation.db` (created in root directory)
- **Type:** SQLite 3
- **ORM:** SQLAlchemy

---

## 📊 Database Tables (10 Tables)

### 1. **patients**
Patient registration and waiting list management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| patient_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Patient identifier (P-YYYY-XXXXX) |
| name | VARCHAR(200) | NOT NULL | Full name |
| age | INTEGER | NOT NULL | Age in years |
| blood_type | ENUM | NOT NULL, INDEXED | A, B, AB, O |
| organ_required | ENUM | NOT NULL, INDEXED | Heart, Lungs, Kidneys, Liver, Pancreas, Intestine |
| urgency_level | INTEGER | NOT NULL, INDEXED | 1-5 (1=low, 5=critical) |
| latitude | FLOAT | NOT NULL | Location latitude |
| longitude | FLOAT | NOT NULL | Location longitude |
| medical_status | TEXT | NOT NULL | Medical condition description |
| contact_info | VARCHAR(200) | NOT NULL | Contact information |
| registered_at | DATETIME | NOT NULL | Registration timestamp |
| is_active | BOOLEAN | NOT NULL | Active status |

### 2. **donors**
Donor information and organ availability

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| donor_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Donor identifier (D-YYYY-XXXXX) |
| blood_type | ENUM | NOT NULL, INDEXED | A, B, AB, O |
| age | INTEGER | NOT NULL | Age in years |
| latitude | FLOAT | NOT NULL | Location latitude |
| longitude | FLOAT | NOT NULL | Location longitude |
| medical_status | TEXT | | Medical condition |
| available_organs | JSON | NOT NULL | List of available organ types |
| registered_at | DATETIME | NOT NULL | Registration timestamp |
| is_active | BOOLEAN | NOT NULL | Active status |

### 3. **matches**
Transplant match results from matching algorithm

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| match_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Match identifier (M-YYYYMMDDHHMMSS-XXX) |
| donor_id | VARCHAR(50) | NOT NULL, INDEXED | Donor identifier |
| recipient_id | VARCHAR(50) | NOT NULL, INDEXED | Patient identifier |
| organ_type | ENUM | NOT NULL | Organ being matched |
| match_score | FLOAT | NOT NULL, INDEXED | Overall match score (0-100) |
| compatibility_score | FLOAT | NOT NULL | Medical compatibility (0-100) |
| proximity_km | FLOAT | NOT NULL | Distance in kilometers |
| urgency_level | INTEGER | NOT NULL | Recipient urgency (1-5) |
| survival_probability | FLOAT | NOT NULL | Predicted survival (0-1) |
| criticality | VARCHAR(20) | NOT NULL | Low, Medium, High, Critical |
| timestamp | DATETIME | NOT NULL, INDEXED | Match creation time |
| status | VARCHAR(20) | NOT NULL | pending, accepted, rejected, completed |

### 4. **transport_routes**
Optimized transport routes for organ delivery

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| route_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Route identifier (R-YYYYMMDDHHMMSS-X) |
| match_id | VARCHAR(50) | NOT NULL, INDEXED | Associated match ID |
| origin_lat | FLOAT | NOT NULL | Starting latitude |
| origin_lng | FLOAT | NOT NULL | Starting longitude |
| destination_lat | FLOAT | NOT NULL | Ending latitude |
| destination_lng | FLOAT | NOT NULL | Ending longitude |
| distance_km | FLOAT | NOT NULL | Total distance |
| estimated_time_min | INTEGER | NOT NULL, INDEXED | Estimated travel time |
| directions | JSON | NOT NULL | Turn-by-turn directions |
| risk_level | ENUM | NOT NULL | low, moderate, high |
| traffic_status | VARCHAR(20) | | Traffic conditions |
| green_corridor_status | VARCHAR(20) | | pending, approved, active, completed |
| created_at | DATETIME | NOT NULL | Route creation time |
| is_active | BOOLEAN | NOT NULL | Active status |

### 5. **notifications**
Alert and notification management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| alert_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Alert identifier (N-YYYYMMDDHHMMSS) |
| recipient_type | ENUM | NOT NULL, INDEXED | doctor, admin, traffic, government |
| recipient_id | VARCHAR(100) | NOT NULL, INDEXED | Recipient identifier |
| content | TEXT | NOT NULL | Notification message |
| timestamp | DATETIME | NOT NULL, INDEXED | Notification time |
| status | ENUM | NOT NULL, INDEXED | sent, delivered, read, failed |
| priority | VARCHAR(20) | NOT NULL | low, normal, high, critical |
| metadata | JSON | | Additional data |
| read_at | DATETIME | | When notification was read |

### 6. **errors**
Error logging and management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| error_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Error identifier (E-YYYYMMDDHHMMSS) |
| error_type | VARCHAR(50) | NOT NULL, INDEXED | no_match, system_error, privacy_breach, etc. |
| module | VARCHAR(100) | NOT NULL | Module where error occurred |
| message | TEXT | NOT NULL | User-friendly error message |
| technical_details | TEXT | | Technical error details |
| recommended_action | TEXT | NOT NULL | Suggested resolution |
| escalation_status | VARCHAR(20) | NOT NULL, INDEXED | none, pending, escalated, resolved |
| timestamp | DATETIME | NOT NULL, INDEXED | Error occurrence time |
| affected_entities | JSON | | List of affected IDs |
| severity | VARCHAR(20) | NOT NULL, INDEXED | low, medium, high, critical |
| resolved_at | DATETIME | | Resolution timestamp |
| resolution_notes | TEXT | | Resolution details |

### 7. **chat_messages**
Secure team communication messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| message_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Message identifier |
| sender_id | VARCHAR(100) | NOT NULL, INDEXED | Sender identifier |
| recipient_id | VARCHAR(100) | NOT NULL, INDEXED | Recipient identifier |
| case_id | VARCHAR(50) | NOT NULL, INDEXED | Associated case/match ID |
| encrypted_content | TEXT | NOT NULL | Encrypted message content |
| message_type | VARCHAR(20) | NOT NULL | text, file, image |
| timestamp | DATETIME | NOT NULL, INDEXED | Message time |
| status | VARCHAR(20) | NOT NULL | sent, delivered, read, failed |
| read | BOOLEAN | NOT NULL | Read status |
| read_at | DATETIME | | When message was read |

### 8. **audit_logs**
Compliance and activity audit trail

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| action | VARCHAR(100) | NOT NULL, INDEXED | Action performed |
| user_id | VARCHAR(100) | INDEXED | User who performed action |
| entity_type | VARCHAR(50) | INDEXED | Type of entity affected |
| entity_id | VARCHAR(50) | INDEXED | Entity identifier |
| case_id | VARCHAR(50) | INDEXED | Associated case ID |
| details | JSON | | Additional action details |
| timestamp | DATETIME | NOT NULL, INDEXED | Action timestamp |
| ip_address | VARCHAR(50) | | IP address of user |
| severity | VARCHAR(20) | | normal, high, critical |

### 9. **donor_availability**
No-match scenario notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal ID |
| notification_id | VARCHAR(50) | UNIQUE, NOT NULL, INDEXED | Notification identifier |
| organs | JSON | NOT NULL | List of available organs |
| timestamp | DATETIME | NOT NULL, INDEXED | Availability timestamp |
| recipient_type | ENUM | NOT NULL | Recipient type |
| recipient_id | VARCHAR(100) | NOT NULL | Recipient identifier |
| purpose | VARCHAR(50) | NOT NULL | research, education, regional_alert |
| anonymized_data | JSON | NOT NULL | Anonymized donor information |
| processed | BOOLEAN | NOT NULL | Processing status |

---

## 🚀 Usage

### Initialize Database
```bash
python3 backend/database/init_db.py
```

This will:
1. Create the SQLite database file
2. Create all 10 tables with proper schema
3. Optionally load sample data (5 patients, 2 donors)

### Access Database in Code
```python
from backend.database import get_session, Patient

# Get session
session = get_session(engine)

# Query patients
patients = session.query(Patient).filter(
    Patient.is_active == True,
    Patient.urgency_level >= 4
).all()

# Add new patient
patient = Patient(
    patient_id="P-2026-00001",
    name="John Doe",
    age=45,
    blood_type=BloodTypeEnum.O,
    organ_required=OrganTypeEnum.HEART,
    urgency_level=4,
    latitude=12.9716,
    longitude=77.5946,
    medical_status="Heart failure",
    contact_info="+91-9876543210"
)
session.add(patient)
session.commit()
```

### Database Queries

#### Get urgent patients
```python
urgent_patients = session.query(Patient).filter(
    Patient.urgency_level >= 4,
    Patient.is_active == True
).order_by(Patient.urgency_level.desc()).all()
```

#### Get matches for a donor
```python
matches = session.query(Match).filter(
    Match.donor_id == "D-2026-00001",
    Match.match_score >= 70
).order_by(Match.match_score.desc()).all()
```

#### Get unresolved errors
```python
errors = session.query(Error).filter(
    Error.escalation_status.in_(['pending', 'escalated']),
    Error.severity.in_(['high', 'critical'])
).order_by(Error.timestamp.desc()).all()
```

---

## 📈 Indexing Strategy

**Indexed Columns for Performance:**
- `patient_id`, `blood_type`, `organ_required`, `urgency_level` (patients)
- `donor_id`, `blood_type` (donors)
- `match_id`, `donor_id`, `recipient_id`, `match_score`, `timestamp` (matches)
- `route_id`, `match_id`, `estimated_time_min` (transport_routes)
- `alert_id`, `recipient_type`, `recipient_id`, `timestamp`, `status` (notifications)
- `error_id`, `error_type`, `escalation_status`, `timestamp`, `severity` (errors)
- All other tables have appropriate indexes

---

## 🔐 Data Privacy

- Sensitive data (medical_status, contact_info) stored encrypted in production
- Audit logs track all data access
- Chat messages are end-to-end encrypted
- Donor availability uses anonymized data only

---

## 🛠️ Maintenance

### Backup Database
```bash
cp organ_donation.db organ_donation_backup_$(date +%Y%m%d).db
```

### View Tables
```bash
sqlite3 organ_donation.db ".tables"
```

### Query Database
```bash
sqlite3 organ_donation.db "SELECT * FROM patients;"
```

### Database Schema
```bash
sqlite3 organ_donation.db ".schema patients"
```

---

## ✅ Integration with App

The Flask app (`backend/app.py`) has been updated to use SQLite:
- ✅ Patient registration saves to database
- ✅ Patient queries use database
- ✅ Matches stored in database
- ✅ All CRUD operations use SQLAlchemy ORM

---

## 📝 Sample Data

When you run `init_db.py` with sample data, you get:

**5 Sample Patients:**
- Rajesh Kumar (Heart, Urgency 5)
- Priya Sharma (Kidneys, Urgency 4)
- Mohammed Ali (Liver, Urgency 4)
- Lakshmi Devi (Lungs, Urgency 3)
- Suresh Reddy (Kidneys, Urgency 3)

**2 Sample Donors:**
- D-2026-00001 (Blood Type O, 3 organs)
- D-2026-00002 (Blood Type AB, 2 organs)

---

## 🎯 Next Steps

1. **Install Dependencies:** `pip install -r requirements.txt`
2. **Initialize Database:** `python3 backend/database/init_db.py`
3. **Start Server:** `python3 backend/app.py`
4. **Test Endpoints:** Use the API endpoints to register patients, find matches, etc.

---

**Status:** ✅ All database schemas implemented and ready to use!
