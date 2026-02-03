#!/bin/bash

echo "Starting Mini Bank Backend..."

# Set DATABASE_URL explicitly if not set
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not found in environment, setting it explicitly..."
    export DATABASE_URL="postgresql://minibank_db_yk9j_user:2aaJ8rkhG40RBr9eW6kcl7AdXX2cHbJP@dpg-d407bkp5pdvs73fno77g-a.oregon-postgres.render.com/minibank_db_yk9j"
fi

echo "Database URL is set: ${DATABASE_URL:0:50}..."
echo "SQLALCHEMY_DATABASE_URI: ${SQLALCHEMY_DATABASE_URI:0:50}..."

# Verify database connection
echo "Database URL configured: ${DATABASE_URL:0:30}..."

# Run database migrations
echo "Running database migrations..."
flask db upgrade

if [ $? -eq 0 ]; then
    echo "Migrations completed successfully!"
    
    # Admin password will be updated via migration
else
    echo "Migration failed, but continuing with app startup..."
fi

# Start the application
echo "Starting Gunicorn server..."
gunicorn main:app
