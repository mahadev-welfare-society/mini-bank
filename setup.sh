#!/bin/bash

# Mini Bank Setup Script
echo "🏦 Setting up Mini Bank - Milestone 1"
echo "====================================="

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database
echo "📊 Creating database..."
createdb minibank_db 2>/dev/null || echo "Database may already exist"

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
FLASK_ENV=development
DATABASE_URL=postgresql://postgres:root@localhost:5432/minibank_db
JWT_SECRET_KEY=supersecretkey
FLASK_APP=main.py
EOF
fi

# Initialize database
echo "🗄️  Initializing database..."
flask db init 2>/dev/null || echo "Database already initialized"
flask db migrate -m "Initial migration"
flask db upgrade

# Create admin user and sample data
echo "👤 Creating admin user and sample data..."
python init_db.py

echo "✅ Backend setup completed!"

# Frontend setup
echo "🎨 Setting up frontend..."
cd ../frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:5000/api
EOF
fi

echo "✅ Frontend setup completed!"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 To start the application:"
echo "   1. Backend:  cd backend && source venv/bin/activate && flask run"
echo "   2. Frontend: cd frontend && npm run dev"
echo ""
echo "🔐 Default login credentials:"
echo "   Admin:  admin@minibank.com / admin123"
echo "   Manager: manager@minibank.com / manager123"
echo "   Staff:   staff@minibank.com / staff123"
echo ""
echo "🌐 Access the application at: http://localhost:3000"
