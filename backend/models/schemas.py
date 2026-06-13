"""
Data models for the Organ Donation Coordination Platform
Adheres to specified schemas for OrganTypeDetails, PatientRegistration, 
MatchOutput, TransportRoute, Notification, and ErrorHandling
"""

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# ===========================
# Enums and Type Definitions
# ===========================

class BloodType(str, Enum):
    A = "A"
    B = "B"
    AB = "AB"
    O = "O"


class OrganType(str, Enum):
    HEART = "Heart"
    LUNGS = "Lungs"
    KIDNEYS = "Kidneys"
    LIVER = "Liver"
    PANCREAS = "Pancreas"
    INTESTINE = "Intestine"


class UrgencyLevel(int, Enum):
    LOW = 1
    MODERATE = 2
    MEDIUM = 3
    HIGH = 4
    CRITICAL = 5


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class NotificationStatus(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class RecipientType(str, Enum):
    DOCTOR = "doctor"
    ADMIN = "admin"
    TRAFFIC = "traffic"
    GOVERNMENT = "government"


# ===========================
# Core Data Models
# ===========================

class OrganTypeDetails(BaseModel):
    """
    Detailed specifications for each organ type including storage and preservation requirements
    """
    organ: OrganType
    normal_storage_temp_C: str = Field(description="Temperature range in Celsius")
    viability_time_hours: str = Field(description="Maximum viability time in cold storage")
    preservation_solutions: List[str] = Field(description="Common preservation solutions used")
    
    class Config:
        json_schema_extra = {
            "example": {
                "organ": "Heart",
                "normal_storage_temp_C": "0-8 (typically 4)",
                "viability_time_hours": "4-6",
                "preservation_solutions": ["UW", "Custodiol"]
            }
        }


class Location(BaseModel):
    """Geographic coordinates"""
    lat: float = Field(ge=-90, le=90, description="Latitude")
    lng: float = Field(ge=-180, le=180, description="Longitude")


class PatientRegistration(BaseModel):
    """
    Patient registration details for organ transplant waiting list
    """
    patient_id: str = Field(description="Unique patient identifier")
    name: str = Field(min_length=1, description="Patient full name")
    age: int = Field(ge=0, le=120, description="Patient age in years")
    blood_type: BloodType
    organ_required: OrganType
    urgency_level: int = Field(ge=1, le=5, description="Urgency from 1 (low) to 5 (critical)")
    location: Location
    medical_status: str = Field(description="Current medical condition summary")
    contact_info: str = Field(description="Contact information (encrypted)")
    registered_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "P-2026-00123",
                "name": "John Doe",
                "age": 45,
                "blood_type": "O",
                "organ_required": "Heart",
                "urgency_level": 4,
                "location": {"lat": 12.9716, "lng": 77.5946},
                "medical_status": "Congestive heart failure, LVEF 25%",
                "contact_info": "+91-9876543210"
            }
        }


class MatchOutput(BaseModel):
    """
    Result of matching algorithm showing potential transplant match
    """
    match_id: str = Field(description="Unique match identifier")
    donor_id: str = Field(description="Donor identifier")
    recipient_id: str = Field(description="Recipient patient identifier")
    organ_type: OrganType
    match_score: float = Field(ge=0, le=100, description="Overall match score (0-100)")
    compatibility_score: float = Field(ge=0, le=100, description="Medical compatibility score")
    proximity_km: float = Field(ge=0, description="Distance between donor and recipient in km")
    urgency_level: int = Field(ge=1, le=5)
    survival_probability: float = Field(ge=0, le=1, description="Predicted survival probability (0-1)")
    criticality: str = Field(description="Criticality assessment (Low/Medium/High/Critical)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('survival_probability')
    @classmethod
    def validate_survival_probability(cls, v):
        if v < 0.5:
            raise ValueError("Survival probability must be at least 50% (0.5)")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
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
        }


class TransportRoute(BaseModel):
    """
    Optimized transport route for organ delivery
    """
    route_id: str = Field(description="Unique route identifier")
    origin: Location
    destination: Location
    distance_km: float = Field(ge=0, description="Total distance in kilometers")
    estimated_time_min: int = Field(ge=0, description="Estimated travel time in minutes")
    directions: List[str] = Field(description="Turn-by-turn directions/waypoints")
    risk_level: RiskLevel
    traffic_status: Optional[str] = Field(default="normal", description="Current traffic conditions")
    green_corridor_status: Optional[str] = Field(default="pending", description="Green corridor approval status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "route_id": "R-2026-00111",
                "origin": {"lat": 12.9716, "lng": 77.5946},
                "destination": {"lat": 13.0827, "lng": 77.5877},
                "distance_km": 15.2,
                "estimated_time_min": 28,
                "directions": [
                    "Start at Victoria Hospital, Bangalore",
                    "Head north on KR Road",
                    "Turn right onto MG Road",
                    "Continue to Manipal Hospital, Whitefield"
                ],
                "risk_level": "low",
                "traffic_status": "moderate",
                "green_corridor_status": "approved"
            }
        }


class Notification(BaseModel):
    """
    Alert/notification for stakeholders
    """
    alert_id: str = Field(description="Unique alert identifier")
    recipient_type: RecipientType
    recipient_id: str = Field(description="Recipient identifier")
    content: str = Field(description="Notification message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: NotificationStatus
    priority: Optional[str] = Field(default="normal", description="Priority level: low/normal/high/critical")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "alert_id": "N-2026-00222",
                "recipient_type": "traffic",
                "recipient_id": "TRAFFIC-DEPT-BLR-001",
                "content": "Green corridor requested: Victoria Hospital to Manipal Hospital, Whitefield. ETA: 28 minutes. Route: R-2026-00111",
                "timestamp": "2026-01-03T10:35:00Z",
                "status": "sent",
                "priority": "critical"
            }
        }


class ErrorHandling(BaseModel):
    """
    Error tracking and management structure
    """
    error_id: str = Field(description="Unique error identifier")
    error_type: Literal["no_match", "system_error", "privacy_breach", "data_error", "transport_error"]
    module: str = Field(description="Module where error occurred")
    message: str = Field(description="Error message for users")
    technical_details: Optional[str] = Field(default=None, description="Technical details (logged only)")
    recommended_action: str = Field(description="Suggested resolution steps")
    escalation_status: Literal["none", "pending", "escalated", "resolved"]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    affected_entities: Optional[List[str]] = Field(default=None, description="IDs of affected patients/donors/etc")
    severity: Literal["low", "medium", "high", "critical"]
    
    class Config:
        json_schema_extra = {
            "example": {
                "error_id": "E-2026-00333",
                "error_type": "no_match",
                "module": "matching_engine",
                "message": "No suitable matches found for patient P-2026-00123. Expanding search radius.",
                "technical_details": "Blood type O, Heart required, urgency 4, searched within 10km radius",
                "recommended_action": "Expand search radius to 50km and notify regional coordination center",
                "escalation_status": "pending",
                "timestamp": "2026-01-03T10:40:00Z",
                "affected_entities": ["P-2026-00123"],
                "severity": "high"
            }
        }


class DonorAvailability(BaseModel):
    """
    Notification for organ availability (no match scenario)
    """
    notification_id: str
    organs: List[OrganType]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    recipient: RecipientType
    recipient_id: str
    purpose: Literal["research", "education", "regional_alert"]
    anonymized_data: dict = Field(description="Anonymized donor data for research/education")
    
    class Config:
        json_schema_extra = {
            "example": {
                "notification_id": "DA-2026-00444",
                "organs": ["Kidneys", "Liver"],
                "timestamp": "2026-01-03T11:00:00Z",
                "recipient": "government",
                "recipient_id": "NOTTO-KARNATAKA",
                "purpose": "regional_alert",
                "anonymized_data": {
                    "blood_type": "AB",
                    "age_range": "40-50",
                    "location_city": "Bangalore"
                }
            }
        }
