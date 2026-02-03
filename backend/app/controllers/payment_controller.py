from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.payment_gateway_service import PaymentGatewayService
from app.services.customer_service import CustomerService
import logging

logger = logging.getLogger(__name__)

class PaymentController:
    @staticmethod
    def create_payment_order():
        """Create a Razorpay payment order"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Only customers (staff) can create payment orders
            if user_role != 'staff':
                return {
                    'success': False,
                    'message': 'Only customers can make payments',
                    'data': None
                }, 403
            
            # Validate required fields
            required_fields = ['account_id', 'amount', 'transaction_type']
            for field in required_fields:
                if field not in data:
                    return {
                        'success': False,
                        'message': f'Missing required field: {field}',
                        'data': None
                    }, 400
            
            # Validate transaction type
            valid_types = ['deposit', 'loan_repayment']
            if data['transaction_type'] not in valid_types:
                return {
                    'success': False,
                    'message': f'Invalid transaction type. Allowed types: {", ".join(valid_types)}',
                    'data': None
                }, 400
            
            # Validate amount
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be greater than 0',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            # Verify account belongs to customer
            from app.models import Account
            account = Account.query.get(data['account_id'])
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }, 404
            
            if account.customer_id != user_id:
                return {
                    'success': False,
                    'message': 'Access denied. You can only make payments for your own accounts.',
                    'data': None
                }, 403
            
            # Create payment order
            result = PaymentGatewayService.create_payment_order(
                account_id=data['account_id'],
                amount=amount,
                transaction_type=data['transaction_type'],
                description=data.get('description', ''),
                customer_id=user_id
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_payment_order controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create payment order',
                'data': None
            }, 500
    
    @staticmethod
    def verify_payment():
        """Verify and process successful payment"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Only customers (staff) can verify payments
            if user_role != 'staff':
                return {
                    'success': False,
                    'message': 'Only customers can verify payments',
                    'data': None
                }, 403
            
            # Validate required fields
            required_fields = ['order_id', 'payment_id', 'signature', 'account_id', 'transaction_type', 'amount']
            for field in required_fields:
                if field not in data:
                    return {
                        'success': False,
                        'message': f'Missing required field: {field}',
                        'data': None
                    }, 400
            
            # Validate amount
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be greater than 0',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            # Verify account belongs to customer
            from app.models import Account
            account = Account.query.get(data['account_id'])
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }, 404
            
            if account.customer_id != user_id:
                return {
                    'success': False,
                    'message': 'Access denied. You can only verify payments for your own accounts.',
                    'data': None
                }, 403
            
            # Process payment
            result = PaymentGatewayService.process_payment_success(
                order_id=data['order_id'],
                payment_id=data['payment_id'],
                signature=data['signature'],
                account_id=data['account_id'],
                transaction_type=data['transaction_type'],
                amount=amount,
                description=data.get('description', ''),
                created_by=user_id
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in verify_payment controller: {e}')
            return {
                'success': False,
                'message': 'Failed to verify payment',
                'data': None
            }, 500
    
    @staticmethod
    def handle_payment_failure():
        """Handle payment failure"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Only customers (staff) can report payment failures
            if user_role != 'staff':
                return {
                    'success': False,
                    'message': 'Only customers can report payment failures',
                    'data': None
                }, 403
            
            # Validate required fields
            required_fields = ['order_id', 'account_id', 'transaction_type', 'amount']
            for field in required_fields:
                if field not in data:
                    return {
                        'success': False,
                        'message': f'Missing required field: {field}',
                        'data': None
                    }, 400
            
            # Validate amount
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be greater than 0',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            # Verify account belongs to customer
            from app.models import Account
            account = Account.query.get(data['account_id'])
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }, 404
            
            if account.customer_id != user_id:
                return {
                    'success': False,
                    'message': 'Access denied. You can only report payment failures for your own accounts.',
                    'data': None
                }, 403
            
            # Process payment failure
            result = PaymentGatewayService.process_payment_failure(
                order_id=data['order_id'],
                payment_id=data.get('payment_id'),
                error_description=data.get('error_description', 'Payment failed'),
                account_id=data['account_id'],
                transaction_type=data['transaction_type'],
                amount=amount,
                created_by=user_id
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in handle_payment_failure controller: {e}')
            return {
                'success': False,
                'message': 'Failed to handle payment failure',
                'data': None
            }, 500

