from app import db
from app.models import Account, EMIInstallment
from datetime import datetime, date, timedelta
from calendar import monthrange
import logging

logger = logging.getLogger(__name__)

class EMIService:
    @staticmethod
    def generate_emi_installments(account_id):
        """Generate all EMI installments for a loan account"""
        try:
            account = Account.query.get(account_id)
            if not account:
                logger.error(f'Account {account_id} not found for EMI generation')
                return False
            
            if not account.account_type or account.account_type.name != 'Loan':
                logger.warning(f'Account {account_id} is not a loan account')
                return False
            
            # Check if installments already exist
            existing_count = EMIInstallment.query.filter_by(account_id=account_id).count()
            if existing_count > 0:
                logger.info(f'EMI installments already exist for account {account_id}. Skipping generation.')
                return True
            
            # Get loan parameters
            principal = account.snapshot_loan_principal or abs(account.balance) if account.balance < 0 else 0
            emi_amount = account.snapshot_emi_amount
            term_months = account.snapshot_loan_term_months
            interest_rate = account.get_effective_interest_rate()
            repayment_frequency = account.snapshot_repayment_frequency or 'monthly'
            emi_due_day = account.emi_due_day
            start_date = account.start_date or datetime.now().date()
            
            # Validate required fields
            if not principal or principal <= 0:
                logger.error(f'Invalid principal amount for account {account_id}: {principal}')
                return False
            if not emi_amount or emi_amount <= 0:
                logger.error(f'Invalid EMI amount for account {account_id}: {emi_amount}')
                return False
            if not term_months or term_months <= 0:
                logger.error(f'Invalid loan term for account {account_id}: {term_months}')
                return False
            
            # Calculate monthly interest rate
            monthly_rate = interest_rate / 100 / 12 if interest_rate else 0
            
            # Generate installments
            installments = []
            remaining_principal = principal
            current_date = start_date
            due_day = emi_due_day if emi_due_day is not None else start_date.day
            
            for emi_number in range(1, term_months + 1):
                # Calculate interest and principal components
                interest_component = remaining_principal * monthly_rate
                principal_component = emi_amount - interest_component
                
                # Adjust for last EMI to ensure exact principal payment
                if emi_number == term_months:
                    principal_component = remaining_principal
                    emi_amount_adjusted = principal_component + interest_component
                else:
                    emi_amount_adjusted = emi_amount
                
                # Calculate due date based on repayment frequency
                if emi_number == 1:
                    # First EMI due date
                    due_date = EMIService._calculate_next_due_date(
                        start_date, repayment_frequency, due_day, 1
                    )
                else:
                    # Subsequent EMI due dates
                    prev_due_date = installments[-1].due_date if installments else start_date
                    due_date = EMIService._calculate_next_due_date(
                        prev_due_date, repayment_frequency, due_day, 1
                    )
                
                # Calculate remaining principal after this EMI
                remaining_principal_after = remaining_principal - principal_component
                
                # Create installment
                installment = EMIInstallment(
                    account_id=account_id,
                    emi_number=emi_number,
                    due_date=due_date,
                    emi_amount=emi_amount_adjusted,
                    principal_component=principal_component,
                    interest_component=interest_component,
                    remaining_principal_before=remaining_principal,
                    remaining_principal_after=max(0, remaining_principal_after),
                    is_paid=False,
                    is_overdue=False
                )
                
                installments.append(installment)
                remaining_principal = remaining_principal_after
                
                # Stop if principal is fully paid
                if remaining_principal <= 0:
                    break
            
            # Bulk insert installments
            db.session.add_all(installments)
            db.session.commit()
            
            logger.info(f'Generated {len(installments)} EMI installments for account {account_id}')
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error generating EMI installments for account {account_id}: {e}')
            return False
    
    @staticmethod
    def _calculate_next_due_date(base_date, frequency, due_day, periods=1):
        """Calculate next due date based on repayment frequency"""
        from calendar import monthrange
        
        if frequency == 'monthly':
            # Add months
            year = base_date.year
            month = base_date.month
            for _ in range(periods):
                if month == 12:
                    year += 1
                    month = 1
                else:
                    month += 1
            
            # Set to due day, handling months with fewer days
            last_day = monthrange(year, month)[1]
            day = min(due_day, last_day)
            return date(year, month, day)
        
        elif frequency == 'quarterly':
            # Add 3 months per period
            year = base_date.year
            month = base_date.month
            for _ in range(periods):
                if month <= 9:
                    month += 3
                else:
                    year += 1
                    month = month - 9
            
            last_day = monthrange(year, month)[1]
            day = min(due_day, last_day)
            return date(year, month, day)
        
        elif frequency == 'weekly':
            # Add 7 days per period
            return base_date + timedelta(days=7 * periods)
        
        elif frequency == 'daily':
            # Add 1 day per period
            return base_date + timedelta(days=periods)
        
        else:
            # Default to monthly
            year = base_date.year
            month = base_date.month
            for _ in range(periods):
                if month == 12:
                    year += 1
                    month = 1
                else:
                    month += 1
            
            last_day = monthrange(year, month)[1]
            day = min(due_day, last_day)
            return date(year, month, day)
    
    @staticmethod
    def mark_emi_paid(account_id, payment_amount, transaction_id, payment_date=None):
        """Mark unpaid EMI installment(s) as paid. If payment covers multiple EMIs, mark multiple."""
        try:
            if payment_date is None:
                payment_date = datetime.now().date()
            
            # Get all unpaid EMI installments in order
            unpaid_emis = EMIInstallment.query.filter_by(
                account_id=account_id,
                is_paid=False
            ).order_by(EMIInstallment.due_date.asc()).all()
            
            if not unpaid_emis:
                logger.warning(f'No unpaid EMI found for account {account_id}')
                return False
            
            remaining_payment = payment_amount
            marked_count = 0
            
            # Mark EMIs as paid until payment amount is exhausted
            # Allow 5% tolerance for rounding differences
            for emi in unpaid_emis:
                if remaining_payment <= 0:
                    break
                
                # Calculate how much of this EMI can be paid
                emi_amount = emi.emi_amount
                tolerance = emi_amount * 0.05  # 5% tolerance
                
                # Check if remaining payment covers this EMI (with tolerance)
                if remaining_payment >= (emi_amount - tolerance):
                    # Mark this EMI as fully paid
                    amount_to_pay = emi_amount
                    emi.mark_as_paid(
                        paid_amount=amount_to_pay,
                        paid_date=payment_date,
                        transaction_id=transaction_id if marked_count == 0 else None  # Link transaction to first EMI only
                    )
                    remaining_payment -= amount_to_pay
                    marked_count += 1
                    logger.info(f'Marked EMI #{emi.emi_number} as paid (amount: {amount_to_pay}) for account {account_id}')
                else:
                    # Payment is less than EMI amount - mark with partial payment
                    # This handles cases where payment is slightly less due to rounding
                    if remaining_payment >= (emi_amount * 0.95):  # At least 95% of EMI
                        partial_amount = remaining_payment
                        emi.mark_as_paid(
                            paid_amount=partial_amount,
                            paid_date=payment_date,
                            transaction_id=transaction_id if marked_count == 0 else None
                        )
                        remaining_payment = 0
                        marked_count += 1
                        logger.info(f'Marked EMI #{emi.emi_number} as paid (partial amount: {partial_amount}) for account {account_id}')
                    break  # Stop if payment is insufficient
            
            # Update overdue status for all unpaid installments
            EMIService._update_overdue_status(account_id)
            
            db.session.commit()
            
            if marked_count > 0:
                logger.info(f'Marked {marked_count} EMI installment(s) as paid for account {account_id}')
            return marked_count > 0
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error marking EMI as paid for account {account_id}: {e}')
            return False
    
    @staticmethod
    def _update_overdue_status(account_id):
        """Update overdue status for all unpaid installments"""
        try:
            unpaid_installments = EMIInstallment.query.filter_by(
                account_id=account_id,
                is_paid=False
            ).all()
            
            today = date.today()
            for installment in unpaid_installments:
                installment.update_overdue_status()
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f'Error updating overdue status for account {account_id}: {e}')
    
    @staticmethod
    def get_next_unpaid_emi(account_id):
        """Get the next unpaid EMI installment"""
        try:
            return EMIInstallment.query.filter_by(
                account_id=account_id,
                is_paid=False
            ).order_by(EMIInstallment.due_date.asc()).first()
        except Exception as e:
            logger.error(f'Error getting next unpaid EMI for account {account_id}: {e}')
            return None
    
    @staticmethod
    def get_paid_emis_count(account_id):
        """Get count of paid EMIs"""
        try:
            return EMIInstallment.query.filter_by(
                account_id=account_id,
                is_paid=True
            ).count()
        except Exception as e:
            logger.error(f'Error getting paid EMIs count for account {account_id}: {e}')
            return 0

