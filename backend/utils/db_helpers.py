"""
Database utility functions for app.py
Helper functions to convert between database models and Pydantic models
"""

from backend.models import PatientRegistration, Location
from backend.database.models import Patient


def patient_db_to_pydantic(patient: Patient) -> PatientRegistration:
    """Convert database Patient to Pydantic PatientRegistration"""
    return PatientRegistration(
        patient_id=patient.patient_id,
        name=patient.name,
        age=patient.age,
        blood_type=patient.blood_type.value,
        organ_required=patient.organ_required.value,
        urgency_level=patient.urgency_level,
        location=Location(lat=patient.latitude, lng=patient.longitude),
        medical_status=patient.medical_status,
        contact_info=patient.contact_info,
        registered_at=patient.registered_at
    )
