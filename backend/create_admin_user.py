#!/usr/bin/env python3
"""
Script to create a new admin user in the users table
Usage: python create_admin_user.py
"""

from app import create_app, db
from app.models import User
import sys

def create_admin_user():
    """Create a new admin user"""
    app = create_app()
    
    with app.app_context():
        print("=" * 50)
        print("Create New Admin User")
        print("=" * 50)
        
        # Get user input
        name = input("Enter admin name: ").strip()
        if not name:
            print("❌ Name cannot be empty!")
            sys.exit(1)
        
        email = input("Enter admin email: ").strip()
        if not email:
            print("❌ Email cannot be empty!")
            sys.exit(1)
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"❌ User with email '{email}' already exists!")
            sys.exit(1)
        
        password = input("Enter admin password: ").strip()
        if not password:
            print("❌ Password cannot be empty!")
            sys.exit(1)
        
        # Confirm password
        confirm_password = input("Confirm password: ").strip()
        if password != confirm_password:
            print("❌ Passwords do not match!")
            sys.exit(1)
        
        # Create admin user
        try:
            admin = User(
                name=name,
                email=email,
                role='admin'
            )
            admin.set_password(password)
            
            db.session.add(admin)
            db.session.commit()
            
            print("\n✅ Admin user created successfully!")
            print(f"   Name: {name}")
            print(f"   Email: {email}")
            print(f"   Role: admin")
            print("\n💡 You can now login with these credentials.")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error creating admin user: {e}")
            sys.exit(1)

if __name__ == '__main__':
    create_admin_user()

