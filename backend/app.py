"""backend.app

Flask API server for the Organ Donation Coordination Platform.

This file was rebuilt to restore a working server after prior partial edits
corrupted the module. It intentionally implements the core endpoints needed
by the React frontend (health, organs, patients).
"""

from __future__ import annotations

from datetime import datetime, date
import os
import sys
import uuid
import json
from typing import Any, Dict, Optional


# Allow running as a script (python backend/app.py) as well as a module
# (python -m backend.app). When executed as a script, Python does not
# automatically add the repo root to sys.path, so absolute imports like
# `backend.database.models` would fail.
if __package__ in (None, ""):
    _repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _repo_root not in sys.path:
        sys.path.insert(0, _repo_root)

from flask import Flask, jsonify, request
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash, generate_password_hash

from backend.database.models import (
    get_engine,
    get_session,
    init_database,
    Patient,
    User,
    UserRoleEnum,
    ChatMessage,
    BloodTypeEnum,
    OrganTypeEnum,
)


# NOTE: This app intentionally avoids importing `backend.models.*` because those
# modules depend on Pydantic v2 which currently does not install cleanly on
# Python 3.14.

_ORGAN_SPECS = [
    {
        "organ": "Heart",
        "normal_storage_temp_C": "0-8 (typically 4)",
        "viability_time_hours": "4-6",
        "preservation_solutions": ["UW (University of Wisconsin)", "Custodiol", "Celsior"],
    },
    {
        "organ": "Lungs",
        "normal_storage_temp_C": "4-8",
        "viability_time_hours": "6-8",
        "preservation_solutions": ["Perfadex", "Steen Solution", "UW"],
    },
    {
        "organ": "Kidneys",
        "normal_storage_temp_C": "0-4",
        "viability_time_hours": "24-36",
        "preservation_solutions": ["UW", "HTK (Custodiol)", "Soltran"],
    },
    {
        "organ": "Liver",
        "normal_storage_temp_C": "0-4",
        "viability_time_hours": "12-18",
        "preservation_solutions": ["UW", "HTK (Custodiol)", "IGL-1"],
    },
    {
        "organ": "Pancreas",
        "normal_storage_temp_C": "0-4",
        "viability_time_hours": "12-24",
        "preservation_solutions": ["UW", "HTK (Custodiol)", "Celsior"],
    },
    {
        "organ": "Intestine",
        "normal_storage_temp_C": "0-4",
        "viability_time_hours": "8-16",
        "preservation_solutions": ["UW", "HTK (Custodiol)"],
    },
]


def _normalize_organ_name(raw: str) -> str:
    if raw is None:
        raise ValueError("Missing organ")
    s = str(raw).strip()
    if not s:
        raise ValueError("Missing organ")

    # Handle enum-key style
    upper = s.upper()
    key_to_value = {
        "HEART": "Heart",
        "LUNGS": "Lungs",
        "KIDNEY": "Kidneys",
        "KIDNEYS": "Kidneys",
        "LIVER": "Liver",
        "PANCREAS": "Pancreas",
        "INTESTINE": "Intestine",
    }
    if upper in key_to_value:
        return key_to_value[upper]

    # Handle value style
    lower = s.lower()
    value_map = {
        "heart": "Heart",
        "lungs": "Lungs",
        "kidney": "Kidneys",
        "kidneys": "Kidneys",
        "liver": "Liver",
        "pancreas": "Pancreas",
        "intestine": "Intestine",
        "intestines": "Intestine",
    }
    if lower in value_map:
        return value_map[lower]

    raise ValueError(f"Unknown organ type: {raw}")


def _get_organ_spec(raw: str) -> Dict[str, Any]:
    organ = _normalize_organ_name(raw)
    for spec in _ORGAN_SPECS:
        if spec["organ"] == organ:
            return spec
    raise ValueError(f"Unknown organ type: {raw}")


def _default_database_url() -> str:
    # Store DB at repo root by default
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return f"sqlite:///{os.path.join(repo_root, 'organ_donation.db')}"


app = Flask(__name__)
app.config["DATABASE_URL"] = os.getenv("DATABASE_URL", _default_database_url())
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")

# Allow Vite dev server by default; can be tightened via CORS_ORIGINS.
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

_engine = None
_session = None
_serializer = None


def _get_serializer() -> URLSafeTimedSerializer:
    global _serializer
    if _serializer is None:
        _serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="organflow-auth-v1")
    return _serializer


def _seed_users(session) -> None:
    """Seed demo users if they don't exist."""
    demo = [
        {
            "user_id": "admin-001",
            "email": "admin@organflow.in",
            "name": "Admin",
            "role": UserRoleEnum.ADMIN,
            "password": "OrganFlow@560076",
        },
        {
            "user_id": "dr-chen",
            "email": "emily.chen@organflow.in",
            "name": "Dr. Emily Chen",
            "role": UserRoleEnum.DOCTOR,
            "password": "OrganFlow@560076",
        },
        {
            "user_id": "dr-smith",
            "email": "dr.smith@organflow.in",
            "name": "Dr. Smith",
            "role": UserRoleEnum.DOCTOR,
            "password": "OrganFlow@560076",
        },
    ]

    for d in demo:
        existing = session.query(User).filter(User.email == d["email"]).first()
        if existing:
            continue
        u = User(
            user_id=d["user_id"],
            email=d["email"],
            name=d["name"],
            role=d["role"],
            password_hash=generate_password_hash(d["password"]),
            is_active=True,
        )
        session.add(u)
    session.commit()


def get_db():
    global _engine, _session
    if _engine is None:
        _engine = get_engine(app.config["DATABASE_URL"])
        init_database(app.config["DATABASE_URL"])
    if _session is None:
        _session = get_session(_engine)
        _seed_users(_session)
    return _session


def _parse_json() -> Dict[str, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("Invalid JSON body")
    return data


def _safe_enum_lookup(enum_cls, raw: str):
    # Try key lookup (HEART) and value lookup (Heart)
    if raw is None:
        raise ValueError("Missing enum value")
    raw = str(raw)
    try:
        return enum_cls[raw.upper()]
    except Exception:
        for member in enum_cls:
            if str(member.value).lower() == raw.lower():
                return member
        raise ValueError(f"Invalid value: {raw}")


def _compute_age(dob_iso: str) -> Optional[int]:
    try:
        dob = date.fromisoformat(dob_iso)
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


def _issue_token(user: User) -> str:
    s = _get_serializer()
    return s.dumps({"user_id": user.user_id, "role": user.role.value})


def _verify_token(token: str, max_age_seconds: int = 7 * 24 * 60 * 60) -> Dict[str, Any]:
    s = _get_serializer()
    return s.loads(token, max_age=max_age_seconds)


def _get_bearer_token() -> Optional[str]:
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) != 2:
        return None
    if parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def _require_user(session) -> User:
    token = _get_bearer_token()
    if not token:
        raise PermissionError("Missing bearer token")
    try:
        payload = _verify_token(token)
    except SignatureExpired:
        raise PermissionError("Token expired")
    except BadSignature:
        raise PermissionError("Invalid token")

    user_id = payload.get("user_id")
    if not user_id:
        raise PermissionError("Invalid token")
    user = session.query(User).filter(User.user_id == user_id).filter(User.is_active == True).first()
    if not user:
        raise PermissionError("User not found")
    return user


# =====================
# Health
# =====================


@app.get("/health")
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat(), "version": "1.0.0"})


# =====================
# Organs
# =====================


@app.get("/api/organs")
def api_organs():
    return jsonify(_ORGAN_SPECS)


@app.get("/api/organs/<organ_type>")
def api_organ(organ_type: str):
    try:
        return jsonify(_get_organ_spec(organ_type))
    except Exception as e:
        return jsonify({"error": str(e)}), 404


# =====================
# Patients
# =====================


@app.post("/api/patients")
def create_patient():
    """Create a patient.

    Minimal payload:
    {
      patient_id?, name, age|dob, blood_type, organ_required, urgency_level,
      location: {lat,lng}, medical_status, contact_info,
      extra_data?: object
    }
    """
    session = get_db()
    try:
        data = _parse_json()

        patient_id = data.get("patient_id") or f"P-{datetime.utcnow().year}-{uuid.uuid4().hex[:5].upper()}"
        name = data.get("name")

        # Allow frontend to send dob instead of age
        age = data.get("age")
        if age is None and isinstance(data.get("dob"), str):
            age = _compute_age(data["dob"])

        blood_type = data.get("blood_type")
        organ_required_raw = data.get("organ_required")
        urgency_level = data.get("urgency_level")

        location = data.get("location") or {}
        lat = location.get("lat")
        lng = location.get("lng")

        medical_status = data.get("medical_status")
        contact_info = data.get("contact_info")
        extra_data = data.get("extra_data")

        # Minimal validations
        missing = [
            k
            for k, v in {
                "name": name,
                "age": age,
                "blood_type": blood_type,
                "organ_required": organ_required_raw,
                "urgency_level": urgency_level,
                "location.lat": lat,
                "location.lng": lng,
                "medical_status": medical_status,
                "contact_info": contact_info,
            }.items()
            if v is None or v == ""
        ]
        if missing:
            return jsonify({"error": "Missing required fields", "missing": missing}), 400

        bt = _safe_enum_lookup(BloodTypeEnum, blood_type)

        # Normalize organ value for DB enum compatibility.
        organ_required = _normalize_organ_name(organ_required_raw)
        ot = _safe_enum_lookup(OrganTypeEnum, organ_required)

        # Basic numeric validation
        urgency_int = int(urgency_level)
        if urgency_int < 1 or urgency_int > 5:
            return jsonify({"error": "urgency_level must be between 1 and 5"}), 400

        patient = Patient(
            patient_id=str(patient_id),
            name=str(name),
            age=int(age),
            blood_type=bt,
            organ_required=ot,
            urgency_level=urgency_int,
            latitude=float(lat),
            longitude=float(lng),
            medical_status=str(medical_status),
            contact_info=str(contact_info),
            extra_data=extra_data if isinstance(extra_data, dict) else None,
        )

        session.add(patient)
        session.commit()
        return jsonify({"patient": patient.to_dict()}), 201
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 400


@app.get("/api/patients")
def list_patients():
    session = get_db()
    patients = session.query(Patient).filter(Patient.is_active == True).order_by(Patient.urgency_level.desc()).all()
    return jsonify([p.to_dict() for p in patients])


@app.get("/api/patients/<patient_id>")
def get_patient(patient_id: str):
    session = get_db()
    patient = (
        session.query(Patient)
        .filter(Patient.patient_id == patient_id)
        .filter(Patient.is_active == True)
        .first()
    )
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    return jsonify(patient.to_dict())


# =====================
# Auth
# =====================


@app.post("/api/auth/login")
def auth_login():
    """Login using email/password.

    Body: { email: string, password: string }
    Returns: { token, user }
    """
    session = get_db()
    try:
        data = _parse_json()
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")
        if not email or not password:
            return jsonify({"error": "email and password are required"}), 400

        user = session.query(User).filter(User.email == email).filter(User.is_active == True).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401

        token = _issue_token(user)
        return jsonify({"token": token, "user": user.to_dict()}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.get("/api/auth/me")
def auth_me():
    session = get_db()
    try:
        user = _require_user(session)
        return jsonify({"user": user.to_dict()}), 200
    except PermissionError as e:
        return jsonify({"error": str(e)}), 401


# =====================
# Secure Messaging (E2EE relay)
# =====================


def _get_key_store() -> Dict[str, Any]:
    """Very small key registry.

    For this demo/MVP: we store public keys in the same SQLite DB using the
    existing AuditLog table would be overkill; instead we keep a simple
    table-less registry inside the database via a JSON blob in memory.

    NOTE: This is intentionally minimal and not production-grade.
    """
    if not hasattr(app, "_doctor_keys"):
        setattr(app, "_doctor_keys", {})
    return getattr(app, "_doctor_keys")


@app.post("/api/secure/keys/register")
def secure_register_key():
    """Register (or replace) a doctor's public key.

    Body:
      { doctor_id: string, public_key_jwk: object }
    """
    try:
        data = _parse_json()
        doctor_id = data.get("doctor_id")
        public_key_jwk = data.get("public_key_jwk")
        if not doctor_id or not isinstance(doctor_id, str):
            return jsonify({"error": "doctor_id is required"}), 400
        if not isinstance(public_key_jwk, dict):
            return jsonify({"error": "public_key_jwk must be an object"}), 400

        # Demo registry: server can read this key, but it cannot decrypt any ciphertext.
        keys = _get_key_store()
        keys[doctor_id] = {
            "doctor_id": doctor_id,
            "public_key_jwk": public_key_jwk,
            "updated_at": datetime.utcnow().isoformat(),
        }
        return jsonify({"ok": True, "doctor_id": doctor_id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.get("/api/secure/keys/<doctor_id>")
def secure_get_key(doctor_id: str):
    keys = _get_key_store()
    entry = keys.get(doctor_id)
    if not entry:
        return jsonify({"error": "Key not found"}), 404
    return jsonify({"doctor_id": doctor_id, "public_key_jwk": entry.get("public_key_jwk")})


@app.post("/api/secure/messages")
def secure_send_message():
    """Store a ciphertext message for a case.

    Body:
      {
        sender_id: string,
        recipient_id: string,
        case_id: string,
        payload: { v: 1, alg: 'AES-GCM', iv: base64, ct: base64 }
      }
    """
    session = get_db()
    try:
        data = _parse_json()
        sender_id = data.get("sender_id")
        recipient_id = data.get("recipient_id")
        case_id = data.get("case_id")
        payload = data.get("payload")

        missing = [
            k
            for k, v in {
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "case_id": case_id,
                "payload": payload,
            }.items()
            if v is None or v == ""
        ]
        if missing:
            return jsonify({"error": "Missing required fields", "missing": missing}), 400
        if not isinstance(payload, dict):
            return jsonify({"error": "payload must be an object"}), 400

        message_id = data.get("message_id") or f"MSG-{uuid.uuid4().hex[:10].upper()}"
        msg = ChatMessage(
            message_id=message_id,
            sender_id=str(sender_id),
            recipient_id=str(recipient_id),
            case_id=str(case_id),
            encrypted_content=json.dumps(payload, separators=(",", ":")),
            message_type="text",
            status="sent",
        )

        session.add(msg)
        session.commit()
        return jsonify(
            {
                "message": {
                    "message_id": msg.message_id,
                    "sender_id": msg.sender_id,
                    "recipient_id": msg.recipient_id,
                    "case_id": msg.case_id,
                    "payload": payload,
                    "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
                }
            }
        ), 201
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 400


@app.get("/api/secure/messages")
def secure_list_messages():
    """Fetch ciphertext messages for a case.

    Query params:
      case_id: required
      doctor_id: required (viewer)
      peer_id: required (other participant)
      since: optional ISO timestamp (best-effort)
    """
    session = get_db()
    case_id = request.args.get("case_id")
    doctor_id = request.args.get("doctor_id")
    peer_id = request.args.get("peer_id")
    since = request.args.get("since")

    missing = [k for k, v in {"case_id": case_id, "doctor_id": doctor_id, "peer_id": peer_id}.items() if not v]
    if missing:
        return jsonify({"error": "Missing required query params", "missing": missing}), 400

    q = session.query(ChatMessage).filter(ChatMessage.case_id == case_id)
    q = q.filter(
        ((ChatMessage.sender_id == doctor_id) & (ChatMessage.recipient_id == peer_id))
        | ((ChatMessage.sender_id == peer_id) & (ChatMessage.recipient_id == doctor_id))
    )
    if since:
        try:
            q = q.filter(ChatMessage.timestamp > datetime.fromisoformat(since.replace("Z", "+00:00")))
        except Exception:
            pass
    q = q.order_by(ChatMessage.timestamp.asc()).limit(200)

    out = []
    for m in q.all():
        try:
            payload = json.loads(m.encrypted_content) if m.encrypted_content else None
        except Exception:
            payload = None
        out.append(
            {
                "message_id": m.message_id,
                "sender_id": m.sender_id,
                "recipient_id": m.recipient_id,
                "case_id": m.case_id,
                "payload": payload,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            }
        )
    return jsonify(out)


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    # macOS often reserves 5000 for AirPlay Receiver (AirTunes), so we default
    # to 5001 to avoid "Address already in use" / 403 responses.
    port = int(os.getenv("PORT", "5001"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host=host, port=port, debug=debug)

# NOTE:
# Legacy/duplicated code was previously appended below. It is preserved only
# for reference and is intentionally disabled to avoid overriding the active
# Flask app and routes above.
_LEGACY_CODE = r'''

"""
Main Flask Application - Organ Donation Coordination Platform
REST API endpoints for all operations
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime
from typing import List, Optional
import os

from backend.models import (
    PatientRegistration,
    MatchOutput,
    TransportRoute,
    OrganType,
    Location,
    get_all_organ_details,
    get_organ_details
)
from backend.services.matching import MatchingEngine
from backend.services.routing import RouteOptimizer
from backend.services.notifications import NotificationService, SecureChat
from backend.services.error_handler import ErrorHandler
from backend.utils.export import DataExporter

# Database imports
from backend.database import (
    get_engine, get_session, init_database,
    Patient, Donor, Match, TransportRoute as DBRoute, 
    Notification as DBNotification, Error as DBError,
    ChatMessage, AuditLog,
    BloodTypeEnum, OrganTypeEnum
)

# Initialize database
db_engine = None
db_session = None

def get_db():
    """Get database session"""
    global db_engine, db_session
    if db_engine is None:
        db_engine = get_engine(app.config['DATABASE_URL'])
        init_database(app.config['DATABASE_URL'])
    if db_session is None:
        db_session = get_session(db_engine)
    return db_session

# Initialize services
matching_engine = MatchingEngine(
    urgency_weight=float(os.getenv('URGENCY_WEIGHT', 0.4)),
    compatibility_weight=float(os.getenv('COMPATIBILITY_WEIGHT', 0.35)),
    proximity_weight=float(os.getenv('PROXIMITY_WEIGHT', 0.25)),
    min_survival_probability=float(os.getenv('MIN_SURVIVAL_PROBABILITY', 0.5)),
    initial_search_radius_km=float(os.getenv('DEFAULT_SEARCH_RADIUS_KM', 10.0))
)

route_optimizer = RouteOptimizer()
notification_service = NotificationService()
secure_chat = SecureChat()
error_handler = ErrorHandler()
data_exporter = DataExporter()
notification_service = NotificationService()
secure_chat = SecureChat()
error_handler = ErrorHandler()
data_exporter = DataExporter()

# In-memory storage (in production, use proper database)
patients_db: List[PatientRegistration] = []
matches_db: List[MatchOutput] = []
routes_db: List[TransportRoute] = []


# =====================
# Root & Health Check Endpoints
# =====================

@app.route('/', methods=['GET'])
def index():
    """Root route returning a friendly HTML welcome page"""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organ Donation Coordination API</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Outfit', sans-serif;
            background: radial-gradient(circle at top right, #1a1b2f, #0d0e15);
            color: #f3f4f6;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 48px;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            animation: fadeIn 1s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .status-badge {
            background: linear-gradient(135deg, #00f2fe, #4facfe);
            color: #0d0e15;
            font-weight: 800;
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            display: inline-block;
            margin-bottom: 24px;
            box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4);
        }
        h1 {
            font-size: 2.2rem;
            font-weight: 800;
            margin: 0 0 16px 0;
            background: linear-gradient(135deg, #ffffff, #9ca3af);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            color: #9ca3af;
            font-size: 1.1rem;
            line-height: 1.6;
            margin: 0 0 16px 0;
        }
        .pulse {
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #00f2fe;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse-animation 1.5s infinite;
        }
        @keyframes pulse-animation {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 242, 254, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 242, 254, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 242, 254, 0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <span class="status-badge"><span class="pulse"></span>Online</span>
        <h1>Organ Donation API</h1>
        <p>The backend services for Organ Donation Coordination Platform are active and connected to Neon Database.</p>
    </div>
</body>
</html>"""


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    })


# =====================
# Organ Information
# =====================

@app.route('/api/organs', methods=['GET'])
def get_organs():
    """
    Get all organ type specifications
    
    Returns:
        JSON array of organ specifications
    """
    return jsonify(get_all_organ_details())


@app.route('/api/organs/<organ_type>', methods=['GET'])
def get_organ(organ_type: str):
    """
    Get specifications for a specific organ
    
    Args:
        organ_type: Organ type name
        
    Returns:
        JSON object with organ specifications
    """
    try:
        organ = get_organ_details(OrganType(organ_type))
        return jsonify(organ.model_dump())
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


# =====================
# Patient Registration
# =====================

@app.route('/api/patients', methods=['POST'])
def register_patient():
    """
    Regisession = get_db()
        
        # Create database record
        patient = Patient(
            patient_id=data['patient_id'],
            name=data['name'],
            age=data['age'],
            blood_type=BloodTypeEnum[data['blood_type']],
            organ_required=OrganTypeEnum[data['organ_required'].upper()],
            urgency_level=data['urgency_level'],
            latitude=data['location']['lat'],
            longitude=data['location']['lng'],
            medical_status=data['medical_status'],
            contact_info=data['contact_info']
        )
        
        session.add(patient)
        session.commit()
        
        # Create notification
        notification = notification_service.create_notification(
            recipient_type="admin",
            recipient_id="ADMIN-BANGALORE-001",
            content=f"New patient registered: {patient.name} (ID: {patient.patient_id}) - Requires {patient.organ_required.value}",
            priority="normal",
            metadata={"patient_id": patient.patient_id}
        )
        
        return jsonify({
            "patient": patient.to_dict(),
            "notification": notification.model_dump()
        }), 201
    
    except Exception as e:
        session.rollback()al",
            metadata={"patient_id": patient.patient_id}
        )
        
        return jsonify({
            "patient": patient.model_dump(),
            "notification": notification.model_dump()
    try:
        session = get_db()
        
        # Base query
        query = session.query(Patient).filter(Patient.is_active == True)
        
        # Get query parameters
        organ_filter = request.args.get('organ_required')
        urgency_min = request.args.get('urgency_min', type=int)
        sort_by = request.args.get('sort_by', 'urgency_level')
        order = request.args.get('order', 'desc')
        export_format = request.args.get('format', 'json')
        
        # Apply filters
        if organ_filter:
            query = query.filter(Patient.organ_required == OrganTypeEnum[organ_filter.upper()])
        
        if urgency_min:
            query = query.filter(Patient.urgency_level >= urgency_min)
        
        # Apply sorting
        sort_column = getattr(Patient, sort_by, Patient.urgency_level)
        if order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Get results
        patients = query.all()
        
        # Convert to dict
        patient_dicts = [p.to_dict() for p in patients]
        
        # Return based on format
        if export_format == 'json':
            return jsonify(patient_dicts)
        elif export_format == 'csv':
            # Convert to Pydantic models for export
            patient_models = []
            for p in patient_dicts:
                patient_models.append(PatientRegistration(**p))
            result = data_exporter.export_patients(patient_models, format='csv')
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=patients.csv'
            })
        elif export_format == 'html':
            patient_models = []
            for p in patient_dicts:
                patient_models.append(PatientRegistration(**p))
            result = data_exporter.export_patients(patient_models, format='html')'format', 'json')
    
    # Filter patients
    filtered_patients = patients_db.copy()
    
    if organ_filter:
        filtered_patients = [p for p in filtered_patients if p.organ_required.value == organ_filter]
    
    if urgency_min:
    session = get_db()
    patient = session.query(Patient).filter(
        Patient.patient_id == patient_id,
        Patient.is_active == True
    ).first()
    
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    
    return jsonify(patient.to_dict
            format=export_format,
            sort_by=sort_by,
            reverse=(order == 'desc')
        )
        
        if export_format == 'json':
            return Response(result, mimetype='application/json')
        elif export_format == 'csv':
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=patients.csv'
            })
        elif export_format == 'html':
            return Response(result, mimetype='text/html')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/patients/<patient_id>', methods=['GET'])
def get_session = get_db()
        
        donor_id = data['donor_id']
        donor_blood_type = data['donor_blood_type']
        donor_location = Location(**data['donor_location'])
        organ_type = OrganType(data['organ_type'])
        search_radius_km = data.get('search_radius_km')
        
        # Get organ viability time
        organ_details = get_organ_details(organ_type)
        viability_hours = float(organ_details.viability_time_hours.split('-')[0])
        
        # Get active patients from database
        db_patients = session.query(Patient).filter(
            Patient.is_active == True,
            Patient.organ_required == OrganTypeEnum[organ_type.value.upper()]
        ).all()
        
        # Convert to PatientRegistration models
        patient_models = []
        for p in db_patients:
            patient_models.append(PatientRegistration(
                patient_id=p.patient_id,
                name=p.name,
                age=p.age,
                blood_type=p.blood_type.value,
                organ_required=p.organ_required.value,
                urgency_level=p.urgency_level,
                location=Location(lat=p.latitude, lng=p.longitude),
                medical_status=p.medical_status,
                contact_info=p.contact_info
            ))
        
        # Find matches
        matches, error = matching_engine.find_matches(
            donor_id=donor_id,
            donor_blood_type=donor_blood_type,
            donor_location=donor_location,
            organ_type=organ_type,
            organ_viability_hours=viability_hours,
            recipients=patient_models,
            search_radius_km=search_radius_km
        )
        
        # Store matches in database
        for match in matches:
            db_match = Match(
                match_id=match.match_id,
                donor_id=match.donor_id,
                recipient_id=match.recipient_id,
                organ_type=OrganTypeEnum[match.organ_type.value.upper()],
                match_score=match.match_score,
                compatibility_score=match.compatibility_score,
                proximity_km=match.proximity_km,
                urgency_level=match.urgency_level,
                survival_probability=match.survival_probability,
                criticality=match.criticality
            )
            session.add(db_match)
        
        session.commit()
        
        response_data = {
            "matches": [m.model_dump() for m in matches],
            "count": len(matches)
        }
        
        # Handle no match scenario
        if error:
            # Create donor availability notification
    try:
        session = get_db()
        
        # Base query
        query = session.query(Match)
        
        # Get parameters
        sort_by = request.args.get('sort_by', 'match_score')
        order = request.args.get('order', 'desc')
        export_format = request.args.get('format', 'json')
        min_score = request.args.get('min_score', type=float)
        
        # Apply filters
        if min_score:
            query = query.filter(Match.match_score >= min_score)
        
        # Apply sorting
        sort_column = getattr(Match, sort_by, Match.match_score)
        if order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Get results
        matches = query.all()
        match_dicts = [m.to_dict() for m in matches]
        
        # Return based on format
        if export_format == 'json':
            return jsonify(match_dicts)
        elif export_format in ['csv', 'html']:
            # Convert to MatchOutput models for export
            match_models = []
            for m in match_dicts:
                match_models.append(MatchOutput(**m))
            result = data_exporter.export_matches(match_models, format=export_format)
            
            if export_format == 'csv':
                return Response(result, mimetype='text/csv', headers={
                    'Content-Disposition': 'attachment; filename=matches.csv'
                })
            else:
            )
        
        # Store matches
        matches_db.extend(matches)
        
        response_data = {
            "matches": [m.model_dump() for m in matches],
            "count": len(matches)
        }
        
        # Handle no match scenario
        if error:
            # Create donor availability notification
            donor_notification = error_handler.create_donor_availability_notification(
                donor_id=donor_id,
                organs=[organ_type],
                blood_type=donor_blood_type,
                location_city="Bangalore",
                age=40,
                purpose="regional_alert"
            )
            
            response_data["error"] = error.model_dump()
            response_data["donor_availability_notification"] = donor_notification.model_dump()
        
        return jsonify(response_data), 200
    
    except Exception as e:
        error = error_handler.handle_system_error(
            module="matching_engine",
            error_message="Failed to process match request",
            technical_details=str(e)
        )
        return jsonify({"error": error.model_dump()}), 500


@app.route('/api/matches', methods=['GET'])
def get_matches():
    """
    Get all matches with optional sorting and filtering
    
    Query Params:
        - sort_by: Field to sort by (match_score, urgency_level, proximity_km, survival_probability)
        - order: Sort order (asc/desc, default: desc)
        - format: Export format (json/csv/html, default: json)
        - min_score: Minimum match score filter
    
    Returns:
        List of matches
    """
    sort_by = request.args.get('sort_by', 'match_score')
    order = request.args.get('order', 'desc')
    export_format = request.args.get('format', 'json')
    min_score = request.args.get('min_score', type=float)
    
    # Filter matches
    filtered_matches = matches_db.copy()
    
    if min_score:
        filtered_matches = [m for m in filtered_matches if m.match_score >= min_score]
    
    # Export with sorting
    try:
        result = data_exporter.export_matches(
            filtered_matches,
            format=export_format,
            sort_by=sort_by,
            reverse=(order == 'desc')
        )
        
        if export_format == 'json':
            return Response(result, mimetype='application/json')
        elif export_format == 'csv':
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=matches.csv'
            })
        elif export_format == 'html':
            return Response(result, mimetype='text/html')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =====================
# Route Planning
# =====================

@app.route('/api/routes/plan', methods=['POST'])
def plan_routes():
    """
    Generate optimal transport routes
    
    Request Body:
        - origin: {lat, lng}
        - destination: {lat, lng}
        - match_id: Associated match ID
        - num_routes: Number of routes to generate (default: 4)
    
    Returns:
        List of route options
    """
    try:
        data = request.get_json()
        
        origin = Location(**data['origin'])
        destination = Location(**data['destination'])
        match_id = data['match_id']
        num_routes = data.get('num_routes', 4)
        
        # Generate routes
        routes = route_optimizer.generate_routes(
            origin=origin,
            destination=destination,
            match_id=match_id,
            num_routes=num_routes
        )
        
        # Store routes
        routes_db.extend(routes)
        
        # Create green corridor notification for best route
        if routes:
            gc_notification = route_optimizer.create_green_corridor_notification(
                route=routes[0],
                match_id=match_id,
                organ_type=data.get('organ_type', 'Organ')
            )
            
            return jsonify({
                "routes": [r.model_dump() for r in routes],
                "green_corridor_notification": gc_notification.model_dump()
            }), 200
        
        return jsonify({"routes": []}), 200
    
    except Exception as e:
        error = error_handler.handle_transport_error(
            route_id="UNKNOWN",
            error_type="route_planning_failure",
            match_id=data.get('match_id', 'UNKNOWN'),
            organ_type=data.get('organ_type', 'UNKNOWN')
        )
        return jsonify({"error": error.model_dump()}), 500


@app.route('/api/routes', methods=['GET'])
def get_routes():
    """
    Get all routes with optional sorting
    
    Query Params:
        - sort_by: Field to sort by (estimated_time_min, distance_km, risk_level)
        - order: Sort order (asc/desc, default: asc)
        - format: Export format (json/csv/html, default: json)
    
    Returns:
        List of routes
    """
    sort_by = request.args.get('sort_by', 'estimated_time_min')
    order = request.args.get('order', 'asc')
    export_format = request.args.get('format', 'json')
    
    # Export with sorting
    try:
        result = data_exporter.export_routes(
            routes_db,
            format=export_format,
            sort_by=sort_by,
            reverse=(order == 'desc')
        )
        
        if export_format == 'json':
            return Response(result, mimetype='application/json')
        elif export_format == 'csv':
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=routes.csv'
            })
        elif export_format == 'html':
            return Response(result, mimetype='text/html')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =====================
# Notifications
# =====================

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """
    Get notifications with optional filtering
    
    Query Params:
        - recipient_id: Filter by recipient
        - status: Filter by status
        - format: Export format (json/csv/html, default: json)
    
    Returns:
        List of notifications
    """
    recipient_id = request.args.get('recipient_id')
    status = request.args.get('status')
    export_format = request.args.get('format', 'json')
    
    # Get notifications
    notifications = notification_service.notification_log
    
    if recipient_id:
        notifications = [n for n in notifications if n.recipient_id == recipient_id]
    
    if status:
        notifications = [n for n in notifications if n.status.value == status]
    
    # Export
    try:
        result = data_exporter.export_notifications(
            notifications,
            format=export_format
        )
        
        if export_format == 'json':
            return Response(result, mimetype='application/json')
        elif export_format == 'csv':
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=notifications.csv'
            })
        elif export_format == 'html':
            return Response(result, mimetype='text/html')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =====================
# Error Handling
# =====================

@app.route('/api/errors', methods=['GET'])
def get_errors():
    """
    Get error logs with optional filtering
    
    Query Params:
        - error_type: Filter by error type
        - severity: Filter by severity
        - unresolved_only: Show only unresolved errors (true/false)
        - format: Export format (json/csv/html, default: json)
    
    Returns:
        List of errors
    """
    error_type = request.args.get('error_type')
    severity = request.args.get('severity')
    unresolved_only = request.args.get('unresolved_only', 'false').lower() == 'true'
    export_format = request.args.get('format', 'json')
    
    # Get errors
    if unresolved_only:
        errors = error_handler.get_unresolved_errors()
    else:
        errors = error_handler.error_log
    
    if error_type:
        errors = [e for e in errors if e.error_type == error_type]
    
    if severity:
        errors = [e for e in errors if e.severity == severity]
    
    # Export
    try:
        result = data_exporter.export_errors(
            errors,
            format=export_format
        )
        
        if export_format == 'json':
            return Response(result, mimetype='application/json')
        elif export_format == 'csv':
            return Response(result, mimetype='text/csv', headers={
                'Content-Disposition': 'attachment; filename=errors.csv'
            })
        elif export_format == 'html':
            return Response(result, mimetype='text/html')
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/errors/summary', methods=['GET'])
def get_error_summary():
    """
    Get error statistics summary
    
    Returns:
        Error summary statistics
    """
    return jsonify(error_handler.get_error_summary())


# =====================
# Secure Chat
# =====================

@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    """
    Send encrypted chat message
    
    Request Body:
        - sender_id: Sender ID
        - recipient_id: Recipient ID
        - message: Message content
        - case_id: Associated case/match ID
    
    Returns:
        Message metadata
    """
    try:
        data = request.get_json()
        result = secure_chat.send_message(
            sender_id=data['sender_id'],
            recipient_id=data['recipient_id'],
            message=data['message'],
            case_id=data['case_id']
        )
        return jsonify(result), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/chat/audit', methods=['GET'])
def get_chat_audit():
    """
    Get audit log for compliance
    
    Query Params:
        - case_id: Filter by case ID
    
    Returns:
        Audit log entries
    """
    case_id = request.args.get('case_id')
    logs = secure_chat.get_audit_log(case_id=case_id)
    return jsonify(logs)


# =====================
# Run Application
# =====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║  Organ Donation Coordination Platform                        ║
    ║  Version 1.0.0                                               ║
    ╚══════════════════════════════════════════════════════════════╝
    
    Server running on http://localhost:{port}
    
    API Endpoints:
    - GET  /health                    Health check
    - GET  /api/organs                Get all organ specifications
    - POST /api/patients              Register new patient
    - GET  /api/patients              Get all patients
    - POST /api/matches/find          Find matches for donor
    - GET  /api/matches               Get all matches
    - POST /api/routes/plan           Plan transport routes
    - GET  /api/routes                Get all routes
    - GET  /api/notifications         Get notifications
    - GET  /api/errors                Get error logs
    - GET  /api/errors/summary        Get error statistics
    - POST /api/chat/send             Send secure message
    - GET  /api/chat/audit            Get audit logs
    
    Region: Bangalore, Karnataka, India (560076)
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)

'''
