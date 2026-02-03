from app import db
from app.models import Transaction, Account, AccountType, Customer, User
from app.services.transaction_service import TransactionService
from datetime import datetime
import logging
import random

logger = logging.getLogger(__name__)

class PaymentSimulationService:
    @staticmethod
    def simulate_deposit(account_id, amount, description, created_by, payment_type):
        """Simulate a deposit transaction without payment gateway"""
        try:
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Validate account is active
            if account.status != 'active':
                return {
                    'success': False,
                    'message': 'Account is not active',
                    'data': None
                }
            
            # Validate transaction based on account's snapshot/custom values
            is_valid, validation_message = account.validate_transaction(
                'deposit', amount
            )
            
            if not is_valid:
                return {
                    'success': False,
                    'message': validation_message,
                    'data': None
                }
            
            # Simulate payment processing delay
            import time
            time.sleep(0.5)  # Simulate 500ms processing time
            
            # Simulate payment success (90% success rate for testing)
            # Use TransactionService to create the transaction
            result = TransactionService.create_transaction(
                account_id=account_id,
                    transaction_type='deposit',
                    amount=amount,
                    description=description or f"Deposit of ₹{amount:,.2f}",
                    created_by=created_by,
                    payment_type=payment_type
                )
                
            if result['success']:
                return {
                    'success': True,
                    'message': 'Deposit completed successfully',
                    'data': {
                        'transaction': result['data'],
                        'payment_status': 'completed',
                        'reference_number': result['data']['reference_number']
                    }
                    }
            else:
                return result
          
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error simulating deposit: {e}')
            return {
                'success': False,
                'message': 'Failed to process deposit',
                'data': None
            }
    
    @staticmethod
    def simulate_withdrawal(account_id, amount, description, created_by):
        """Simulate a withdrawal transaction without payment gateway"""
        try:
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Validate account is active
            if account.status != 'active':
                return {
                    'success': False,
                    'message': 'Account is not active',
                    'data': None
                }
            
            # Validate transaction based on account type rules
            account_type = account.account_type
            is_valid, validation_message = account.validate_transaction(
                'withdrawal', amount
            )
            
            if not is_valid:
                return {
                    'success': False,
                    'message': validation_message,
                    'data': None
                }
            
            # Simulate payment processing delay
            import time
            time.sleep(0.5)  # Simulate 500ms processing time
            
            # Simulate payment success (95% success rate for withdrawals)
            if random.random() < 0.95:
                # Use TransactionService to create the transaction
                result = TransactionService.create_transaction(
                    account_id=account_id,
                    transaction_type='withdrawal',
                    amount=amount,
                    description=description or f"Withdrawal of ₹{amount:,.2f}",
                    created_by=created_by
                )
                
                if result['success']:
                    return {
                        'success': True,
                        'message': 'Withdrawal completed successfully',
                        'data': {
                            'transaction': result['data'],
                            'payment_status': 'completed',
                            'reference_number': result['data']['reference_number']
                        }
                    }
                else:
                    return result
            else:
                # Simulate payment failure
                return {
                    'success': False,
                    'message': 'Payment simulation failed. Please try again.',
                    'data': None
                }
                
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error simulating withdrawal: {e}')
            return {
                'success': False,
                'message': 'Failed to process withdrawal',
                'data': None
            }
    
    @staticmethod
    def simulate_loan_repayment(account_id, amount, description, created_by):
        """Simulate a loan repayment transaction"""
        try:
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Check if it's a loan account
            if account.account_type.name != 'Loan':
                return {
                    'success': False,
                    'message': 'Account is not a loan account',
                    'data': None
                }
            
            # For loan accounts, balance is negative (outstanding amount)
            if account.balance >= 0:
                return {
                    'success': False,
                    'message': 'Loan account has no outstanding balance',
                    'data': None
                }
            
            # Simulate payment processing delay
            import time
            time.sleep(0.5)  # Simulate 500ms processing time
            
            # Simulate payment success (98% success rate for loan repayments)
            if random.random() < 0.98:
                # Calculate balance changes (repayment reduces outstanding amount)
                balance_before = account.balance
                balance_after = balance_before + amount  # Adding amount reduces negative balance
                
                # Generate reference number
                reference_number = Transaction.generate_reference_number()
                
                # Create transaction
                transaction = Transaction(
                    account_id=account_id,
                    transaction_type='loan_repayment',
                    amount=amount,
                    balance_before=balance_before,
                    balance_after=balance_after,
                    description=description or f"Loan repayment of ₹{amount:,.2f}",
                    reference_number=reference_number,
                    status='completed',
                    created_by=created_by
                )
                
                # Update account balance
                account.balance = balance_after
                account.updated_at = datetime.utcnow()
                
                db.session.add(transaction)
                db.session.flush()  # Flush to get transaction.id
                
                # Mark EMI installment as paid for loan repayments
                from app.services.emi_service import EMIService
                today = datetime.now().date()
                emi_marked = EMIService.mark_emi_paid(
                    account_id=account_id,
                    payment_amount=amount,
                    transaction_id=transaction.id,
                    payment_date=today
                )
                if emi_marked:
                    logger.info(f'EMI installment marked as paid for loan account {account_id}, transaction {transaction.id}')
                else:
                    logger.warning(f'Failed to mark EMI as paid for loan account {account_id}')
                
                db.session.commit()
                
                # Send transaction notification email (non-blocking background thread)
                def send_transaction_email_async():
                    try:
                        # Get customer details
                        customer = account.customer
                        if customer and customer.email:
                            from app.services.email_service import EmailService
                            
                            # Format account number
                            account_number = f"ACC{account.id:06d}"
                            
                            # Format transaction date
                            transaction_date = transaction.created_at.strftime('%B %d, %Y at %I:%M %p') if transaction.created_at else None
                            
                            # Get account type name
                            account_type_name = account.account_type.name if account.account_type else 'Unknown'
                            
                            EmailService.send_transaction_notification_email(
                                customer_email=customer.email,
                                customer_name=customer.name,
                                transaction_type='loan_repayment',
                                amount=amount,
                                account_type=account_type_name,
                                account_number=account_number,
                                balance_before=balance_before,
                                balance_after=balance_after,
                                reference_number=reference_number,
                                description=description or f"Loan repayment of ₹{amount:,.2f}",
                                transaction_date=transaction_date
                            )
                            logger.info(f'Transaction notification email sent to {customer.email} for transaction {transaction.id}')
                        else:
                            logger.warning(f'Customer email not found for account {account_id}, skipping email notification')
                    except Exception as email_error:
                        # Don't fail transaction if email fails
                        logger.error(f'Error sending transaction notification email: {email_error}')
                
                # Start email sending in background thread
                import threading
                email_thread = threading.Thread(target=send_transaction_email_async, daemon=True)
                email_thread.start()
                logger.info(f'Transaction notification email sending started in background thread for transaction {transaction.id}')
                
                return {
                    'success': True,
                    'message': 'Loan repayment completed successfully',
                    'data': {
                        'transaction': transaction.to_dict(),
                        'payment_status': 'completed',
                        'reference_number': reference_number,
                        'outstanding_balance': abs(balance_after) if balance_after < 0 else 0
                    }
                }
            else:
                # Simulate payment failure
                return {
                    'success': False,
                    'message': 'Payment simulation failed. Please try again.',
                    'data': None
                }
                
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error simulating loan repayment: {e}')
            return {
                'success': False,
                'message': 'Failed to process loan repayment',
                'data': None
            }
