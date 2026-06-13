"""
Matching Algorithm Engine for Organ Transplant Coordination
Implements multi-criteria ranking based on:
- Medical Compatibility (blood type, tissue type)
- Geographic Proximity (expandable radius)
- Urgency Level
- Success Probability (minimum 50% survival chance)
"""

import math
from typing import List, Optional, Tuple
from datetime import datetime
from haversine import haversine, Unit

from backend.models.schemas import (
    PatientRegistration,
    MatchOutput,
    OrganType,
    Location,
    ErrorHandling
)
from backend.models.organs import is_blood_type_compatible


class MatchingEngine:
    """
    Core matching algorithm for organ donation coordination
    """
    
    def __init__(
        self,
        urgency_weight: float = 0.4,
        compatibility_weight: float = 0.35,
        proximity_weight: float = 0.25,
        min_survival_probability: float = 0.5,
        initial_search_radius_km: float = 10.0,
        max_search_radius_km: float = 500.0
    ):
        """
        Initialize matching engine with configurable weights
        
        Args:
            urgency_weight: Weight for urgency level (default 0.4)
            compatibility_weight: Weight for medical compatibility (default 0.35)
            proximity_weight: Weight for geographic proximity (default 0.25)
            min_survival_probability: Minimum required survival probability (default 0.5)
            initial_search_radius_km: Starting search radius (default 10 km)
            max_search_radius_km: Maximum search radius (default 500 km)
        """
        # Validate weights sum to 1.0
        total_weight = urgency_weight + compatibility_weight + proximity_weight
        if not math.isclose(total_weight, 1.0, rel_tol=1e-5):
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")
        
        self.urgency_weight = urgency_weight
        self.compatibility_weight = compatibility_weight
        self.proximity_weight = proximity_weight
        self.min_survival_probability = min_survival_probability
        self.initial_search_radius_km = initial_search_radius_km
        self.max_search_radius_km = max_search_radius_km
    
    def calculate_distance(self, loc1: Location, loc2: Location) -> float:
        """
        Calculate distance between two locations using Haversine formula
        
        Args:
            loc1: First location
            loc2: Second location
            
        Returns:
            Distance in kilometers
        """
        point1 = (loc1.lat, loc1.lng)
        point2 = (loc2.lat, loc2.lng)
        return haversine(point1, point2, unit=Unit.KILOMETERS)
    
    def calculate_compatibility_score(
        self,
        donor_blood_type: str,
        recipient_blood_type: str,
        organ_type: OrganType
    ) -> float:
        """
        Calculate medical compatibility score (0-100)
        
        Args:
            donor_blood_type: Donor's blood type
            recipient_blood_type: Recipient's blood type
            organ_type: Type of organ being transplanted
            
        Returns:
            Compatibility score (0-100)
        """
        # Blood type compatibility is essential
        if not is_blood_type_compatible(donor_blood_type, recipient_blood_type):
            return 0.0
        
        base_score = 100.0
        
        # Perfect match (same blood type)
        if donor_blood_type == recipient_blood_type:
            base_score = 100.0
        # Universal donor O to others
        elif donor_blood_type == "O":
            base_score = 95.0
        # Universal recipient AB from others
        elif recipient_blood_type == "AB":
            base_score = 90.0
        # Other compatible combinations
        else:
            base_score = 85.0
        
        # Organ-specific adjustments
        # Some organs are less sensitive to blood type differences
        organ_sensitivity = {
            OrganType.KIDNEYS: 1.0,    # Most sensitive
            OrganType.HEART: 0.95,
            OrganType.LIVER: 0.90,
            OrganType.LUNGS: 0.95,
            OrganType.PANCREAS: 0.92,
            OrganType.INTESTINE: 0.93
        }
        
        sensitivity_factor = organ_sensitivity.get(organ_type, 1.0)
        return base_score * sensitivity_factor
    
    def calculate_proximity_score(
        self,
        distance_km: float,
        organ_viability_hours: float
    ) -> float:
        """
        Calculate proximity score based on distance and organ viability time
        
        Args:
            distance_km: Distance between donor and recipient
            organ_viability_hours: Maximum viability time for the organ
            
        Returns:
            Proximity score (0-100)
        """
        # Assume average transport speed of 60 km/h (with green corridor)
        transport_speed_kmh = 60.0
        transport_time_hours = distance_km / transport_speed_kmh
        
        # If transport time exceeds viability, score is very low
        if transport_time_hours >= organ_viability_hours:
            return 5.0  # Minimal score, not zero (emergency cases)
        
        # Score decreases as we approach viability limit
        time_ratio = transport_time_hours / organ_viability_hours
        
        # Non-linear scoring: heavily penalize as we get closer to limit
        if time_ratio < 0.25:
            score = 100.0
        elif time_ratio < 0.50:
            score = 90.0 - (time_ratio - 0.25) * 80
        elif time_ratio < 0.75:
            score = 70.0 - (time_ratio - 0.50) * 120
        else:
            score = 40.0 - (time_ratio - 0.75) * 140
        
        return max(5.0, score)  # Minimum score of 5
    
    def calculate_urgency_score(self, urgency_level: int) -> float:
        """
        Convert urgency level (1-5) to score (0-100)
        
        Args:
            urgency_level: Urgency level from 1 (low) to 5 (critical)
            
        Returns:
            Urgency score (0-100)
        """
        # Linear conversion: level 5 = 100, level 1 = 20
        return 20.0 + (urgency_level - 1) * 20.0
    
    def estimate_survival_probability(
        self,
        compatibility_score: float,
        proximity_score: float,
        urgency_level: int,
        recipient_age: int
    ) -> float:
        """
        Estimate post-transplant survival probability
        
        Args:
            compatibility_score: Medical compatibility score
            proximity_score: Proximity score
            urgency_level: Recipient urgency level
            recipient_age: Recipient age
            
        Returns:
            Survival probability (0-1)
        """
        # Base probability from compatibility and proximity
        base_prob = (compatibility_score / 100.0) * 0.6 + (proximity_score / 100.0) * 0.3
        
        # Age adjustment (younger patients generally have better outcomes)
        age_factor = 1.0
        if recipient_age < 18:
            age_factor = 1.1  # Children have slightly better outcomes
        elif recipient_age < 50:
            age_factor = 1.0  # Prime age
        elif recipient_age < 65:
            age_factor = 0.95  # Slightly reduced
        else:
            age_factor = 0.85  # Older patients have reduced survival
        
        # Urgency adjustment (very urgent cases may have complications)
        urgency_factor = 1.0
        if urgency_level == 5:
            urgency_factor = 0.9  # Critical patients have more risk
        elif urgency_level == 4:
            urgency_factor = 0.95
        
        survival_prob = base_prob * age_factor * urgency_factor * 1.1  # Overall adjustment
        
        # Clamp to valid range
        return max(0.0, min(1.0, survival_prob))
    
    def assess_criticality(self, urgency_level: int, survival_probability: float) -> str:
        """
        Assess overall criticality of the match
        
        Args:
            urgency_level: Urgency level (1-5)
            survival_probability: Estimated survival probability
            
        Returns:
            Criticality assessment string
        """
        if urgency_level >= 5:
            return "Critical"
        elif urgency_level >= 4 and survival_probability < 0.65:
            return "Critical"
        elif urgency_level >= 4 or survival_probability < 0.70:
            return "High"
        elif urgency_level >= 3:
            return "Medium"
        else:
            return "Low"
    
    def calculate_match_score(
        self,
        compatibility_score: float,
        proximity_score: float,
        urgency_score: float
    ) -> float:
        """
        Calculate overall match score using weighted combination
        
        Args:
            compatibility_score: Medical compatibility score (0-100)
            proximity_score: Proximity score (0-100)
            urgency_score: Urgency score (0-100)
            
        Returns:
            Overall match score (0-100)
        """
        match_score = (
            compatibility_score * self.compatibility_weight +
            proximity_score * self.proximity_weight +
            urgency_score * self.urgency_weight
        )
        return round(match_score, 2)
    
    def find_matches(
        self,
        donor_id: str,
        donor_blood_type: str,
        donor_location: Location,
        organ_type: OrganType,
        organ_viability_hours: float,
        recipients: List[PatientRegistration],
        search_radius_km: Optional[float] = None
    ) -> Tuple[List[MatchOutput], Optional[ErrorHandling]]:
        """
        Find and rank potential matches for a donor organ
        
        Args:
            donor_id: Unique donor identifier
            donor_blood_type: Donor's blood type
            donor_location: Donor's location
            organ_type: Type of organ available
            organ_viability_hours: Maximum viability time for the organ
            recipients: List of registered recipients waiting for transplant
            search_radius_km: Search radius in km (uses initial_search_radius_km if None)
            
        Returns:
            Tuple of (list of matches, optional error)
        """
        if search_radius_km is None:
            search_radius_km = self.initial_search_radius_km
        
        matches = []
        
        # Filter recipients by organ type and proximity
        for recipient in recipients:
            # Must need the same organ type
            if recipient.organ_required != organ_type:
                continue
            
            # Calculate distance
            distance_km = self.calculate_distance(donor_location, recipient.location)
            
            # Skip if outside search radius
            if distance_km > search_radius_km:
                continue
            
            # Calculate component scores
            compatibility_score = self.calculate_compatibility_score(
                donor_blood_type,
                recipient.blood_type.value,
                organ_type
            )
            
            # Skip incompatible matches
            if compatibility_score == 0.0:
                continue
            
            proximity_score = self.calculate_proximity_score(
                distance_km,
                organ_viability_hours
            )
            
            urgency_score = self.calculate_urgency_score(recipient.urgency_level)
            
            # Calculate overall match score
            match_score = self.calculate_match_score(
                compatibility_score,
                proximity_score,
                urgency_score
            )
            
            # Estimate survival probability
            survival_probability = self.estimate_survival_probability(
                compatibility_score,
                proximity_score,
                recipient.urgency_level,
                recipient.age
            )
            
            # Skip if survival probability is below minimum threshold
            if survival_probability < self.min_survival_probability:
                continue
            
            # Assess criticality
            criticality = self.assess_criticality(
                recipient.urgency_level,
                survival_probability
            )
            
            # Create match output
            match = MatchOutput(
                match_id=f"M-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{recipient.patient_id}",
                donor_id=donor_id,
                recipient_id=recipient.patient_id,
                organ_type=organ_type,
                match_score=match_score,
                compatibility_score=compatibility_score,
                proximity_km=round(distance_km, 2),
                urgency_level=recipient.urgency_level,
                survival_probability=round(survival_probability, 3),
                criticality=criticality,
                timestamp=datetime.utcnow()
            )
            
            matches.append(match)
        
        # Sort matches by match_score (descending)
        matches.sort(key=lambda x: x.match_score, reverse=True)
        
        # Check if no matches found
        error = None
        if not matches:
            error = ErrorHandling(
                error_id=f"E-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{donor_id}",
                error_type="no_match",
                module="matching_engine",
                message=f"No suitable matches found for {organ_type.value} within {search_radius_km}km radius.",
                technical_details=f"Donor: {donor_id}, Blood Type: {donor_blood_type}, Location: {donor_location}, Recipients checked: {len(recipients)}",
                recommended_action=f"Expand search radius to {min(search_radius_km * 5, self.max_search_radius_km)}km and notify regional coordination center",
                escalation_status="pending",
                affected_entities=[donor_id],
                severity="high" if organ_viability_hours < 8 else "medium"
            )
        
        return matches, error
    
    def sort_matches(
        self,
        matches: List[MatchOutput],
        sort_by: str = "match_score",
        reverse: bool = True
    ) -> List[MatchOutput]:
        """
        Sort matches by specified criteria
        
        Args:
            matches: List of matches to sort
            sort_by: Field to sort by (match_score, urgency_level, proximity_km, survival_probability)
            reverse: Sort in descending order if True
            
        Returns:
            Sorted list of matches
        """
        valid_fields = ["match_score", "urgency_level", "proximity_km", "survival_probability", "compatibility_score"]
        
        if sort_by not in valid_fields:
            raise ValueError(f"Invalid sort field. Must be one of: {valid_fields}")
        
        return sorted(matches, key=lambda x: getattr(x, sort_by), reverse=reverse)
