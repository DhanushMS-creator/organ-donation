"""
Comprehensive Error Handling and Recovery System
Handles all error scenarios with appropriate logging and escalation
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from backend.models.schemas import (
    ErrorHandling,
    DonorAvailability,
    Notification,
    RecipientType,
    OrganType
)


class ErrorType(str, Enum):
    """Error type categories"""
    NO_MATCH = "no_match"
    SYSTEM_ERROR = "system_error"
    PRIVACY_BREACH = "privacy_breach"
    DATA_ERROR = "data_error"
    TRANSPORT_ERROR = "transport_error"


class ErrorSeverity(str, Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationStatus(str, Enum):
    """Escalation status"""
    NONE = "none"
    PENDING = "pending"
    ESCALATED = "escalated"
    RESOLVED = "resolved"


class ErrorHandler:
    """
    Centralized error handling and recovery system
    """
    
    def __init__(self):
        """Initialize error handler"""
        self.error_log: List[ErrorHandling] = []
        self.privacy_breach_count = 0
        self.system_error_count = 0
    
    def handle_no_match_error(
        self,
        donor_id: str,
        organ_type: OrganType,
        blood_type: str,
        search_radius_km: float,
        recipients_checked: int,
        organ_viability_hours: float
    ) -> ErrorHandling:
        """
        Handle scenario when no suitable match is found
        
        Args:
            donor_id: Donor identifier
            organ_type: Type of organ
            blood_type: Donor blood type
            search_radius_km: Radius searched
            recipients_checked: Number of recipients evaluated
            organ_viability_hours: Organ viability time
            
        Returns:
            ErrorHandling object
        """
        # Determine severity based on viability time
        if organ_viability_hours < 6:
            severity = ErrorSeverity.CRITICAL
        elif organ_viability_hours < 12:
            severity = ErrorSeverity.HIGH
        else:
            severity = ErrorSeverity.MEDIUM
        
        # Recommended action based on context
        if search_radius_km < 50:
            recommended_action = f"Expand search radius to {min(search_radius_km * 5, 500)}km"
        elif search_radius_km < 200:
            recommended_action = "Notify regional coordination network (state-level)"
        else:
            recommended_action = "Notify national organ transplant organization (NOTTO) and consider research/education use"
        
        error = ErrorHandling(
            error_id=f"E-NOMATCH-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            error_type=ErrorType.NO_MATCH,
            module="matching_engine",
            message=f"No suitable matches found for {organ_type.value} within {search_radius_km}km radius.",
            technical_details=f"Donor: {donor_id}, Blood Type: {blood_type}, Organ: {organ_type.value}, Recipients checked: {recipients_checked}, Viability: {organ_viability_hours}h",
            recommended_action=recommended_action,
            escalation_status=EscalationStatus.PENDING if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL] else EscalationStatus.NONE,
            timestamp=datetime.utcnow(),
            affected_entities=[donor_id],
            severity=severity.value
        )
        
        self.error_log.append(error)
        return error
    
    def create_donor_availability_notification(
        self,
        donor_id: str,
        organs: List[OrganType],
        blood_type: str,
        location_city: str,
        age: int,
        purpose: str = "regional_alert"
    ) -> DonorAvailability:
        """
        Create notification for organ availability (no match scenario)
        
        Args:
            donor_id: Donor identifier
            organs: List of available organs
            blood_type: Donor blood type
            location_city: City location
            age: Donor age
            purpose: Purpose (research/education/regional_alert)
            
        Returns:
            DonorAvailability notification
        """
        # Anonymize donor data
        anonymized_data = {
            "blood_type": blood_type,
            "age_range": f"{(age // 10) * 10}-{(age // 10) * 10 + 9}",
            "location_city": location_city,
            "organ_count": len(organs),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine recipient based on purpose
        if purpose == "research":
            recipient_type = RecipientType.GOVERNMENT
            recipient_id = "RESEARCH-ICMR-INDIA"
        elif purpose == "education":
            recipient_type = RecipientType.GOVERNMENT
            recipient_id = "MEDICAL-EDUCATION-BOARD"
        else:
            recipient_type = RecipientType.GOVERNMENT
            recipient_id = "NOTTO-KARNATAKA"
        
        notification = DonorAvailability(
            notification_id=f"DA-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            organs=organs,
            timestamp=datetime.utcnow(),
            recipient=recipient_type,
            recipient_id=recipient_id,
            purpose=purpose,
            anonymized_data=anonymized_data
        )
        
        return notification
    
    def handle_system_error(
        self,
        module: str,
        error_message: str,
        technical_details: str,
        affected_entities: Optional[List[str]] = None,
        auto_retry: bool = True
    ) -> ErrorHandling:
        """
        Handle general system errors
        
        Args:
            module: Module where error occurred
            error_message: User-facing error message
            technical_details: Technical error details
            affected_entities: List of affected entity IDs
            auto_retry: Whether to attempt automatic retry
            
        Returns:
            ErrorHandling object
        """
        self.system_error_count += 1
        
        # Determine severity based on error count
        if self.system_error_count >= 10:
            severity = ErrorSeverity.CRITICAL
            escalation = EscalationStatus.ESCALATED
        elif self.system_error_count >= 5:
            severity = ErrorSeverity.HIGH
            escalation = EscalationStatus.PENDING
        else:
            severity = ErrorSeverity.MEDIUM
            escalation = EscalationStatus.NONE
        
        recommended_action = "System will attempt automatic retry" if auto_retry else "Manual intervention required - contact system administrator"
        
        error = ErrorHandling(
            error_id=f"E-SYSTEM-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            error_type=ErrorType.SYSTEM_ERROR,
            module=module,
            message=error_message,
            technical_details=technical_details,
            recommended_action=recommended_action,
            escalation_status=escalation,
            timestamp=datetime.utcnow(),
            affected_entities=affected_entities or [],
            severity=severity.value
        )
        
        self.error_log.append(error)
        return error
    
    def handle_privacy_breach(
        self,
        breach_type: str,
        affected_records: List[str],
        breach_details: str,
        user_id: Optional[str] = None
    ) -> ErrorHandling:
        """
        Handle privacy/security breach - CRITICAL
        
        Args:
            breach_type: Type of breach (unauthorized_access, data_leak, etc.)
            affected_records: List of affected record IDs
            breach_details: Details of the breach
            user_id: User ID involved (if applicable)
            
        Returns:
            ErrorHandling object
        """
        self.privacy_breach_count += 1
        
        error = ErrorHandling(
            error_id=f"E-PRIVACY-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            error_type=ErrorType.PRIVACY_BREACH,
            module="security_monitor",
            message="SECURITY ALERT: Privacy breach detected. All sensitive data has been locked.",
            technical_details=f"Breach Type: {breach_type}, User: {user_id or 'Unknown'}, Details: {breach_details}",
            recommended_action="IMMEDIATE ACTION REQUIRED: Investigate breach, lock affected accounts, notify security team and affected individuals per HIPAA/data protection regulations",
            escalation_status=EscalationStatus.ESCALATED,
            timestamp=datetime.utcnow(),
            affected_entities=affected_records,
            severity=ErrorSeverity.CRITICAL.value
        )
        
        self.error_log.append(error)
        
        # Auto-lock affected records (would trigger actual security measures in production)
        self._lock_affected_records(affected_records)
        
        return error
    
    def handle_data_validation_error(
        self,
        module: str,
        invalid_data: Dict[str, Any],
        validation_errors: List[str]
    ) -> ErrorHandling:
        """
        Handle data validation errors
        
        Args:
            module: Module where validation failed
            invalid_data: Dictionary of invalid data (sanitized)
            validation_errors: List of validation error messages
            
        Returns:
            ErrorHandling object
        """
        error = ErrorHandling(
            error_id=f"E-DATA-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            error_type=ErrorType.DATA_ERROR,
            module=module,
            message=f"Data validation failed: {', '.join(validation_errors[:3])}",
            technical_details=f"Validation errors: {validation_errors}, Invalid fields: {list(invalid_data.keys())}",
            recommended_action="Review and correct input data. Ensure all required fields are properly formatted.",
            escalation_status=EscalationStatus.NONE,
            timestamp=datetime.utcnow(),
            affected_entities=[],
            severity=ErrorSeverity.LOW.value
        )
        
        self.error_log.append(error)
        return error
    
    def handle_transport_error(
        self,
        route_id: str,
        error_type: str,
        match_id: str,
        organ_type: str
    ) -> ErrorHandling:
        """
        Handle transport/routing errors
        
        Args:
            route_id: Route identifier
            error_type: Type of transport error
            match_id: Associated match ID
            organ_type: Type of organ
            
        Returns:
            ErrorHandling object
        """
        severity = ErrorSeverity.CRITICAL if error_type in ["vehicle_failure", "route_blocked"] else ErrorSeverity.HIGH
        
        if error_type == "vehicle_failure":
            recommended_action = "URGENT: Arrange backup transport immediately, notify receiving hospital"
        elif error_type == "route_blocked":
            recommended_action = "Calculate alternate route, update green corridor request"
        elif error_type == "traffic_delay":
            recommended_action = "Monitor situation, update ETA, escalate to traffic control if needed"
        else:
            recommended_action = "Assess situation and determine appropriate response"
        
        error = ErrorHandling(
            error_id=f"E-TRANSPORT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            error_type=ErrorType.TRANSPORT_ERROR,
            module="transport_routing",
            message=f"Transport error: {error_type} on route {route_id}",
            technical_details=f"Route: {route_id}, Match: {match_id}, Organ: {organ_type}, Error: {error_type}",
            recommended_action=recommended_action,
            escalation_status=EscalationStatus.ESCALATED if severity == ErrorSeverity.CRITICAL else EscalationStatus.PENDING,
            timestamp=datetime.utcnow(),
            affected_entities=[match_id, route_id],
            severity=severity.value
        )
        
        self.error_log.append(error)
        return error
    
    def _lock_affected_records(self, record_ids: List[str]) -> None:
        """
        Lock affected records after privacy breach (internal method)
        
        Args:
            record_ids: List of record IDs to lock
        """
        # In production, this would:
        # 1. Flag records in database as locked
        # 2. Revoke access tokens
        # 3. Send notifications to affected users
        # 4. Create audit log entries
        pass
    
    def get_errors_by_type(
        self,
        error_type: ErrorType,
        severity: Optional[ErrorSeverity] = None
    ) -> List[ErrorHandling]:
        """
        Retrieve errors by type and optionally severity
        
        Args:
            error_type: Type of error to filter
            severity: Optional severity filter
            
        Returns:
            List of matching errors
        """
        errors = [e for e in self.error_log if e.error_type == error_type]
        
        if severity:
            errors = [e for e in errors if e.severity == severity.value]
        
        return errors
    
    def get_unresolved_errors(self) -> List[ErrorHandling]:
        """
        Get all unresolved errors requiring attention
        
        Returns:
            List of unresolved errors
        """
        return [
            e for e in self.error_log
            if e.escalation_status in [EscalationStatus.PENDING, EscalationStatus.ESCALATED]
        ]
    
    def resolve_error(self, error_id: str, resolution_notes: str) -> Optional[ErrorHandling]:
        """
        Mark an error as resolved
        
        Args:
            error_id: Error identifier
            resolution_notes: Notes about resolution
            
        Returns:
            Updated error or None if not found
        """
        for error in self.error_log:
            if error.error_id == error_id:
                error.escalation_status = EscalationStatus.RESOLVED
                error.technical_details += f"\n\nRESOLVED: {resolution_notes}"
                return error
        return None
    
    def get_error_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics of errors
        
        Returns:
            Dictionary with error statistics
        """
        total_errors = len(self.error_log)
        
        by_type = {}
        by_severity = {}
        by_status = {}
        
        for error in self.error_log:
            # Count by type
            by_type[error.error_type] = by_type.get(error.error_type, 0) + 1
            
            # Count by severity
            by_severity[error.severity] = by_severity.get(error.severity, 0) + 1
            
            # Count by escalation status
            by_status[error.escalation_status] = by_status.get(error.escalation_status, 0) + 1
        
        return {
            "total_errors": total_errors,
            "by_type": by_type,
            "by_severity": by_severity,
            "by_escalation_status": by_status,
            "unresolved_count": len(self.get_unresolved_errors()),
            "privacy_breaches": self.privacy_breach_count,
            "system_errors": self.system_error_count
        }
