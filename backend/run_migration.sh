#!/bin/bash
# Script to run the migration for assigned_manager_id

cd "$(dirname "$0")"
source venv/bin/activate
cd migrations
python -m alembic upgrade head

