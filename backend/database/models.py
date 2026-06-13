"""
Database models for SQLite
Maps all data structures to SQLAlchemy ORM models
"""

from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, JSON, Enum as SQLEnum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum

Base = declarative_base()


# Enums
class BloodTypeEnum(enum.Enum):
    A = "A"
    B = "B"
    AB = "AB"
    O = "O"


class OrganTypeEnum(enum.Enum):
    HEART = "Heart"
    LUNGS = "Lungs"
    KIDNEYS = "Kidneys"
    LIVER = "Liver"
    PANCREAS = "Pancreas"
    INTESTINE = "Intestine"


class RiskLevelEnum(enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class NotificationStatusEnum(enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class RecipientTypeEnum(enum.Enum):
    DOCTOR = "doctor"
    ADMIN = "admin"
    TRAFFIC = "traffic"
    GOVERNMENT = "government"


class UserRoleEnum(enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"


# Database Models


class User(Base):
    """User accounts for login (admin/doctor)."""

    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    role = Column(SQLEnum(UserRoleEnum), nullable=False, index=True)
    password_hash = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<User {self.user_id} ({self.role.value})>"

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'name': self.name,
            'role': self.role.value,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
        }

class Patient(Base):
    """Patient Registration table"""
    __tablename__ = 'patients'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    age = Column(Integer, nullable=False)
    blood_type = Column(SQLEnum(BloodTypeEnum), nullable=False, index=True)
    organ_required = Column(SQLEnum(OrganTypeEnum), nullable=False, index=True)
    urgency_level = Column(Integer, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    medical_status = Column(Text, nullable=False)
    contact_info = Column(String(200), nullable=False)
    extra_data = Column(JSON, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<Patient {self.patient_id} - {self.name}>"
    
    def to_dict(self):
        return {
            'patient_id': self.patient_id,
            'name': self.name,
            'age': self.age,
            'blood_type': self.blood_type.value,
            'organ_required': self.organ_required.value,
            'urgency_level': self.urgency_level,
            'location': {
                'lat': self.latitude,
                'lng': self.longitude
            },
            'medical_status': self.medical_status,
            'contact_info': self.contact_info,
            'extra_data': self.extra_data,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }


class Donor(Base):
    """Donor information table"""
    __tablename__ = 'donors'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    donor_id = Column(String(50), unique=True, nullable=False, index=True)
    blood_type = Column(SQLEnum(BloodTypeEnum), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    medical_status = Column(Text)
    available_organs = Column(JSON, nullable=False)  # List of organ types
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<Donor {self.donor_id}>"
    
    def to_dict(self):
        return {
            'donor_id': self.donor_id,
            'blood_type': self.blood_type.value,
            'age': self.age,
            'location': {
                'lat': self.latitude,
                'lng': self.longitude
            },
            'medical_status': self.medical_status,
            'available_organs': self.available_organs,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }


class Match(Base):
    """Transplant Match results table"""
    __tablename__ = 'matches'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(String(50), unique=True, nullable=False, index=True)
    donor_id = Column(String(50), nullable=False, index=True)
    recipient_id = Column(String(50), nullable=False, index=True)
    organ_type = Column(SQLEnum(OrganTypeEnum), nullable=False)
    match_score = Column(Float, nullable=False, index=True)
    compatibility_score = Column(Float, nullable=False)
    proximity_km = Column(Float, nullable=False)
    urgency_level = Column(Integer, nullable=False)
    survival_probability = Column(Float, nullable=False)
    criticality = Column(String(20), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(String(20), default='pending', nullable=False)  # pending, accepted, rejected, completed
    
    def __repr__(self):
        return f"<Match {self.match_id} - Score: {self.match_score}>"
    
    def to_dict(self):
        return {
            'match_id': self.match_id,
            'donor_id': self.donor_id,
            'recipient_id': self.recipient_id,
            'organ_type': self.organ_type.value,
            'match_score': self.match_score,
            'compatibility_score': self.compatibility_score,
            'proximity_km': self.proximity_km,
            'urgency_level': self.urgency_level,
            'survival_probability': self.survival_probability,
            'criticality': self.criticality,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status
        }


class TransportRoute(Base):
    """Transport routing information table"""
    __tablename__ = 'transport_routes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(String(50), unique=True, nullable=False, index=True)
    match_id = Column(String(50), nullable=False, index=True)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    estimated_time_min = Column(Integer, nullable=False, index=True)
    directions = Column(JSON, nullable=False)  # List of direction strings
    risk_level = Column(SQLEnum(RiskLevelEnum), nullable=False)
    traffic_status = Column(String(20), default='normal')
    green_corridor_status = Column(String(20), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<Route {self.route_id} - {self.estimated_time_min} min>"
    
    def to_dict(self):
        return {
            'route_id': self.route_id,
            'match_id': self.match_id,
            'origin': {
                'lat': self.origin_lat,
                'lng': self.origin_lng
            },
            'destination': {
                'lat': self.destination_lat,
                'lng': self.destination_lng
            },
            'distance_km': self.distance_km,
            'estimated_time_min': self.estimated_time_min,
            'directions': self.directions,
            'risk_level': self.risk_level.value,
            'traffic_status': self.traffic_status,
            'green_corridor_status': self.green_corridor_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Notification(Base):
    """Notifications and alerts table"""
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(50), unique=True, nullable=False, index=True)
    recipient_type = Column(SQLEnum(RecipientTypeEnum), nullable=False, index=True)
    recipient_id = Column(String(100), nullable=False, index=True)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(SQLEnum(NotificationStatusEnum), nullable=False, index=True)
    priority = Column(String(20), default='normal', nullable=False)
    metadata_json = Column('metadata', JSON)  # Additional metadata (column name preserved)
    read_at = Column(DateTime)
    
    def __repr__(self):
        return f"<Notification {self.alert_id} - {self.status.value}>"
    
    def to_dict(self):
        return {
            'alert_id': self.alert_id,
            'recipient_type': self.recipient_type.value,
            'recipient_id': self.recipient_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status.value,
            'priority': self.priority,
            'metadata': self.metadata_json,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }


class Error(Base):
    """Error handling and logging table"""
    __tablename__ = 'errors'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    error_id = Column(String(50), unique=True, nullable=False, index=True)
    error_type = Column(String(50), nullable=False, index=True)
    module = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    technical_details = Column(Text)
    recommended_action = Column(Text, nullable=False)
    escalation_status = Column(String(20), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    affected_entities = Column(JSON)  # List of affected IDs
    severity = Column(String(20), nullable=False, index=True)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    def __repr__(self):
        return f"<Error {self.error_id} - {self.severity}>"
    
    def to_dict(self):
        return {
            'error_id': self.error_id,
            'error_type': self.error_type,
            'module': self.module,
            'message': self.message,
            'technical_details': self.technical_details,
            'recommended_action': self.recommended_action,
            'escalation_status': self.escalation_status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'affected_entities': self.affected_entities,
            'severity': self.severity,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_notes': self.resolution_notes
        }


class ChatMessage(Base):
    """Secure chat messages table"""
    __tablename__ = 'chat_messages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(50), unique=True, nullable=False, index=True)
    sender_id = Column(String(100), nullable=False, index=True)
    recipient_id = Column(String(100), nullable=False, index=True)
    case_id = Column(String(50), nullable=False, index=True)
    encrypted_content = Column(Text, nullable=False)
    message_type = Column(String(20), default='text', nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(String(20), default='sent', nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime)
    
    def __repr__(self):
        return f"<ChatMessage {self.message_id}>"
    
    def to_dict(self):
        return {
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'case_id': self.case_id,
            'message_type': self.message_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'status': self.status,
            'read': self.read,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }


class AuditLog(Base):
    """Audit logging for compliance table"""
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100), nullable=False, index=True)
    user_id = Column(String(100), index=True)
    entity_type = Column(String(50), index=True)
    entity_id = Column(String(50), index=True)
    case_id = Column(String(50), index=True)
    details = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = Column(String(50))
    severity = Column(String(20), default='normal')
    
    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_id}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'user_id': self.user_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'case_id': self.case_id,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'severity': self.severity
        }


class DonorAvailability(Base):
    """Donor availability notifications for research/education table"""
    __tablename__ = 'donor_availability'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    notification_id = Column(String(50), unique=True, nullable=False, index=True)
    organs = Column(JSON, nullable=False)  # List of organ types
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    recipient_type = Column(SQLEnum(RecipientTypeEnum), nullable=False)
    recipient_id = Column(String(100), nullable=False)
    purpose = Column(String(50), nullable=False)  # research, education, regional_alert
    anonymized_data = Column(JSON, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    
    def __repr__(self):
        return f"<DonorAvailability {self.notification_id}>"
    
    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'organs': self.organs,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'recipient': self.recipient_type.value,
            'recipient_id': self.recipient_id,
            'purpose': self.purpose,
            'anonymized_data': self.anonymized_data
        }


# Database connection and session management

def get_engine(database_url='sqlite:///organ_donation.db'):
    """Create database engine"""
    return create_engine(database_url, echo=False)


def get_session(engine):
    """Create database session"""
    Session = sessionmaker(bind=engine)
    return Session()


def init_database(database_url='sqlite:///organ_donation.db'):
    """Initialize database - create all tables"""
    engine = get_engine(database_url)
    Base.metadata.create_all(engine)
    print(f"✅ Database initialized: {database_url}")
    return engine
