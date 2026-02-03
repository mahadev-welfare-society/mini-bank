from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=False, unique=True)
    address = db.Column(db.Text, nullable=True)
    role = db.Column(db.String(20), nullable=False, default='staff')  # staff or manager
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)  # <-- new field
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_update_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For admin updates
    last_update_by_manager_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)  # For manager updates
    assigned_manager_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    accounts = db.relationship('Account', lazy=True, cascade='all, delete-orphan')
    assigned_manager = db.relationship('Customer', remote_side=[id], foreign_keys=[assigned_manager_id])
    last_updater_manager = db.relationship('Customer', remote_side=[id], foreign_keys=[last_update_by_manager_id])
    address_village = db.Column(db.String(100), nullable=True)
    address_post_office = db.Column(db.String(100), nullable=True)
    address_tehsil = db.Column(db.String(100), nullable=True)
    address_district = db.Column(db.String(100), nullable=True)
    address_state = db.Column(db.String(100), nullable=True)
    address_pincode = db.Column(db.String(10), nullable=True)
    # Note: creator and last_updater backrefs are defined in User model
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert customer to dictionary"""
        # Determine last updater name: check if manager updated, otherwise check admin
        last_updater_name = None
        last_updater_role = None
        
        # For managers, check if manager updated first
        if self.last_update_by_manager_id:
            if self.last_updater_manager:
                # Manager updated - relationship loaded
                last_updater_name = self.last_updater_manager.name
                last_updater_role = 'manager'
            else:
                # Relationship not loaded, query it
                from app.models import Customer as CustomerModel
                updater_manager = CustomerModel.query.get(self.last_update_by_manager_id)
                if updater_manager:
                    last_updater_name = updater_manager.name
                    last_updater_role = 'manager'
        
        # If no manager update, check admin update
        if not last_updater_name and self.last_update_by:
            # Try to access the relationship (backref from User model)
            try:
                if hasattr(self, 'last_updater') and self.last_updater:
                    # Admin updated - relationship loaded
                    last_updater_name = self.last_updater.name
                    last_updater_role = 'admin'
                else:
                    # Relationship not loaded, query it directly
                    from app.models import User
                    updater_admin = User.query.get(self.last_update_by)
                    if updater_admin:
                        last_updater_name = updater_admin.name
                        last_updater_role = 'admin'
            except Exception as e:
                # If relationship access fails, query directly
                from app.models import User
                updater_admin = User.query.get(self.last_update_by)
                if updater_admin:
                    last_updater_name = updater_admin.name
                    last_updater_role = 'admin'
        
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'created_by': self.created_by,
            'creator_name': self.creator.name if self.creator else None,
            'last_update_by': self.last_update_by,
            'last_update_by_manager_id': self.last_update_by_manager_id,
            'last_updater_name': last_updater_name,
            'last_updater_role': last_updater_role,
            'is_active': self.is_active,
            'assigned_manager_id': self.assigned_manager_id,
            'assigned_manager_name': self.assigned_manager.name if self.assigned_manager else None,
            'address_village': self.address_village,
            'address_post_office': self.address_post_office,
            'address_tehsil': self.address_tehsil,
            'address_district': self.address_district,
            'address_state': self.address_state,
            'address_pincode': self.address_pincode,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<Customer {self.name}>'
