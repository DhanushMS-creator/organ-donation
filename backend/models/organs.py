"""
Organ type specifications and constants
"""

from backend.models.schemas import OrganTypeDetails, OrganType


# Comprehensive organ specifications
ORGAN_SPECIFICATIONS = [
    OrganTypeDetails(
        organ=OrganType.HEART,
        normal_storage_temp_C="0-8 (typically 4)",
        viability_time_hours="4-6",
        preservation_solutions=["UW (University of Wisconsin)", "Custodiol", "Celsior"]
    ),
    OrganTypeDetails(
        organ=OrganType.LUNGS,
        normal_storage_temp_C="4-8",
        viability_time_hours="6-8",
        preservation_solutions=["Perfadex", "Steen Solution", "UW"]
    ),
    OrganTypeDetails(
        organ=OrganType.KIDNEYS,
        normal_storage_temp_C="0-4",
        viability_time_hours="24-36",
        preservation_solutions=["UW", "HTK (Custodiol)", "Soltran"]
    ),
    OrganTypeDetails(
        organ=OrganType.LIVER,
        normal_storage_temp_C="0-4",
        viability_time_hours="12-18",
        preservation_solutions=["UW", "HTK (Custodiol)", "IGL-1"]
    ),
    OrganTypeDetails(
        organ=OrganType.PANCREAS,
        normal_storage_temp_C="0-4",
        viability_time_hours="12-24",
        preservation_solutions=["UW", "HTK (Custodiol)", "Celsior"]
    ),
    OrganTypeDetails(
        organ=OrganType.INTESTINE,
        normal_storage_temp_C="0-4",
        viability_time_hours="8-16",
        preservation_solutions=["UW", "HTK (Custodiol)"]
    )
]


def get_organ_details(organ_type: OrganType) -> OrganTypeDetails:
    """
    Retrieve detailed specifications for a specific organ type
    
    Args:
        organ_type: The organ type to look up
        
    Returns:
        OrganTypeDetails object with specifications
    """
    for organ in ORGAN_SPECIFICATIONS:
        if organ.organ == organ_type:
            return organ
    raise ValueError(f"Unknown organ type: {organ_type}")


def get_all_organ_details() -> list:
    """
    Get all organ specifications as a list of dictionaries
    
    Returns:
        List of organ specifications
    """
    return [organ.model_dump() for organ in ORGAN_SPECIFICATIONS]


# Blood type compatibility matrix
BLOOD_TYPE_COMPATIBILITY = {
    "O": ["O", "A", "B", "AB"],  # O can donate to all
    "A": ["A", "AB"],             # A can donate to A and AB
    "B": ["B", "AB"],             # B can donate to B and AB
    "AB": ["AB"]                  # AB can only donate to AB
}


def is_blood_type_compatible(donor_blood_type: str, recipient_blood_type: str) -> bool:
    """
    Check if donor and recipient blood types are compatible
    
    Args:
        donor_blood_type: Donor's blood type
        recipient_blood_type: Recipient's blood type
        
    Returns:
        True if compatible, False otherwise
    """
    if donor_blood_type not in BLOOD_TYPE_COMPATIBILITY:
        return False
    return recipient_blood_type in BLOOD_TYPE_COMPATIBILITY[donor_blood_type]
