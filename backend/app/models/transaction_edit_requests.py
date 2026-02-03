from app import db
from datetime import datetime

class TransactionEditRequest(db.Model):
    __tablename__ = 'transaction_edit_requests'

    id = db.Column(db.Integer, primary_key=True)
    
    transaction_id = db.Column(
        db.Integer,
        db.ForeignKey('transactions.id', ondelete='CASCADE'),
        nullable=False
    )

    requested_amount = db.Column(db.Float, nullable=False)
    requested_description = db.Column(db.Text, nullable=True)
    old_amount = db.Column(db.Float, nullable=True)  # Store the amount before this edit (set when approved)

    status = db.Column(
        db.String(20),
        default='pending'
    )  # pending, approved, rejected, cancelled

    reason = db.Column(db.Text, nullable=True)  # Why user/staff is editing

    requested_by = db.Column(db.Integer, nullable=False)
    approved_by = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    transaction = db.relationship('Transaction', backref='edit_requests', lazy=True)
    
    def to_dict(self):
        """Convert edit request to dictionary"""
        transaction = self.transaction
        
        # Get requester name (can be User or Customer)
        requested_by_name = None
        if self.requested_by:
            from app.models.user import User
            from app.models.customer import Customer
            user = User.query.get(self.requested_by)
            if user:
                requested_by_name = user.name
            else:
                customer = Customer.query.get(self.requested_by)
                if customer:
                    requested_by_name = customer.name
        
        # Get approver name (only from users table - admins only)
        approved_by_name = None
        if self.approved_by:
            from app.models.user import User
            # Only look up from users table - approved_by should always be an admin from users table
            user = User.query.get(self.approved_by)
            if user:
                approved_by_name = user.name
        
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'transaction': transaction.to_dict() if transaction else None,
            'old_amount': transaction.amount if transaction else None,
            'requested_amount': self.requested_amount,
            'difference': self.requested_amount - transaction.amount if transaction else None,
            'requested_description': self.requested_description,
            'reason': self.reason,
            'status': self.status,
            'requested_by': self.requested_by,
            'requested_by_name': requested_by_name,
            'approved_by': self.approved_by,
            'approved_by_name': approved_by_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<TransactionEditRequest {self.id} for Transaction {self.transaction_id}>"
