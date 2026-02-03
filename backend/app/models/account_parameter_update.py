from app import db
from datetime import datetime

class AccountParameterUpdate(db.Model):
    """Track all account parameter changes for audit trail"""
    __tablename__ = 'account_parameter_updates'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parameter_name = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    account = db.relationship('Account', backref='parameter_updates', lazy=True)
    updater = db.relationship('User', backref='account_parameter_updates', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'account_id': self.account_id,
            'updated_by': self.updated_by,
            'updater_name': self.updater.name if self.updater else None,
            'parameter_name': self.parameter_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<AccountParameterUpdate {self.parameter_name} for Account {self.account_id}>'

