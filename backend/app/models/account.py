from app import db
from datetime import datetime, timedelta, date

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    account_type_id = db.Column(db.Integer, db.ForeignKey('account_types.id'), nullable=False)
    balance = db.Column(db.Float, default=0.0, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    maturity_date = db.Column(db.Date, nullable=True)  # Nullable for Savings accounts
    status = db.Column(db.String(20), default='active', nullable=False)  # active, closed
    last_interest_calculated_date = db.Column(db.Date, nullable=True)  # Track when interest was last calculated
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Snapshot parameters (stored at account creation)
    snapshot_interest_rate = db.Column(db.Float, nullable=True)
    snapshot_min_deposit = db.Column(db.Float, nullable=True)
    snapshot_max_deposit = db.Column(db.Float, nullable=True)
    snapshot_min_withdrawal = db.Column(db.Float, nullable=True)
    snapshot_max_withdrawal = db.Column(db.Float, nullable=True)
    snapshot_withdrawal_limit_daily = db.Column(db.Float, nullable=True)
    snapshot_withdrawal_limit_monthly = db.Column(db.Float, nullable=True)
    snapshot_deposit_limit_daily = db.Column(db.Float, nullable=True)
    snapshot_deposit_limit_monthly = db.Column(db.Float, nullable=True)
    snapshot_atm_withdrawal_limit_daily = db.Column(db.Float, nullable=True)
    snapshot_minimum_balance = db.Column(db.Float, nullable=True)
    snapshot_low_balance_penalty = db.Column(db.Float, nullable=True)
    snapshot_interest_calculation_method = db.Column(db.String(20), nullable=True)
    snapshot_interest_calculation_frequency = db.Column(db.String(20), nullable=True)
    snapshot_early_withdrawal_penalty_rate = db.Column(db.Float, nullable=True)
    snapshot_lock_in_period_days = db.Column(db.Integer, nullable=True)
    snapshot_contribution_frequency = db.Column(db.String(20), nullable=True)
    snapshot_min_contribution_amount = db.Column(db.Float, nullable=True)
    daily_contribution = db.Column(db.Float, nullable=True, default=0.0)
    rd_contribution_day = db.Column(db.Integer, nullable=True)  # Day of month for RD contributions (1-31)
    
    # Loan specific snapshot parameters
    snapshot_loan_principal = db.Column(db.Float, nullable=True)  # Original loan amount
    snapshot_emi_amount = db.Column(db.Float, nullable=True)  # Calculated EMI amount
    snapshot_loan_term_months = db.Column(db.Integer, nullable=True)  # Loan term in months
    snapshot_repayment_frequency = db.Column(db.String(20), nullable=True)  # monthly, quarterly, etc.
    snapshot_loan_penalty_rate = db.Column(db.Float, nullable=True)  # Late payment penalty rate
    last_payment_date = db.Column(db.Date, nullable=True)  # Track last EMI payment date
    emi_due_day = db.Column(db.Integer, nullable=True)  # Day of month when EMI is due (1-31)
    
    # Custom parameters (for admin overrides)
    custom_interest_rate = db.Column(db.Float, nullable=True)
    custom_min_deposit = db.Column(db.Float, nullable=True)
    custom_min_withdrawal = db.Column(db.Float, nullable=True)
    custom_minimum_balance = db.Column(db.Float, nullable=True)
    custom_low_balance_penalty = db.Column(db.Float, nullable=True)
    
    # Flag to indicate if account uses custom parameters
    use_custom_parameters = db.Column(db.Boolean, default=False, nullable=False)
    
    # Relationships
    customer = db.relationship('Customer', lazy=True, overlaps="accounts")
    creator = db.relationship('User', backref='created_accounts', lazy=True)
    # account_type relationship is created by AccountType.accounts backref
    
    def get_effective_interest_rate(self):
        """Get effective interest rate (custom or snapshot)"""
        if self.use_custom_parameters and self.custom_interest_rate is not None:
            return self.custom_interest_rate
        elif self.snapshot_interest_rate is not None:
            return self.snapshot_interest_rate
        # Fallback to account type if no snapshot (for backward compatibility)
        return self.account_type.interest_rate if self.account_type else 0
    
    def get_effective_min_deposit(self):
        """Get effective minimum deposit"""
        if self.use_custom_parameters and self.custom_min_deposit is not None:
            return self.custom_min_deposit
        elif self.snapshot_min_deposit is not None:
            return self.snapshot_min_deposit
        return self.account_type.min_deposit if self.account_type else 0
    
    def get_effective_min_withdrawal(self):
        """Get effective minimum withdrawal"""
        if self.use_custom_parameters and self.custom_min_withdrawal is not None:
            return self.custom_min_withdrawal
        elif self.snapshot_min_withdrawal is not None:
            return self.snapshot_min_withdrawal
        return self.account_type.min_withdrawal if self.account_type else 0
    
    def get_effective_minimum_balance(self):
        """Get effective minimum balance"""
        if self.use_custom_parameters and self.custom_minimum_balance is not None:
            return self.custom_minimum_balance
        elif self.snapshot_minimum_balance is not None:
            return self.snapshot_minimum_balance
        return self.account_type.minimum_balance if self.account_type else 0
    
    def get_effective_interest_calculation_method(self):
        """Get effective interest calculation method"""
        if self.snapshot_interest_calculation_method:
            return self.snapshot_interest_calculation_method
        return self.account_type.interest_calculation_method if self.account_type else 'simple'
    
    def validate_transaction(self, transaction_type, amount):
        """Validate transaction based on account's snapshot/custom values"""
        # Get account type name
        account_type_name = self.account_type.name if self.account_type else None
        
        # FD-specific validations
        if account_type_name == 'FD':
            if transaction_type == 'deposit':
                # FD: Only allow deposit if balance is 0 (one-time deposit only)
                if self.balance > 0:
                    return False, "FD account already has a deposit. Only one deposit is allowed."
                min_deposit = self.get_effective_min_deposit()
                if amount < min_deposit:
                    return False, f"Minimum deposit amount is {min_deposit}"
                if self.snapshot_max_deposit and amount > self.snapshot_max_deposit:
                    return False, f"Maximum deposit amount is {self.snapshot_max_deposit}"
            elif transaction_type == 'withdrawal':
                # FD: Only allow withdrawal if it's a full balance withdrawal (break FD)
                # Regular withdrawals are not allowed for FD accounts
                if amount < self.balance:
                    return False, "FD accounts do not allow partial withdrawals. Only full balance withdrawal (Break FD) is allowed."
                if amount > self.balance:
                    return False, "Withdrawal amount cannot exceed current balance"
        
        # DDS-specific validations (similar to FD)
        if account_type_name == 'DDS':
            if transaction_type == 'deposit':
                # DDS: Only allow deposit if balance is 0 (one-time deposit only)
                # if self.balance > 0:
                #     return False, "DDS account already has a deposit. Only one deposit is allowed."
                min_deposit = self.get_effective_min_deposit()
                if amount < min_deposit:
                    return False, f"Minimum deposit amount is {min_deposit}"
                if self.snapshot_max_deposit and amount > self.snapshot_max_deposit:
                    return False, f"Maximum deposit amount is {self.snapshot_max_deposit}"
            elif transaction_type == 'withdrawal':
                # DDS: Only allow withdrawal if it's a full balance withdrawal (break DDS)
                # Regular withdrawals are not allowed for DDS accounts
                if amount < self.balance:
                    return False, "DDS accounts do not allow partial withdrawals. Only full balance withdrawal (Break DDS) is allowed."
                if amount > self.balance:
                    return False, "Withdrawal amount cannot exceed current balance"
        elif transaction_type == 'deposit':
            # For other account types, validate deposit normally
            min_deposit = self.get_effective_min_deposit()
            if amount < min_deposit:
                return False, f"Minimum deposit amount is {min_deposit}"
            if self.snapshot_max_deposit and amount > self.snapshot_max_deposit:
                return False, f"Maximum deposit amount is {self.snapshot_max_deposit}"
        elif transaction_type == 'withdrawal':
            # For other account types, validate withdrawal normally
            min_withdrawal = self.get_effective_min_withdrawal()
            if amount < min_withdrawal:
                return False, f"Minimum withdrawal amount is {min_withdrawal}"
            if self.snapshot_max_withdrawal and amount > self.snapshot_max_withdrawal:
                return False, f"Maximum withdrawal amount is {self.snapshot_max_withdrawal}"
            # Check minimum balance requirement
            min_balance = self.get_effective_minimum_balance()
            if self.balance - amount < min_balance:
                return False, f"Withdrawal would result in balance below minimum required {min_balance}"
        
        return True, "Valid transaction"
    
    def to_dict(self):
        """Convert account to dictionary"""
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else None,
            'account_type_id': self.account_type_id,
            'account_type_name': self.account_type.name if self.account_type else None,
            'account_type': self.account_type.name.lower() if self.account_type else None,  # Add lowercase version for frontend
            'balance': self.balance,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'maturity_date': self.maturity_date.isoformat() if self.maturity_date else None,
            'status': self.status,
            'created_by': self.created_by,
            'creator_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Snapshot info
            'snapshot_interest_rate': self.snapshot_interest_rate,
            'effective_interest_rate': self.get_effective_interest_rate(),
            'snapshot_minimum_balance': self.snapshot_minimum_balance,
            'effective_minimum_balance': self.get_effective_minimum_balance(),
            'use_custom_parameters': self.use_custom_parameters,
            'current_account_type_interest_rate': self.account_type.interest_rate if self.account_type else None,
            # Additional snapshot fields for RD/FD
            'snapshot_interest_calculation_method': self.snapshot_interest_calculation_method,
            'snapshot_contribution_frequency': self.snapshot_contribution_frequency,
            'snapshot_min_contribution_amount': self.snapshot_min_contribution_amount,
            'snapshot_lock_in_period_days': self.snapshot_lock_in_period_days,
            'rd_contribution_day': self.rd_contribution_day,
            'snapshot_early_withdrawal_penalty_rate': self.snapshot_early_withdrawal_penalty_rate,
            'last_interest_calculated_date': self.last_interest_calculated_date.isoformat() if self.last_interest_calculated_date else None,
            # Loan specific fields
            'snapshot_loan_principal': self.snapshot_loan_principal,
            'snapshot_emi_amount': self.snapshot_emi_amount,
            'snapshot_loan_term_months': self.snapshot_loan_term_months,
            'snapshot_repayment_frequency': self.snapshot_repayment_frequency,
            'snapshot_loan_penalty_rate': self.snapshot_loan_penalty_rate,
            'last_payment_date': self.last_payment_date.isoformat() if self.last_payment_date else None,
            'emi_due_day': self.emi_due_day,
            # Calculated loan fields for frontend
            'paid_emis_count': self.get_paid_emis_count() if self.account_type and self.account_type.name == 'Loan' else 0,
            'next_payment_date': self.get_next_payment_date().isoformat() if (self.account_type and self.account_type.name == 'Loan' and self.get_next_payment_date()) else None
        }
    
    def calculate_maturity_amount(self):
        """Calculate maturity amount for RD/FD/DDS accounts using snapshot values"""
        if not self.maturity_date or not self.account_type:
            return self.balance
        
        # Calculate interest based on account type
        if self.account_type.name in ['RD', 'FD', 'DDS']:
            # Use effective interest rate (snapshot or custom)
            interest_rate = self.get_effective_interest_rate()
            calculation_method = self.get_effective_interest_calculation_method()
            
            days = (self.maturity_date - self.start_date).days
            years = days / 365.25
            
            if calculation_method == 'simple':
                interest = self.balance * (interest_rate / 100) * years
            else:  # compound
                interest = self.balance * ((1 + interest_rate / 100) ** years - 1)
            
            return self.balance + interest
        
        return self.balance
    
    def calculate_emi(self, principal=None, interest_rate=None, term_months=None):
        """Calculate EMI amount using standard formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
        Where P = Principal, r = monthly interest rate, n = number of months"""
        account_type_name = self.account_type.name if self.account_type else None
        if account_type_name and account_type_name != 'Loan':
            return None
        if not account_type_name and interest_rate is None:
            return None
        
        # Use snapshot values or provided parameters
        principal = principal if principal is not None else (self.snapshot_loan_principal or (abs(self.balance) if self.balance is not None else None))
        interest_rate = interest_rate if interest_rate is not None else self.get_effective_interest_rate()
        term_months = term_months if term_months is not None else self.snapshot_loan_term_months
        
        if principal is None or principal <= 0:
            return None
        if term_months is None or term_months <= 0:
            return None
        if interest_rate is None:
            return None
        
        # Monthly interest rate (annual rate / 12)
        monthly_rate = interest_rate / 100 / 12 if interest_rate else 0
        
        # EMI formula
        if monthly_rate == 0:
            emi = principal / term_months
        else:
            emi = principal * monthly_rate * ((1 + monthly_rate) ** term_months) / (((1 + monthly_rate) ** term_months) - 1)
        
        return round(emi, 2)
    
    def get_next_payment_date(self):
        """Get next EMI payment date from EMI installments table"""
        if not self.account_type or self.account_type.name != 'Loan':
            return None
        
        # Try to get from EMI installments table first
        from app.models import EMIInstallment
        next_emi = EMIInstallment.query.filter_by(
            account_id=self.id,
            is_paid=False
        ).order_by(EMIInstallment.due_date.asc()).first()
        
        if next_emi:
            return next_emi.due_date
        
        # Fallback to old calculation if no installments exist (for backward compatibility)
        if not self.snapshot_repayment_frequency:
            return None
        
        # Start from start_date or last_payment_date
        base_date = self.last_payment_date or self.start_date
        if not base_date:
            return None
        
        # Get the due day (use emi_due_day if set, otherwise use day from base_date)
        due_day = self.emi_due_day if self.emi_due_day is not None else base_date.day
        
        # Calculate next payment date based on frequency
        from calendar import monthrange
        
        if self.snapshot_repayment_frequency == 'monthly':
            # Calculate next month
            if base_date.month == 12:
                next_year = base_date.year + 1
                next_month = 1
            else:
                next_year = base_date.year
                next_month = base_date.month + 1
            
            # Set to the due day, handling months with fewer days
            last_day_of_month = monthrange(next_year, next_month)[1]
            day_to_use = min(due_day, last_day_of_month)
            next_date = date(next_year, next_month, day_to_use)
            
        elif self.snapshot_repayment_frequency == 'quarterly':
            # Add 3 months
            if base_date.month <= 9:
                next_year = base_date.year
                next_month = base_date.month + 3
            else:
                next_year = base_date.year + 1
                next_month = base_date.month - 9
            
            last_day_of_month = monthrange(next_year, next_month)[1]
            day_to_use = min(due_day, last_day_of_month)
            next_date = date(next_year, next_month, day_to_use)
            
        elif self.snapshot_repayment_frequency == 'weekly':
            next_date = base_date + timedelta(days=7)
        elif self.snapshot_repayment_frequency == 'daily':
            next_date = base_date + timedelta(days=1)
        else:
            # Default to monthly
            if base_date.month == 12:
                next_year = base_date.year + 1
                next_month = 1
            else:
                next_year = base_date.year
                next_month = base_date.month + 1
            
            last_day_of_month = monthrange(next_year, next_month)[1]
            day_to_use = min(due_day, last_day_of_month)
            next_date = date(next_year, next_month, day_to_use)
        
        return next_date
    
    def get_emi_schedule(self):
        """Get complete EMI schedule from EMI installments table"""
        if not self.account_type or self.account_type.name != 'Loan':
            return []
        
        # Try to get from EMI installments table first
        from app.models import EMIInstallment
        installments = EMIInstallment.query.filter_by(
            account_id=self.id
        ).order_by(EMIInstallment.emi_number.asc()).all()
        
        if installments:
            # Update overdue status before returning
            today = datetime.now().date()
            schedule = []
            for installment in installments:
                installment.update_overdue_status()
                schedule.append({
                    'emi_number': installment.emi_number,
                    'payment_date': installment.due_date.isoformat() if installment.due_date else None,
                    'emi_amount': round(installment.emi_amount, 2),
                    'principal_component': round(installment.principal_component, 2),
                    'interest_component': round(installment.interest_component, 2),
                    'remaining_principal': round(installment.remaining_principal_after, 2),
                    'is_paid': installment.is_paid,
                    'paid_amount': round(installment.paid_amount, 2) if installment.is_paid and installment.paid_amount else 0,
                    'paid_date': installment.paid_date.isoformat() if installment.paid_date else None,
                    'is_overdue': installment.is_overdue
                })
            
            # Commit overdue status updates
            try:
                db.session.commit()
            except:
                pass
            
            return schedule
        
        # Fallback to old calculation if no installments exist (for backward compatibility)
        # This handles existing loan accounts that don't have installments yet
        principal = self.snapshot_loan_principal or abs(self.balance) if self.balance < 0 else 0
        emi_amount = self.snapshot_emi_amount or self.calculate_emi()
        term_months = self.snapshot_loan_term_months
        
        if not emi_amount and principal and term_months:
            emi_amount = self.calculate_emi(
                principal=principal,
                interest_rate=self.get_effective_interest_rate(),
                term_months=term_months
            )
        
        interest_rate = self.get_effective_interest_rate()
        
        if not principal or principal <= 0 or not emi_amount or emi_amount <= 0 or not term_months or term_months <= 0:
            return []
        
        # Generate schedule using old method (for backward compatibility)
        schedule = []
        remaining_principal = principal
        monthly_rate = interest_rate / 100 / 12 if interest_rate else 0
        current_date = self.start_date or datetime.now().date()
        due_day = self.emi_due_day if self.emi_due_day is not None else current_date.day
        
        from app.models import Transaction
        from calendar import monthrange
        
        repayments = Transaction.query.filter_by(
            account_id=self.id,
            transaction_type='loan_repayment'
        ).order_by(Transaction.created_at.asc()).all()
        
        payment_map = {}
        for repayment in repayments:
            payment_date = repayment.created_at.date() if repayment.created_at else None
            if payment_date:
                if payment_date not in payment_map:
                    payment_map[payment_date] = 0
                payment_map[payment_date] += repayment.amount
        
        all_payments = []
        for payment_date, amount in payment_map.items():
            all_payments.append({'date': payment_date, 'amount': amount})
        all_payments.sort(key=lambda x: x['date'])
        payment_index = 0
        
        for emi_number in range(1, term_months + 1):
            interest_component = remaining_principal * monthly_rate
            principal_component = emi_amount - interest_component
            
            if emi_number == term_months:
                principal_component = remaining_principal
                emi_amount_adjusted = principal_component + interest_component
            else:
                emi_amount_adjusted = emi_amount
            
            # Calculate payment date
            if emi_number == 1:
                if self.snapshot_repayment_frequency == 'monthly':
                    if current_date.month == 12:
                        payment_date = date(current_date.year + 1, 1, 1)
                    else:
                        payment_date = date(current_date.year, current_date.month + 1, 1)
                    last_day = monthrange(payment_date.year, payment_date.month)[1]
                    payment_date = payment_date.replace(day=min(due_day, last_day))
                elif self.snapshot_repayment_frequency == 'quarterly':
                    if current_date.month <= 9:
                        payment_date = date(current_date.year, current_date.month + 3, 1)
                    else:
                        payment_date = date(current_date.year + 1, current_date.month - 9, 1)
                    last_day = monthrange(payment_date.year, payment_date.month)[1]
                    payment_date = payment_date.replace(day=min(due_day, last_day))
                elif self.snapshot_repayment_frequency == 'weekly':
                    payment_date = current_date + timedelta(days=7)
                else:
                    payment_date = current_date + timedelta(days=30)
            else:
                prev_date_obj = datetime.strptime(schedule[-1]['payment_date'], '%Y-%m-%d').date() if isinstance(schedule[-1]['payment_date'], str) else schedule[-1]['payment_date']
                if self.snapshot_repayment_frequency == 'monthly':
                    if prev_date_obj.month == 12:
                        payment_date = date(prev_date_obj.year + 1, 1, 1)
                    else:
                        payment_date = date(prev_date_obj.year, prev_date_obj.month + 1, 1)
                    last_day = monthrange(payment_date.year, payment_date.month)[1]
                    payment_date = payment_date.replace(day=min(due_day, last_day))
                elif self.snapshot_repayment_frequency == 'quarterly':
                    if prev_date_obj.month <= 9:
                        payment_date = date(prev_date_obj.year, prev_date_obj.month + 3, 1)
                    else:
                        payment_date = date(prev_date_obj.year + 1, prev_date_obj.month - 9, 1)
                    last_day = monthrange(payment_date.year, payment_date.month)[1]
                    payment_date = payment_date.replace(day=min(due_day, last_day))
                elif self.snapshot_repayment_frequency == 'weekly':
                    payment_date = prev_date_obj + timedelta(days=7)
                else:
                    if prev_date_obj.month == 12:
                        payment_date = date(prev_date_obj.year + 1, 1, 1)
                    else:
                        payment_date = date(prev_date_obj.year, prev_date_obj.month + 1, 1)
                    last_day = monthrange(payment_date.year, payment_date.month)[1]
                    payment_date = payment_date.replace(day=min(due_day, last_day))
            
            is_paid = False
            paid_amount = 0
            paid_date = None
            
            if payment_index < len(all_payments):
                payment = all_payments[payment_index]
                if payment['date'] <= payment_date:
                    if abs(payment['amount'] - emi_amount_adjusted) <= (emi_amount_adjusted * 0.1):
                        is_paid = True
                        paid_amount = payment['amount']
                        paid_date = payment['date']
                        payment_index += 1
            
            new_balance = remaining_principal - principal_component
            
            schedule.append({
                'emi_number': emi_number,
                'payment_date': payment_date.isoformat() if isinstance(payment_date, date) else payment_date,
                'emi_amount': round(emi_amount_adjusted, 2),
                'principal_component': round(principal_component, 2),
                'interest_component': round(interest_component, 2),
                'remaining_principal': round(new_balance, 2),
                'is_paid': is_paid,
                'paid_amount': round(paid_amount, 2) if is_paid else 0,
                'paid_date': paid_date.isoformat() if paid_date else None,
                'is_overdue': not is_paid and payment_date < datetime.now().date() if isinstance(payment_date, date) else False
            })
            
            remaining_principal = new_balance
            if remaining_principal <= 0:
                break
        
        return schedule
    
    def get_paid_emis_count(self):
        """Get count of paid EMIs from EMI installments table"""
        if not self.account_type or self.account_type.name != 'Loan':
            return 0
        
        # Use EMI installments table if available
        from app.models import EMIInstallment
        paid_count = EMIInstallment.query.filter_by(
            account_id=self.id,
            is_paid=True
        ).count()
        
        # If no installments exist, fallback to transaction count (for backward compatibility)
        if paid_count == 0:
            from app.models import Transaction
            repayments = Transaction.query.filter_by(
                account_id=self.id,
                transaction_type='loan_repayment'
            ).count()
            return repayments
        
        return paid_count
    
    def __repr__(self):
        return f'<Account {self.account_type.name if self.account_type else "Unknown"} for Customer {self.customer_id}>'
