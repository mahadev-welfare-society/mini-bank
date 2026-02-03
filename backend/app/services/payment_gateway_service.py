from app import db
from app.models import Transaction, Account, Customer, User
from datetime import datetime
import razorpay
import os
import logging
import hmac
import hashlib

logger = logging.getLogger(__name__)

class PaymentGatewayService:
    """Service for handling Razorpay payment gateway integration"""
    
    @staticmethod
    def get_razorpay_client():
        """Initialize and return Razorpay client"""
        key_id = os.environ.get('RAZORPAY_KEY_ID', '')
        key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
        
        if not key_id or not key_secret:
            logger.warning('Razorpay credentials not configured')
            return None
        
        return razorpay.Client(auth=(key_id, key_secret))
    
    @staticmethod
    def create_payment_order(account_id, amount, transaction_type, description, customer_id):
        """
        Create a Razorpay payment order
        
        Args:
            account_id: Account ID for the transaction
            amount: Amount in INR (float)
            transaction_type: Type of transaction (deposit, loan_repayment)
            description: Transaction description
            customer_id: Customer ID making the payment
        
        Returns:
            dict: Order details with order_id and key_id for frontend
        """
        try:
            client = PaymentGatewayService.get_razorpay_client()
            if not client:
                return {
                    'success': False,
                    'message': 'Payment gateway not configured',
                    'data': None
                }
            
            # Validate account exists
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Validate customer exists
            customer = Customer.query.get(customer_id)
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            # Validate amount
            if amount <= 0:
                return {
                    'success': False,
                    'message': 'Amount must be greater than 0',
                    'data': None
                }
            
            # Convert amount to paise (Razorpay uses smallest currency unit)
            amount_in_paise = int(amount * 100)
            
            # Create order data
            order_data = {
                'amount': amount_in_paise,  # Amount in paise
                'currency': 'INR',
                'receipt': f"TXN_{account_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'notes': {
                    'account_id': str(account_id),
                    'customer_id': str(customer_id),
                    'transaction_type': transaction_type,
                    'description': description or f"{transaction_type.replace('_', ' ').title()}"
                }
            }
            
            # Create order with Razorpay
            order = client.order.create(data=order_data)
            
            logger.info(f'Razorpay order created: {order["id"]} for account {account_id}, amount: {amount}')
            
            return {
                'success': True,
                'message': 'Payment order created successfully',
                'data': {
                    'order_id': order['id'],
                    'amount': amount,
                    'amount_in_paise': amount_in_paise,
                    'currency': 'INR',
                    'key_id': os.environ.get('RAZORPAY_KEY_ID', ''),
                    'account_id': account_id,
                    'transaction_type': transaction_type,
                    'description': description
                }
            }
            
        except razorpay.errors.BadRequestError as e:
            logger.error(f'Razorpay BadRequestError: {e}')
            return {
                'success': False,
                'message': f'Payment gateway error: {str(e)}',
                'data': None
            }
        except Exception as e:
            logger.error(f'Error creating payment order: {e}')
            return {
                'success': False,
                'message': 'Failed to create payment order',
                'data': None
            }
    
    @staticmethod
    def verify_payment_signature(order_id, payment_id, signature):
        """
        Verify Razorpay payment signature
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID
            signature: Payment signature from Razorpay
        
        Returns:
            bool: True if signature is valid, False otherwise
        """
        try:
            key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
            if not key_secret:
                logger.error('Razorpay key secret not configured')
                return False
            
            # Create message
            message = f"{order_id}|{payment_id}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                key_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if is_valid:
                logger.info(f'Payment signature verified for payment_id: {payment_id}')
            else:
                logger.warning(f'Invalid payment signature for payment_id: {payment_id}')
            
            return is_valid
            
        except Exception as e:
            logger.error(f'Error verifying payment signature: {e}')
            return False
    
    @staticmethod
    def process_payment_success(order_id, payment_id, signature, account_id, transaction_type, amount, description, created_by):
        """
        Process successful payment and create transaction
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID
            signature: Payment signature
            account_id: Account ID
            transaction_type: Type of transaction
            amount: Amount in INR
            description: Transaction description
            created_by: User/Customer ID who initiated the payment
        
        Returns:
            dict: Transaction result
        """
        try:
            # Verify payment signature
            if not PaymentGatewayService.verify_payment_signature(order_id, payment_id, signature):
                return {
                    'success': False,
                    'message': 'Invalid payment signature',
                    'data': None
                }
            
            # Get payment details from Razorpay
            client = PaymentGatewayService.get_razorpay_client()
            if not client:
                return {
                    'success': False,
                    'message': 'Payment gateway not configured',
                    'data': None
                }
            
            try:
                payment = client.payment.fetch(payment_id)
                
                # Verify payment status
                if payment['status'] != 'captured' and payment['status'] != 'authorized':
                    return {
                        'success': False,
                        'message': f"Payment not successful. Status: {payment['status']}",
                        'data': None
                    }
                
                # Verify order ID matches
                if payment.get('order_id') != order_id:
                    return {
                        'success': False,
                        'message': 'Order ID mismatch',
                        'data': None
                    }
                
                # Verify amount matches (convert from paise to INR)
                payment_amount = payment['amount'] / 100
                if abs(payment_amount - amount) > 0.01:  # Allow small floating point differences
                    return {
                        'success': False,
                        'message': 'Amount mismatch',
                        'data': None
                    }
                
            except razorpay.errors.BadRequestError as e:
                logger.error(f'Error fetching payment from Razorpay: {e}')
                return {
                    'success': False,
                    'message': 'Failed to verify payment with gateway',
                    'data': None
                }
            
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Check if transaction already exists (idempotency check)
            existing_transaction = Transaction.query.filter_by(
                reference_number=f"RZP_{payment_id}"
            ).first()
            
            if existing_transaction:
                logger.warning(f'Transaction already exists for payment_id: {payment_id}')
                return {
                    'success': True,
                    'message': 'Payment already processed',
                    'data': existing_transaction.to_dict()
                }
            
            # Calculate balance changes
            balance_before = account.balance
            
            if transaction_type == 'deposit':
                balance_after = balance_before + amount
            elif transaction_type == 'loan_repayment':
                # For loans, balance is negative (outstanding amount)
                # Repayment adds to the balance to reduce the negative value
                # Example: -1000 + 500 = -500 (reduced outstanding)
                balance_after = balance_before + amount
                
                # Update last_payment_date for loan accounts
                today = datetime.now().date()
                account.last_payment_date = today
                logger.info(f'Updated last_payment_date for loan account {account_id} to {today}')
            else:
                return {
                    'success': False,
                    'message': 'Invalid transaction type for payment gateway',
                    'data': None
                }
            
            # Determine creator type
            creator_type = 'customer'
            if User.query.get(created_by):
                creator_type = 'user'
            
            # Generate reference number
            reference_number = f"RZP_{payment_id}"
            
            # Create transaction
            transaction = Transaction(
                account_id=account_id,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=balance_before,
                balance_after=balance_after,
                description=description or f"Payment via Razorpay - {transaction_type.replace('_', ' ').title()}",
                reference_number=reference_number,
                status='completed',
                created_by=created_by,
                creator_type=creator_type
            )
            
            # Update account balance
            account.balance = balance_after
            account.updated_at = datetime.utcnow()
            
            db.session.add(transaction)
            db.session.flush()  # Flush to get transaction.id
            
            # Mark EMI installment as paid for loan repayments
            if transaction_type == 'loan_repayment':
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
            
            logger.info(f'Payment processed successfully: payment_id={payment_id}, transaction_id={transaction.id}')
            
            return {
                'success': True,
                'message': 'Payment processed successfully',
                'data': transaction.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error processing payment: {e}')
            return {
                'success': False,
                'message': 'Failed to process payment',
                'data': None
            }
    
    @staticmethod
    def process_payment_failure(order_id, payment_id, error_description, account_id, transaction_type, amount, created_by):
        """
        Process failed payment and create a failed transaction record
        
        Args:
            order_id: Razorpay order ID
            payment_id: Razorpay payment ID (if available)
            error_description: Error description
            account_id: Account ID
            transaction_type: Type of transaction
            amount: Amount in INR
            created_by: User/Customer ID who initiated the payment
        
        Returns:
            dict: Transaction result
        """
        try:
            # Get account
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Determine creator type
            creator_type = 'customer'
            if User.query.get(created_by):
                creator_type = 'user'
            
            # Generate reference number
            reference_number = f"RZP_FAILED_{order_id}"
            if payment_id:
                reference_number = f"RZP_FAILED_{payment_id}"
            
            # Create failed transaction record
            transaction = Transaction(
                account_id=account_id,
                transaction_type=transaction_type,
                amount=amount,
                balance_before=account.balance,
                balance_after=account.balance,  # No balance change for failed transactions
                description=f"Payment failed via Razorpay - {error_description or 'Unknown error'}",
                reference_number=reference_number,
                status='failed',
                created_by=created_by,
                creator_type=creator_type
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            logger.info(f'Payment failure recorded: order_id={order_id}, transaction_id={transaction.id}')
            
            return {
                'success': True,
                'message': 'Payment failure recorded',
                'data': transaction.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error processing payment failure: {e}')
            return {
                'success': False,
                'message': 'Failed to record payment failure',
                'data': None
            }

