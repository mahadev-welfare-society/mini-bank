from app import db
from datetime import datetime

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # deposit, withdrawal, interest, penalty, loan_disbursal, loan_repayment
    amount = db.Column(db.Float, nullable=False)  # Always positive, type determines if it's added or subtracted
    balance_before = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    reference_number = db.Column(db.String(50), unique=True, nullable=True)  # For tracking
    status = db.Column(db.String(20), default='completed', nullable=False)  # pending, completed, failed, cancelled
    created_by = db.Column(db.Integer, nullable=False)  # Can reference either users.id or customers.id
    creator_type = db.Column(db.String(20), default='user', nullable=False)  # 'user' or 'customer'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    payment_type = db.Column(db.String(20), nullable=True)  # e.g., 'cash', 'qr'

    # Relationships
    account = db.relationship('Account', backref='transactions', lazy=True)
    
    @property
    def creator(self):
        """Get creator object based on creator_type"""
        if self.creator_type == 'user':
            from app.models.user import User
            return User.query.get(self.created_by)
        else:  # customer
            from app.models.customer import Customer
            return Customer.query.get(self.created_by)
    
    def to_dict(self):
        """Convert transaction to dictionary"""
        return {
            'id': self.id,
            'account_id': self.account_id,
            'account_number': f"ACC{self.account_id:06d}" if self.account else None,
            'customer_name': self.account.customer.name if self.account and self.account.customer else None,
            'account_type_name': self.account.account_type.name if self.account and self.account.account_type else None,
            'transaction_type': self.transaction_type,
            'amount': self.amount,
            'balance_before': self.balance_before,
            'balance_after': self.balance_after,
            'description': self.description,
            'reference_number': self.reference_number,
            'status': self.status,
            'created_by': self.created_by,
            'creator_type': self.creator_type,
            'creator_name': self.creator.name if self.creator else None,
            'payment_type': self.payment_type,  
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_display_amount(self):
        """Get amount with proper sign based on transaction type"""
        if self.transaction_type in ['deposit', 'interest', 'loan_disbursal']:
            return f"+{self.amount:,.2f}"
        elif self.transaction_type in ['withdrawal', 'penalty', 'loan_repayment']:
            return f"-{self.amount:,.2f}"
        return f"{self.amount:,.2f}"
    
    def get_transaction_icon(self):
        """Get appropriate icon for transaction type"""
        icon_map = {
            'deposit': '💰',
            'withdrawal': '💸',
            'interest': '📈',
            'penalty': '⚠️',
            'loan_disbursal': '🏦',
            'loan_repayment': '💳'
        }
        return icon_map.get(self.transaction_type, '💼')
    
    def get_status_color(self):
        """Get color class for transaction status"""
        color_map = {
            'completed': 'text-green-600',
            'pending': 'text-yellow-600',
            'failed': 'text-red-600',
            'cancelled': 'text-gray-600'
        }
        return color_map.get(self.status, 'text-gray-600')
    
    @staticmethod
    def generate_reference_number():
        """Generate unique reference number for transaction"""
        import uuid
        return f"TXN{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
    
    def __repr__(self):
        return f'<Transaction {self.id}: {self.transaction_type} {self.amount}>'
