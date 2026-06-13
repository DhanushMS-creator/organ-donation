"""
Database initialization and setup script
Creates all tables and optionally loads sample data
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database.models import init_database, get_session, get_engine
from backend.database.models import Patient, Donor, BloodTypeEnum, OrganTypeEnum
from datetime import datetime


def create_sample_data(session):
    """Create sample data for testing"""
    print("\n📝 Creating sample data...")
    
    # Sample patients
    patients = [
        Patient(
            patient_id="P-2026-00001",
            name="Rajesh Kumar",
            age=45,
            blood_type=BloodTypeEnum.O,
            organ_required=OrganTypeEnum.HEART,
            urgency_level=5,
            latitude=12.9716,
            longitude=77.5946,
            medical_status="Severe heart failure, LVEF 20%, NYHA Class IV",
            contact_info="+91-9876543210"
        ),
        Patient(
            patient_id="P-2026-00002",
            name="Priya Sharma",
            age=38,
            blood_type=BloodTypeEnum.A,
            organ_required=OrganTypeEnum.KIDNEYS,
            urgency_level=4,
            latitude=13.0827,
            longitude=77.5877,
            medical_status="End-stage renal disease, dialysis 3x/week",
            contact_info="+91-9876543211"
        ),
        Patient(
            patient_id="P-2026-00003",
            name="Mohammed Ali",
            age=52,
            blood_type=BloodTypeEnum.B,
            organ_required=OrganTypeEnum.LIVER,
            urgency_level=4,
            latitude=12.9352,
            longitude=77.6245,
            medical_status="Cirrhosis, MELD score 28",
            contact_info="+91-9876543212"
        ),
        Patient(
            patient_id="P-2026-00004",
            name="Lakshmi Devi",
            age=29,
            blood_type=BloodTypeEnum.AB,
            organ_required=OrganTypeEnum.LUNGS,
            urgency_level=3,
            latitude=12.9141,
            longitude=77.6385,
            medical_status="Cystic fibrosis, declining lung function",
            contact_info="+91-9876543213"
        ),
        Patient(
            patient_id="P-2026-00005",
            name="Suresh Reddy",
            age=61,
            blood_type=BloodTypeEnum.O,
            organ_required=OrganTypeEnum.KIDNEYS,
            urgency_level=3,
            latitude=12.9698,
            longitude=77.7499,
            medical_status="Chronic kidney disease stage 5",
            contact_info="+91-9876543214"
        )
    ]
    
    for patient in patients:
        session.add(patient)
    
    # Sample donors
    donors = [
        Donor(
            donor_id="D-2026-00001",
            blood_type=BloodTypeEnum.O,
            age=35,
            latitude=12.9716,
            longitude=77.5946,
            medical_status="Brain death, healthy organs",
            available_organs=["Heart", "Kidneys", "Liver"]
        ),
        Donor(
            donor_id="D-2026-00002",
            blood_type=BloodTypeEnum.AB,
            age=42,
            latitude=13.0200,
            longitude=77.6100,
            medical_status="Accident victim, organs viable",
            available_organs=["Kidneys", "Pancreas"]
        )
    ]
    
    for donor in donors:
        session.add(donor)
    
    session.commit()
    print(f"✅ Created {len(patients)} sample patients")
    print(f"✅ Created {len(donors)} sample donors")


def main():
    """Main initialization function"""
    print("=" * 80)
    print("ORGAN DONATION PLATFORM - DATABASE INITIALIZATION")
    print("=" * 80)
    print()
    
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'sqlite:///organ_donation.db')
    
    print(f"📦 Database: {database_url}")
    print()
    
    # Initialize database (create tables)
    print("🔧 Creating database tables...")
    engine = init_database(database_url)
    
    # List all tables created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n✅ Created {len(tables)} tables:")
    for table in tables:
        print(f"   • {table}")
    
    # Ask if user wants sample data
    print("\n" + "=" * 80)
    response = input("Do you want to create sample data? (y/n): ").strip().lower()
    
    if response == 'y':
        session = get_session(engine)
        try:
            create_sample_data(session)
        except Exception as e:
            print(f"❌ Error creating sample data: {e}")
            session.rollback()
        finally:
            session.close()
    else:
        print("⏭️  Skipping sample data creation")
    
    print("\n" + "=" * 80)
    print("✅ DATABASE INITIALIZATION COMPLETE")
    print("=" * 80)
    print()
    print("Next steps:")
    print("  1. Start the server: python backend/app.py")
    print("  2. Access API at: http://localhost:5000")
    print()


if __name__ == "__main__":
    main()
