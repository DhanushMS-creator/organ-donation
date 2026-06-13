#!/bin/bash

# Organ Donation Platform - Startup Script

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Organ Donation Coordination Platform                        ║"
echo "║  Installation & Setup                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check Python version
echo "🔍 Checking Python version..."

# Prefer Python 3.12/3.11 if available (better dependency support than 3.14+)
PYTHON_BIN=""
for candidate in python3.12 python3.11 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
        PYTHON_BIN="$candidate"
        break
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "   ❌ No python3 found in PATH. Install Python 3.11+ and re-run."
    exit 1
fi

python_version=$($PYTHON_BIN --version 2>&1 | awk '{print $2}')
echo "   Using: $PYTHON_BIN ($python_version)"

# Decide dependency set.
# - Full stack (demo.py + pydantic-based models): best on Python <= 3.13
# - Minimal backend (Flask + SQLAlchemy + CORS): works on Python 3.14+ as well
dep_file="requirements.txt"
major=$(echo "$python_version" | cut -d. -f1)
minor=$(echo "$python_version" | cut -d. -f2)
if [ "$major" -eq 3 ] && [ "$minor" -ge 14 ]; then
    dep_file="backend/requirements-sqlite.txt"
    echo "   ⚠️  Detected Python $python_version. Installing minimal backend deps ($dep_file)."
    echo "      Note: demo.py may not run on Python 3.14+ due to Pydantic dependency support."
    echo "      For the full demo stack, install Python 3.11–3.13 and re-run this script."
fi

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
$PYTHON_BIN -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r "$dep_file"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "   ⚠️  Please update .env with your configuration"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p config
mkdir -p tests

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "   1. Activate virtual environment: source venv/bin/activate"
echo "   2. Update .env file with your configuration"
if [ "$dep_file" = "requirements.txt" ]; then
    echo "   3. Run the demo: python demo.py"
else
    echo "   3. (Optional) Install full deps on Python 3.11–3.13 to run demo.py"
fi
echo "   4. Start the server: python backend/app.py"
echo ""
