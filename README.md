# Organ Donation Coordination Platform

A centralized smart application for organ donation coordination, facilitating seamless communication and transplant management across geographical regions.

## Features

- **Organ Management**: Support for Heart, Lungs, Kidneys, Liver, Pancreas, and Intestine with storage specs
- **Patient Registration**: Comprehensive patient data with medical status and location tracking
- **Smart Matching Algorithm**: Multi-criteria ranking based on compatibility, proximity, urgency, and survival probability
- **Transport Planning**: Automated route optimization with green corridor notifications
- **Secure Coordination**: End-to-end encrypted communication for medical teams
- **Alert System**: Real-time notifications with delivery tracking
- **Error Handling**: Comprehensive failure management with privacy-first approach

## Project Structure

```
organ-donation-platform/
├── backend/               # Python Flask API server
│   ├── models/           # Data models and schemas
│   ├── services/         # Business logic (matching, routing, notifications)
│   ├── api/             # REST API endpoints
│   ├── utils/           # Helper functions and validators
│   └── app.py           # Main application entry
├── frontend/            # React-based web interface (optional)
├── database/            # Database schemas and migrations
├── config/              # Configuration files
└── tests/              # Unit and integration tests
```

## Tech Stack

- **Backend**: Python 3.11+ with Flask
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Security**: End-to-end encryption, HIPAA compliance logging
- **APIs**: RESTful architecture with JSON responses

## Getting Started

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 14+ with PostGIS extension
- Node.js 18+ (for frontend, optional)

### Installation

```bash
# Clone the repository
cd organ-donation-platform

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up database
createdb organ_donation
psql organ_donation -c "CREATE EXTENSION postgis;"

# Run migrations
python backend/init_db.py

# Start the server
python backend/app.py
```

## Configuration

Copy `.env.example` to `.env` and configure:
- Database connection string
- Encryption keys
- API keys for mapping services
- SMTP settings for notifications

## API Documentation

See [API.md](./docs/API.md) for detailed endpoint documentation.

## Privacy & Compliance

This platform is designed with HIPAA compliance in mind:
- All patient data is encrypted at rest and in transit
- Access logging for all sensitive operations
- Automatic data anonymization for research purposes
- Role-based access control

## Region Configuration

Default region: Bangalore, Karnataka, India (560076)
- Configurable in `config/regions.json`
- Supports multiple regions with independent databases

## License

Proprietary - Medical use only
