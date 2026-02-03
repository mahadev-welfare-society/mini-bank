from app import db
from datetime import datetime
import json

class AccountType(db.Model):
    __tablename__ = 'account_types'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # Savings, RD, FD, DDS, Loan
    # Display name for this specific type, e.g., 'DDS1', 'Special DDS'
    display_name = db.Column(db.String(50), nullable=False, unique=True)
    interest_rate = db.Column(db.Float, nullable=False)  # Percentage
    term_in_days = db.Column(db.Integer, nullable=True)  # Nullable for Savings
    
    # Enhanced parameters for complete banking system
    min_deposit = db.Column(db.Float, default=0.0, nullable=False)
    max_deposit = db.Column(db.Float, nullable=True)  # Nullable means no limit
    min_withdrawal = db.Column(db.Float, default=0.0, nullable=False)
    max_withdrawal = db.Column(db.Float, nullable=True)  # Nullable means no limit
    withdrawal_limit_daily = db.Column(db.Float, nullable=True)
    withdrawal_limit_monthly = db.Column(db.Float, nullable=True)
    
    # Deposit limits
    deposit_limit_daily = db.Column(db.Float, nullable=True)
    deposit_limit_monthly = db.Column(db.Float, nullable=True)
    
    # ATM specific limits
    atm_withdrawal_limit_daily = db.Column(db.Float, nullable=True)
    
    # Balance requirements
    minimum_balance = db.Column(db.Float, default=0.0, nullable=False)
    low_balance_penalty = db.Column(db.Float, default=0.0, nullable=False)
    
    # Interest calculation
    interest_calculation_frequency = db.Column(db.String(20), nullable=True)  # daily, monthly, quarterly, yearly
    interest_calculation_method = db.Column(db.String(20), default='simple', nullable=False)  # simple, compound
    
    # RD specific parameters
    contribution_frequency = db.Column(db.String(20), nullable=True)  # daily, weekly, monthly
    min_contribution_amount = db.Column(db.Float, nullable=True)
    
    # FD specific parameters
    lock_in_period_days = db.Column(db.Integer, nullable=True)
    early_withdrawal_penalty_rate = db.Column(db.Float, default=0.0, nullable=False)
    
    # Loan specific parameters (stored as JSON)
    loan_parameters = db.Column(db.Text, nullable=True)  # JSON string
    
    # Document storage (stored as JSON array of document history)
    document_path = db.Column(db.Text, nullable=True)  # JSON array: [{"previous_rate": float, "current_rate": float, "file_path": str, "date": str}, ...]
    
    # System parameters
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    version = db.Column(db.Integer, default=1, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', backref='created_account_types', lazy=True)
    accounts = db.relationship('Account', backref='account_type', lazy=True)

    def get_loan_parameters(self):
        """Parse loan parameters JSON"""
        if self.loan_parameters:
            try:
                return json.loads(self.loan_parameters)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def set_loan_parameters(self, params):
        """Set loan parameters as JSON"""
        if params:
            self.loan_parameters = json.dumps(params)
        else:
            self.loan_parameters = None

    def get_document_history(self):
        """Parse document history JSON array"""
        if self.document_path:
            try:
                return json.loads(self.document_path)
            except (json.JSONDecodeError, TypeError):
                return []
        return []

    def set_document_history(self, history):
        """Set document history as JSON array"""
        if history:
            self.document_path = json.dumps(history)
        else:
            self.document_path = None

    def add_document_entry(self, previous_rate, current_rate, file_path):
        """Add a new document entry to history"""
        history = self.get_document_history()
        new_entry = {
            'previous_rate': float(previous_rate),
            'current_rate': float(current_rate),
            'file_path': file_path,
            'date': datetime.utcnow().isoformat()
        }
        history.append(new_entry)
        self.set_document_history(history)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'interest_rate': self.interest_rate,
            'term_in_days': self.term_in_days,
            'min_deposit': self.min_deposit,
            'max_deposit': self.max_deposit,
            'min_withdrawal': self.min_withdrawal,
            'max_withdrawal': self.max_withdrawal,
            'withdrawal_limit_daily': self.withdrawal_limit_daily,
            'withdrawal_limit_monthly': self.withdrawal_limit_monthly,
            'deposit_limit_daily': self.deposit_limit_daily,
            'deposit_limit_monthly': self.deposit_limit_monthly,
            'atm_withdrawal_limit_daily': self.atm_withdrawal_limit_daily,
            'minimum_balance': self.minimum_balance,
            'low_balance_penalty': self.low_balance_penalty,
            'interest_calculation_frequency': self.interest_calculation_frequency,
            'interest_calculation_method': self.interest_calculation_method,
            'contribution_frequency': self.contribution_frequency,
            'min_contribution_amount': self.min_contribution_amount,
            'lock_in_period_days': self.lock_in_period_days,
            'early_withdrawal_penalty_rate': self.early_withdrawal_penalty_rate,
            'loan_parameters': self.get_loan_parameters(),
            'document_path': self.get_document_history(),  # Return parsed JSON array
            'created_by': self.created_by,
            'creator_name': self.creator.name if self.creator else None,
            'is_active': self.is_active,
            'version': self.version,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def calculate_maturity_amount(self, principal, start_date, end_date=None):
        """Calculate maturity amount based on account type"""
        if not end_date:
            end_date = datetime.now().date()
        
        days = (end_date - start_date).days
        years = days / 365.25
        
        if self.name == 'Savings':
            # Simple interest for savings
            return principal * (1 + (self.interest_rate / 100) * years)
        elif self.name in ['RD', 'FD', 'DDS']:
            # Compound interest for RD/FD/DDS
            return principal * (1 + (self.interest_rate / 100)) ** years
        elif self.name == 'Loan':
            # Loan calculation (negative balance)
            return abs(principal) * (1 + (self.interest_rate / 100)) ** years
        
        return principal

    def validate_transaction(self, transaction_type, amount, current_balance=0):
        """Validate transaction based on account type rules"""
        if transaction_type == 'deposit':
            if amount < self.min_deposit:
                return False, f"Minimum deposit amount is {self.min_deposit}"
            if self.max_deposit and amount > self.max_deposit:
                return False, f"Maximum deposit amount is {self.max_deposit}"
        elif transaction_type == 'withdrawal':
            if amount < self.min_withdrawal:
                return False, f"Minimum withdrawal amount is {self.min_withdrawal}"
            if self.max_withdrawal and amount > self.max_withdrawal:
                return False, f"Maximum withdrawal amount is {self.max_withdrawal}"
            # Check minimum balance requirement
            if current_balance - amount < self.minimum_balance:
                return False, f"Withdrawal would result in balance below minimum required {self.minimum_balance}"
        
        return True, "Valid transaction"

    def __repr__(self):
        return f'<AccountType {self.name}>'