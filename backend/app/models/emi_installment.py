from app import db
from datetime import datetime, date
from sqlalchemy import CheckConstraint

class EMIInstallment(db.Model):
    __tablename__ = 'emi_installments'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    emi_number = db.Column(db.Integer, nullable=False)  # 1, 2, 3, etc.
    due_date = db.Column(db.Date, nullable=False)  # When this EMI is due
    emi_amount = db.Column(db.Float, nullable=False)  # Expected EMI amount
    principal_component = db.Column(db.Float, nullable=False)  # Principal portion of EMI
    interest_component = db.Column(db.Float, nullable=False)  # Interest portion of EMI
    remaining_principal_before = db.Column(db.Float, nullable=False)  # Principal before this EMI
    remaining_principal_after = db.Column(db.Float, nullable=False)  # Principal after this EMI
    
    # Payment tracking
    is_paid = db.Column(db.Boolean, default=False, nullable=False)
    paid_amount = db.Column(db.Float, nullable=True)  # Actual amount paid (may differ from emi_amount)
    paid_date = db.Column(db.Date, nullable=True)  # When payment was made
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=True)  # Link to transaction
    is_overdue = db.Column(db.Boolean, default=False, nullable=False)  # Calculated field
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    account = db.relationship('Account', backref='emi_installments', lazy=True)
    transaction = db.relationship('Transaction', foreign_keys=[transaction_id], lazy=True)
    
    # Unique constraint: one EMI installment per account per EMI number
    __table_args__ = (
        db.UniqueConstraint('account_id', 'emi_number', name='uq_account_emi_number'),
    )
    
    def update_overdue_status(self):
        """Update overdue status based on current date and due date"""
        if not self.is_paid and self.due_date:
            self.is_overdue = date.today() > self.due_date
        else:
            self.is_overdue = False
    
    def mark_as_paid(self, paid_amount, paid_date, transaction_id=None):
        """Mark this EMI installment as paid"""
        self.is_paid = True
        self.paid_amount = paid_amount
        self.paid_date = paid_date
        if transaction_id:
            self.transaction_id = transaction_id
        self.is_overdue = False
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert EMI installment to dictionary"""
        return {
            'id': self.id,
            'account_id': self.account_id,
            'emi_number': self.emi_number,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'emi_amount': self.emi_amount,
            'principal_component': self.principal_component,
            'interest_component': self.interest_component,
            'remaining_principal_before': self.remaining_principal_before,
            'remaining_principal_after': self.remaining_principal_after,
            'is_paid': self.is_paid,
            'paid_amount': self.paid_amount,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'transaction_id': self.transaction_id,
            'is_overdue': self.is_overdue,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<EMIInstallment {self.emi_number} for Account {self.account_id} - {"Paid" if self.is_paid else "Due"}>'

