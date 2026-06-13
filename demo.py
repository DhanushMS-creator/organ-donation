"""
Sample Data Generator and System Demo
Demonstrates the complete workflow of the organ donation platform
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import (
    PatientRegistration,
    Location,
    OrganType,
    BloodType,
    get_all_organ_details,
    get_organ_details
)
from backend.services.matching import MatchingEngine
from backend.services.routing import RouteOptimizer
from backend.services.notifications import NotificationService
from backend.services.error_handler import ErrorHandler
from backend.utils.export import DataExporter
import json


def generate_sample_patients():
    """Generate sample patient registrations"""
    patients = [
        PatientRegistration(
            patient_id="P-2026-00001",
            name="Rajesh Kumar",
            age=45,
            blood_type=BloodType.O,
            organ_required=OrganType.HEART,
            urgency_level=5,
            location=Location(lat=12.9716, lng=77.5946),
            medical_status="Severe heart failure, LVEF 20%, NYHA Class IV",
            contact_info="+91-9876543210"
        ),
        PatientRegistration(
            patient_id="P-2026-00002",
            name="Priya Sharma",
            age=38,
            blood_type=BloodType.A,
            organ_required=OrganType.KIDNEYS,
            urgency_level=4,
            location=Location(lat=13.0827, lng=77.5877),
            medical_status="End-stage renal disease, dialysis 3x/week",
            contact_info="+91-9876543211"
        ),
        PatientRegistration(
            patient_id="P-2026-00003",
            name="Mohammed Ali",
            age=52,
            blood_type=BloodType.B,
            organ_required=OrganType.LIVER,
            urgency_level=4,
            location=Location(lat=12.9352, lng=77.6245),
            medical_status="Cirrhosis, MELD score 28",
            contact_info="+91-9876543212"
        ),
        PatientRegistration(
            patient_id="P-2026-00004",
            name="Lakshmi Devi",
            age=29,
            blood_type=BloodType.AB,
            organ_required=OrganType.LUNGS,
            urgency_level=3,
            location=Location(lat=12.9141, lng=77.6385),
            medical_status="Cystic fibrosis, declining lung function",
            contact_info="+91-9876543213"
        ),
        PatientRegistration(
            patient_id="P-2026-00005",
            name="Suresh Reddy",
            age=61,
            blood_type=BloodType.O,
            organ_required=OrganType.KIDNEYS,
            urgency_level=3,
            location=Location(lat=12.9698, lng=77.7499),
            medical_status="Chronic kidney disease stage 5",
            contact_info="+91-9876543214"
        )
    ]
    return patients


def demo_complete_workflow():
    """
    Demonstrate complete workflow:
    1. Patient registration
    2. Donor organ availability
    3. Matching algorithm
    4. Route planning
    5. Notifications
    6. Error handling
    7. Data export
    """
    
    print("=" * 80)
    print("ORGAN DONATION COORDINATION PLATFORM - SYSTEM DEMO")
    print("=" * 80)
    print()
    
    # Initialize services
    matching_engine = MatchingEngine()
    route_optimizer = RouteOptimizer()
    notification_service = NotificationService()
    error_handler = ErrorHandler()
    data_exporter = DataExporter()
    
    # =====================
    # 1. ORGAN SPECIFICATIONS
    # =====================
    print("📋 STEP 1: Organ Specifications")
    print("-" * 80)
    organs = get_all_organ_details()
    print(f"Supported organs: {len(organs)}")
    for organ in organs[:3]:
        print(f"  • {organ['organ']}: Viability {organ['viability_time_hours']}h, "
              f"Storage {organ['normal_storage_temp_C']}°C")
    print()
    
    # =====================
    # 2. PATIENT REGISTRATION
    # =====================
    print("👤 STEP 2: Patient Registration")
    print("-" * 80)
    patients = generate_sample_patients()
    print(f"Registered {len(patients)} patients:")
    for p in patients:
        print(f"  • {p.name} (ID: {p.patient_id})")
        print(f"    Organ: {p.organ_required.value}, Blood: {p.blood_type.value}, Urgency: {p.urgency_level}/5")
    print()
    
    # =====================
    # 3. DONOR ORGAN AVAILABLE
    # =====================
    print("🫀 STEP 3: Donor Organ Becomes Available")
    print("-" * 80)
    donor_id = "D-2026-00001"
    donor_blood_type = "O"
    donor_location = Location(lat=12.9716, lng=77.5946)
    organ_type = OrganType.HEART
    
    print(f"Donor ID: {donor_id}")
    print(f"Blood Type: {donor_blood_type}")
    print(f"Organ: {organ_type.value}")
    print(f"Location: ({donor_location.lat:.4f}, {donor_location.lng:.4f})")
    print()
    
    # =====================
    # 4. MATCHING ALGORITHM
    # =====================
    print("🎯 STEP 4: Running Matching Algorithm")
    print("-" * 80)
    
    organ_details = get_organ_details(organ_type)
    viability_hours = float(organ_details.viability_time_hours.split('-')[0])
    
    matches, error = matching_engine.find_matches(
        donor_id=donor_id,
        donor_blood_type=donor_blood_type,
        donor_location=donor_location,
        organ_type=organ_type,
        organ_viability_hours=viability_hours,
        recipients=patients,
        search_radius_km=50.0
    )
    
    if matches:
        print(f"✅ Found {len(matches)} suitable match(es):")
        for i, match in enumerate(matches[:3], 1):
            print(f"\n  Match #{i}:")
            print(f"    Recipient: {match.recipient_id}")
            print(f"    Match Score: {match.match_score}/100")
            print(f"    Compatibility: {match.compatibility_score}/100")
            print(f"    Distance: {match.proximity_km} km")
            print(f"    Survival Probability: {match.survival_probability * 100:.1f}%")
            print(f"    Criticality: {match.criticality}")
    else:
        print("❌ No suitable matches found")
        if error:
            print(f"   Error: {error.message}")
            print(f"   Recommended Action: {error.recommended_action}")
    print()
    
    # =====================
    # 5. ROUTE PLANNING
    # =====================
    if matches:
        print("🚑 STEP 5: Transport Route Planning")
        print("-" * 80)
        
        best_match = matches[0]
        recipient = next(p for p in patients if p.patient_id == best_match.recipient_id)
        
        routes = route_optimizer.generate_routes(
            origin=donor_location,
            destination=recipient.location,
            match_id=best_match.match_id,
            num_routes=3
        )
        
        print(f"Generated {len(routes)} route options:")
        for i, route in enumerate(routes, 1):
            print(f"\n  Route #{i} (ID: {route.route_id}):")
            print(f"    Distance: {route.distance_km} km")
            print(f"    Estimated Time: {route.estimated_time_min} minutes")
            print(f"    Risk Level: {route.risk_level.value}")
            print(f"    Traffic Status: {route.traffic_status}")
            print(f"    Green Corridor: {route.green_corridor_status}")
        print()
        
        # =====================
        # 6. NOTIFICATIONS
        # =====================
        print("📢 STEP 6: Notifications & Alerts")
        print("-" * 80)
        
        # Match notification
        match_notif = notification_service.send_match_notification(
            match_id=best_match.match_id,
            recipient_doctor_id="DR-HOSPITAL-001",
            donor_id=donor_id,
            organ_type=organ_type.value,
            match_score=best_match.match_score,
            urgency=best_match.urgency_level
        )
        print(f"✉️  Match notification sent (ID: {match_notif.alert_id})")
        print(f"   Priority: {match_notif.priority}")
        print(f"   Status: {match_notif.status.value}")
        
        # Green corridor notification
        gc_notif = route_optimizer.create_green_corridor_notification(
            route=routes[0],
            match_id=best_match.match_id,
            organ_type=organ_type.value
        )
        print(f"\n🚨 Green corridor notification sent (ID: {gc_notif.alert_id})")
        print(f"   Recipient: {gc_notif.recipient_type.value}")
        print(f"   Priority: {gc_notif.priority}")
        
        # Transport notification
        transport_notif = notification_service.send_transport_notification(
            route_id=routes[0].route_id,
            organ_type=organ_type.value,
            estimated_time_min=routes[0].estimated_time_min,
            recipient_hospital="Manipal Hospital"
        )
        print(f"\n🚑 Transport notification sent (ID: {transport_notif.alert_id})")
        print(f"   Status: {transport_notif.status.value}")
        print()
    
    # =====================
    # 7. ERROR HANDLING DEMO
    # =====================
    print("⚠️  STEP 7: Error Handling Demonstration")
    print("-" * 80)
    
    # Simulate no match scenario
    no_match_error = error_handler.handle_no_match_error(
        donor_id="D-2026-00002",
        organ_type=OrganType.PANCREAS,
        blood_type="AB",
        search_radius_km=10.0,
        recipients_checked=len(patients),
        organ_viability_hours=12.0
    )
    print(f"❌ No Match Error (ID: {no_match_error.error_id})")
    print(f"   Severity: {no_match_error.severity}")
    print(f"   Message: {no_match_error.message}")
    print(f"   Action: {no_match_error.recommended_action}")
    
    # Donor availability notification
    donor_avail = error_handler.create_donor_availability_notification(
        donor_id="D-2026-00002",
        organs=[OrganType.PANCREAS],
        blood_type="AB",
        location_city="Bangalore",
        age=45,
        purpose="regional_alert"
    )
    print(f"\n📣 Donor availability notification (ID: {donor_avail.notification_id})")
    print(f"   Recipient: {donor_avail.recipient.value}")
    print(f"   Purpose: {donor_avail.purpose}")
    print(f"   Anonymized Data: {json.dumps(donor_avail.anonymized_data, indent=6)}")
    print()
    
    # Error summary
    print("📊 Error Summary:")
    summary = error_handler.get_error_summary()
    print(f"   Total Errors: {summary['total_errors']}")
    print(f"   By Type: {summary['by_type']}")
    print(f"   By Severity: {summary['by_severity']}")
    print()
    
    # =====================
    # 8. DATA EXPORT
    # =====================
    print("💾 STEP 8: Data Export")
    print("-" * 80)
    
    # Export matches as JSON
    json_export = data_exporter.export_matches(matches, format='json')
    print(f"✅ Exported {len(matches)} matches to JSON ({len(json_export)} bytes)")
    
    # Export routes as CSV
    csv_export = data_exporter.export_routes(routes, format='csv')
    print(f"✅ Exported {len(routes)} routes to CSV ({len(csv_export)} bytes)")
    
    # Export patients as HTML
    html_export = data_exporter.export_patients(patients, format='html')
    print(f"✅ Exported {len(patients)} patients to HTML ({len(html_export)} bytes)")
    print()
    
    # =====================
    # SUMMARY
    # =====================
    print("=" * 80)
    print("✨ DEMONSTRATION COMPLETE")
    print("=" * 80)
    print()
    print("Summary:")
    print(f"  • {len(patients)} patients registered")
    print(f"  • {len(matches)} matches found")
    print(f"  • {len(routes)} routes planned")
    print(f"  • {len(notification_service.notification_log)} notifications sent")
    print(f"  • {len(error_handler.error_log)} errors logged")
    print()
    print("All systems operational! ✅")
    print()
    
    # Save sample output
    output = {
        "patients": [p.model_dump() for p in patients],
        "matches": [m.model_dump() for m in matches],
        "routes": [r.model_dump() for r in routes],
        "notifications": [n.model_dump() for n in notification_service.notification_log],
        "errors": [e.model_dump() for e in error_handler.error_log]
    }
    
    with open('sample_output.json', 'w') as f:
        json.dump(output, f, indent=2, default=str)
    print("📄 Sample output saved to: sample_output.json")
    print()


if __name__ == "__main__":
    demo_complete_workflow()
