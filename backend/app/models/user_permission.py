from datetime import datetime
from app import db

class UserPermission(db.Model):
    __tablename__ = 'user_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # Can reference either users.id or customers.id
    user_type = db.Column(db.String(20), nullable=False)  # 'user' or 'customer'
    module = db.Column(db.String(50), nullable=False)  # e.g., 'account_types', 'customers', etc.
    can_view = db.Column(db.Boolean, default=False, nullable=False)
    can_create = db.Column(db.Boolean, default=False, nullable=False)
    can_update = db.Column(db.Boolean, default=False, nullable=False)
    can_delete = db.Column(db.Boolean, default=False, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_update_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_permissions')
    last_updater = db.relationship('User', foreign_keys=[last_update_by], backref='updated_permissions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_type': self.user_type,
            'module': self.module,
            'can_view': self.can_view,
            'can_create': self.can_create,
            'can_update': self.can_update,
            'can_delete': self.can_delete,
            'created_by': self.created_by,
            'last_update_by': self.last_update_by,
            'last_updater_name': self.last_updater.name if self.last_updater else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<UserPermission {self.user_id}:{self.module}>'
