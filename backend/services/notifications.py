"""
Notification and Alert Management System
Handles secure communications, alerts, and delivery tracking
"""

from datetime import datetime
from typing import List, Optional, Dict
from cryptography.fernet import Fernet
import json

from backend.models.schemas import (
    Notification,
    NotificationStatus,
    RecipientType,
    ErrorHandling
)


class NotificationService:
    """
    Manages notifications and alerts for all stakeholders
    """
    
    def __init__(self, encryption_key: Optional[bytes] = None):
        """
        Initialize notification service
        
        Args:
            encryption_key: Encryption key for secure messages (generates new if None)
        """
        if encryption_key is None:
            encryption_key = Fernet.generate_key()
        self.cipher = Fernet(encryption_key)
        self.notification_log: List[Notification] = []
    
    def create_notification(
        self,
        recipient_type: RecipientType,
        recipient_id: str,
        content: str,
        priority: str = "normal",
        metadata: Optional[Dict] = None
    ) -> Notification:
        """
        Create a new notification
        
        Args:
            recipient_type: Type of recipient
            recipient_id: Unique recipient identifier
            content: Notification message content
            priority: Priority level (low/normal/high/critical)
            metadata: Additional metadata
            
        Returns:
            Notification object
        """
        notification = Notification(
            alert_id=f"N-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}",
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            content=content,
            timestamp=datetime.utcnow(),
            status=NotificationStatus.SENT,
            priority=priority,
            metadata=metadata or {}
        )
        
        # Log notification
        self.notification_log.append(notification)
        
        return notification
    
    def send_match_notification(
        self,
        match_id: str,
        recipient_doctor_id: str,
        donor_id: str,
        organ_type: str,
        match_score: float,
        urgency: int
    ) -> Notification:
        """
        Send notification about a new match
        
        Args:
            match_id: Match identifier
            recipient_doctor_id: Recipient's doctor ID
            donor_id: Donor identifier
            organ_type: Type of organ
            match_score: Match quality score
            urgency: Urgency level
            
        Returns:
            Notification object
        """
        content = (
            f"🎯 NEW TRANSPLANT MATCH FOUND\n\n"
            f"Match ID: {match_id}\n"
            f"Organ: {organ_type}\n"
            f"Donor ID: {donor_id}\n"
            f"Match Score: {match_score}/100\n"
            f"Urgency: {'⭐' * urgency}\n\n"
            f"Please review match details and confirm acceptance within 30 minutes."
        )
        
        priority = "critical" if urgency >= 4 else "high"
        
        return self.create_notification(
            recipient_type=RecipientType.DOCTOR,
            recipient_id=recipient_doctor_id,
            content=content,
            priority=priority,
            metadata={
                "match_id": match_id,
                "donor_id": donor_id,
                "organ_type": organ_type,
                "requires_action": True
            }
        )
    
    def send_transport_notification(
        self,
        route_id: str,
        organ_type: str,
        estimated_time_min: int,
        recipient_hospital: str
    ) -> Notification:
        """
        Send notification about transport initiation
        
        Args:
            route_id: Route identifier
            organ_type: Type of organ
            estimated_time_min: Estimated travel time
            recipient_hospital: Destination hospital
            
        Returns:
            Notification object
        """
        content = (
            f"🚑 ORGAN TRANSPORT INITIATED\n\n"
            f"Route ID: {route_id}\n"
            f"Organ: {organ_type}\n"
            f"ETA: {estimated_time_min} minutes\n"
            f"Destination: {recipient_hospital}\n\n"
            f"Surgical team: Please prepare for arrival."
        )
        
        return self.create_notification(
            recipient_type=RecipientType.DOCTOR,
            recipient_id=recipient_hospital,
            content=content,
            priority="critical",
            metadata={
                "route_id": route_id,
                "organ_type": organ_type,
                "estimated_arrival": estimated_time_min
            }
        )
    
    def send_no_match_alert(
        self,
        donor_id: str,
        organ_type: str,
        search_radius_km: float
    ) -> Notification:
        """
        Send alert when no match is found
        
        Args:
            donor_id: Donor identifier
            organ_type: Type of organ
            search_radius_km: Search radius used
            
        Returns:
            Notification object
        """
        content = (
            f"⚠️ NO MATCH FOUND - ORGAN AVAILABLE\n\n"
            f"Donor ID: {donor_id}\n"
            f"Organ: {organ_type}\n"
            f"Search Radius: {search_radius_km} km\n\n"
            f"Consider expanding search or notifying regional network."
        )
        
        return self.create_notification(
            recipient_type=RecipientType.ADMIN,
            recipient_id="ADMIN-BANGALORE-001",
            content=content,
            priority="high",
            metadata={
                "donor_id": donor_id,
                "organ_type": organ_type,
                "action_required": "expand_search"
            }
        )
    
    def send_privacy_breach_alert(
        self,
        error_id: str,
        affected_records: List[str],
        breach_type: str
    ) -> Notification:
        """
        Send critical alert for privacy/security breach
        
        Args:
            error_id: Error identifier
            affected_records: List of affected record IDs
            breach_type: Type of security breach
            
        Returns:
            Notification object
        """
        content = (
            f"🔒 SECURITY ALERT - PRIVACY BREACH DETECTED\n\n"
            f"Error ID: {error_id}\n"
            f"Breach Type: {breach_type}\n"
            f"Affected Records: {len(affected_records)}\n\n"
            f"All sensitive data has been locked. Immediate investigation required."
        )
        
        return self.create_notification(
            recipient_type=RecipientType.ADMIN,
            recipient_id="SECURITY-ADMIN-001",
            content=content,
            priority="critical",
            metadata={
                "error_id": error_id,
                "affected_records": affected_records,
                "breach_type": breach_type,
                "auto_locked": True
            }
        )
    
    def update_notification_status(
        self,
        alert_id: str,
        new_status: NotificationStatus
    ) -> Optional[Notification]:
        """
        Update notification delivery status
        
        Args:
            alert_id: Notification ID to update
            new_status: New status
            
        Returns:
            Updated notification or None if not found
        """
        for notification in self.notification_log:
            if notification.alert_id == alert_id:
                notification.status = new_status
                return notification
        return None
    
    def retry_failed_notification(self, alert_id: str) -> bool:
        """
        Retry sending a failed notification
        
        Args:
            alert_id: Notification ID to retry
            
        Returns:
            True if retry initiated, False if not found
        """
        notification = self.update_notification_status(alert_id, NotificationStatus.SENT)
        return notification is not None
    
    def get_notifications_by_recipient(
        self,
        recipient_id: str,
        status: Optional[NotificationStatus] = None
    ) -> List[Notification]:
        """
        Retrieve notifications for a specific recipient
        
        Args:
            recipient_id: Recipient identifier
            status: Filter by status (optional)
            
        Returns:
            List of matching notifications
        """
        notifications = [
            n for n in self.notification_log
            if n.recipient_id == recipient_id
        ]
        
        if status:
            notifications = [n for n in notifications if n.status == status]
        
        return notifications
    
    def encrypt_message(self, message: str) -> str:
        """
        Encrypt sensitive message content
        
        Args:
            message: Plain text message
            
        Returns:
            Encrypted message (base64 encoded)
        """
        encrypted = self.cipher.encrypt(message.encode())
        return encrypted.decode()
    
    def decrypt_message(self, encrypted_message: str) -> str:
        """
        Decrypt encrypted message content
        
        Args:
            encrypted_message: Encrypted message (base64 encoded)
            
        Returns:
            Decrypted plain text message
        """
        decrypted = self.cipher.decrypt(encrypted_message.encode())
        return decrypted.decode()


class SecureChat:
    """
    End-to-end encrypted chat for medical team coordination
    """
    
    def __init__(self, encryption_key: Optional[bytes] = None):
        """
        Initialize secure chat system
        
        Args:
            encryption_key: Encryption key (generates new if None)
        """
        if encryption_key is None:
            encryption_key = Fernet.generate_key()
        self.cipher = Fernet(encryption_key)
        self.message_log: List[Dict] = []
        self.audit_log: List[Dict] = []
    
    def send_message(
        self,
        sender_id: str,
        recipient_id: str,
        message: str,
        case_id: str,
        message_type: str = "text"
    ) -> Dict:
        """
        Send encrypted message
        
        Args:
            sender_id: Sender identifier
            recipient_id: Recipient identifier
            message: Message content (will be encrypted)
            case_id: Associated case/match ID
            message_type: Type of message (text, file, image)
            
        Returns:
            Message metadata
        """
        # Encrypt message
        encrypted_content = self.cipher.encrypt(message.encode()).decode()
        
        message_data = {
            "message_id": f"MSG-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}",
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "encrypted_content": encrypted_content,
            "case_id": case_id,
            "message_type": message_type,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "delivered",
            "read": False
        }
        
        # Log message
        self.message_log.append(message_data)
        
        # Audit log entry
        self.audit_log.append({
            "action": "message_sent",
            "message_id": message_data["message_id"],
            "sender_id": sender_id,
            "recipient_id": recipient_id,
            "case_id": case_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return {
            "message_id": message_data["message_id"],
            "status": "delivered",
            "timestamp": message_data["timestamp"]
        }
    
    def read_message(self, message_id: str, reader_id: str) -> Optional[str]:
        """
        Read and decrypt a message
        
        Args:
            message_id: Message identifier
            reader_id: ID of user reading the message
            
        Returns:
            Decrypted message content or None if not found/unauthorized
        """
        for message in self.message_log:
            if message["message_id"] == message_id:
                # Verify reader is authorized
                if reader_id not in [message["sender_id"], message["recipient_id"]]:
                    self.audit_log.append({
                        "action": "unauthorized_read_attempt",
                        "message_id": message_id,
                        "attempted_by": reader_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "severity": "high"
                    })
                    return None
                
                # Mark as read
                message["read"] = True
                message["status"] = "read"
                
                # Audit log
                self.audit_log.append({
                    "action": "message_read",
                    "message_id": message_id,
                    "reader_id": reader_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                # Decrypt and return
                decrypted = self.cipher.decrypt(message["encrypted_content"].encode())
                return decrypted.decode()
        
        return None
    
    def get_conversation_history(
        self,
        user_id: str,
        case_id: str
    ) -> List[Dict]:
        """
        Retrieve conversation history for a case
        
        Args:
            user_id: User requesting history
            case_id: Case identifier
            
        Returns:
            List of messages (encrypted content removed for metadata only)
        """
        messages = [
            {
                "message_id": m["message_id"],
                "sender_id": m["sender_id"],
                "recipient_id": m["recipient_id"],
                "timestamp": m["timestamp"],
                "status": m["status"],
                "read": m["read"],
                "message_type": m["message_type"]
            }
            for m in self.message_log
            if m["case_id"] == case_id and
            user_id in [m["sender_id"], m["recipient_id"]]
        ]
        
        # Audit log
        self.audit_log.append({
            "action": "conversation_history_accessed",
            "user_id": user_id,
            "case_id": case_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return messages
    
    def get_audit_log(
        self,
        case_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Retrieve audit log entries (compliance requirement)
        
        Args:
            case_id: Filter by case ID (optional)
            start_date: Filter start date (optional)
            end_date: Filter end date (optional)
            
        Returns:
            List of audit log entries
        """
        logs = self.audit_log
        
        if case_id:
            logs = [log for log in logs if log.get("case_id") == case_id]
        
        if start_date:
            logs = [
                log for log in logs
                if datetime.fromisoformat(log["timestamp"]) >= start_date
            ]
        
        if end_date:
            logs = [
                log for log in logs
                if datetime.fromisoformat(log["timestamp"]) <= end_date
            ]
        
        return logs
