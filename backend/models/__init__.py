"""
Package initialization for models
"""

from backend.models.schemas import (
    OrganTypeDetails,
    PatientRegistration,
    MatchOutput,
    TransportRoute,
    Notification,
    ErrorHandling,
    DonorAvailability,
    BloodType,
    OrganType,
    UrgencyLevel,
    RiskLevel,
    NotificationStatus,
    RecipientType,
    Location
)

from backend.models.organs import (
    ORGAN_SPECIFICATIONS,
    get_organ_details,
    get_all_organ_details,
    is_blood_type_compatible
)

__all__ = [
    # Schemas
    'OrganTypeDetails',
    'PatientRegistration',
    'MatchOutput',
    'TransportRoute',
    'Notification',
    'ErrorHandling',
    'DonorAvailability',
    'Location',
    
    # Enums
    'BloodType',
    'OrganType',
    'UrgencyLevel',
    'RiskLevel',
    'NotificationStatus',
    'RecipientType',
    
    # Functions
    'ORGAN_SPECIFICATIONS',
    'get_organ_details',
    'get_all_organ_details',
    'is_blood_type_compatible'
]
