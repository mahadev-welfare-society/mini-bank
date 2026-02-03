#!/usr/bin/env python3
"""
Script to create DDS (Daily Deposit Scheme) account type
Run this from the backend directory: python create_dds_account_type.py
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import AccountType, User
from datetime import datetime

def create_dds_account_type():
    """Create DDS account type if it doesn't exist"""
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    
    with app.app_context():
        # Check if DDS already exists
        existing_dds = AccountType.query.filter_by(name='DDS').first()
        if existing_dds:
            print("✅ DDS account type already exists!")
            print(f"   ID: {existing_dds.id}")
            print(f"   Interest Rate: {existing_dds.interest_rate}%")
            print(f"   Term: {existing_dds.term_in_days} days")
            return
        
        # Get an admin user for created_by
        admin_user = User.query.filter_by(role='admin').first()
        if not admin_user:
            print("❌ Error: No admin user found. Please create an admin user first.")
            return
        
        # Create DDS account type with default values
        # You can modify these values as needed
        dds_account_type = AccountType(
            name='DDS',
            display_name='DDS',
            interest_rate=6.5,  # Default interest rate (adjust as needed)
            term_in_days=365,   # Default 1 year term (adjust as needed)
            created_by=admin_user.id,
            min_deposit=1000.0,  # Minimum deposit amount
            max_deposit=None,    # No maximum limit
            min_withdrawal=0.0,
            max_withdrawal=None,
            minimum_balance=0.0,
            low_balance_penalty=0.0,
            interest_calculation_method='compound',  # Compound interest like FD
            interest_calculation_frequency='yearly',
            lock_in_period_days=365,  # Lock-in period
            early_withdrawal_penalty_rate=1.0,  # 1% penalty for early withdrawal
            is_active=True
        )
        
        try:
            db.session.add(dds_account_type)
            db.session.commit()
            print("✅ DDS account type created successfully!")
            print(f"   ID: {dds_account_type.id}")
            print(f"   Name: {dds_account_type.name}")
            print(f"   Interest Rate: {dds_account_type.interest_rate}%")
            print(f"   Term: {dds_account_type.term_in_days} days")
            print(f"   Min Deposit: ₹{dds_account_type.min_deposit}")
            print("\n💡 You can now see DDS in the Account Types list and create DDS accounts!")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating DDS account type: {e}")
            return

if __name__ == '__main__':
    create_dds_account_type()

