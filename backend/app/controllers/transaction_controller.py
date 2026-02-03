from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.transaction_service import TransactionService
from app.services.payment_simulation_service import PaymentSimulationService
from app.services.customer_service import CustomerService
from app.utils.decorators import admin_required, manager_required
import logging

logger = logging.getLogger(__name__)

class TransactionController:
    @staticmethod
    def create_transaction():
        """Create a new transaction"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Validate user exists
            if not user_role or not user_id:
                return {
                    'success': False,
                    'message': 'User not found or invalid',
                    'data': None
                }, 401
            
            # Validate required fields
            required_fields = ['account_id', 'transaction_type', 'amount', 'payment_type']
            for field in required_fields:
                if field not in data:
                    return {
                        'success': False,
                        'message': f'Missing required field: {field}',
                        'data': None
                    }, 400
            
            # Validate transaction type
            valid_types = ['deposit', 'withdrawal', 'interest', 'penalty', 'loan_disbursal', 'loan_repayment']
            if data['transaction_type'] not in valid_types:
                return {
                    'success': False,
                    'message': 'Invalid transaction type',
                    'data': None
                }, 400
            
            # Validate amount
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be positive',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            # Use payment simulation for deposits and withdrawals
            if data['transaction_type'] in ['deposit', 'withdrawal']:
                if data['transaction_type'] == 'deposit':
                    result = PaymentSimulationService.simulate_deposit(
                        account_id=data['account_id'],
                        amount=amount,
                        description=data.get('description', ''),
                        created_by=user_id,
                        payment_type=data.get('payment_type')
                    )
                else:  # withdrawal
                    result = PaymentSimulationService.simulate_withdrawal(
                        account_id=data['account_id'],
                        amount=amount,
                        description=data.get('description', ''),
                        created_by=user_id,
                    )
            else:
                # Use regular transaction service for other types
                result = TransactionService.create_transaction(
                    account_id=data['account_id'],
                    transaction_type=data['transaction_type'],
                    amount=amount,
                    description=data.get('description', ''),
                    created_by=user_id,
                    reference_number=data.get('reference_number'),
                    payment_type=data.get('payment_type')
                )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_transaction controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create transaction',
                'data': None
            }, 500
    
    @staticmethod
    def create_edit_request():
        """Submit a transaction edit request (Staff/Manager)"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only staff and manager can create edit requests (admin doesn't need to request, they can directly edit)
            if user_role not in ['staff', 'manager']:
                return {
                    'success': False,
                    'message': 'Access denied. Only staff and managers can create edit requests.',
                    'data': None
                }, 403

            # Validate required fields
            required_fields = ['transaction_id', 'amount', 'reason']
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
                        'message': 'Amount must be positive',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400

            # Validate reason
            if not data.get('reason') or not data['reason'].strip():
                return {
                    'success': False,
                    'message': 'Reason is required',
                    'data': None
                }, 400

            # Create edit request
            result = TransactionService.create_edit_request(
                transaction_id=data['transaction_id'],
                new_amount=amount,
                reason=data['reason'],
                requested_by=user_id,
                user_role=user_role  # Pass user role to check permissions
            )
            status_code = 201 if result['success'] else 400
            return result, status_code

        except Exception as e:
            logger.error(f'Error in create_edit_request controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create edit request',
                'data': None
            }, 500
    
    @staticmethod
    def get_pending_edit_requests():
        """Get all pending edit requests (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin can view pending edit requests
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins can view pending edit requests.',
                    'data': None
                }, 403
            
            result = TransactionService.get_pending_edit_requests()
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_pending_edit_requests controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve pending edit requests',
                'data': None
            }, 500
    
    @staticmethod
    def get_my_edit_requests():
        """Get edit requests created by current user (Manager/Staff)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only manager and staff can view their own edit requests
            if user_role not in ['manager', 'staff']:
                return {
                    'success': False,
                    'message': 'Access denied. Only managers and staff can view their edit requests.',
                    'data': None
                }, 403
            
            result = TransactionService.get_user_edit_requests(user_id)
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_my_edit_requests controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve edit requests',
                'data': None
            }, 500
    
    @staticmethod
    def approve_edit_request(request_id):
        """Approve edit request and update transaction (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin can approve edit requests
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins can approve edit requests.',
                    'data': None
                }, 403
            
            # Verify that the user is from the users table (not customers table)
            from app.models.user import User
            admin_user = User.query.get(user_id)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins from users table can approve edit requests.',
                    'data': None
                }, 403
            
            result = TransactionService.approve_edit_request(
                request_id=request_id,
                approved_by=user_id
            )
            status_code = 200 if result['success'] else 400
            return result, status_code

        except Exception as e:
            logger.error(f'Error in approve_edit_request controller: {e}')
            return {
                'success': False,
                'message': 'Failed to approve edit request',
                'data': None
            }, 500
    
    @staticmethod
    def direct_edit_transaction(transaction_id):
        """Directly edit transaction (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin can directly edit transactions
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins can directly edit transactions.',
                    'data': None
                }, 403
            
            # Verify that the user is from the users table (not customers table)
            from app.models.user import User
            admin_user = User.query.get(user_id)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Invalid admin user',
                    'data': None
                }, 403
            
            data = request.get_json()
            new_amount = data.get('amount')
            reason = data.get('reason', '')
            
            if not new_amount:
                return {
                    'success': False,
                    'message': 'Amount is required',
                    'data': None
                }, 400
            
            try:
                new_amount = float(new_amount)
                if new_amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be positive',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            result = TransactionService.direct_edit_transaction(
                transaction_id=transaction_id,
                new_amount=new_amount,
                reason=reason,
                edited_by=user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in direct_edit_transaction controller: {e}')
            return {
                'success': False,
                'message': 'Failed to edit transaction',
                'data': None
            }, 500
    
    @staticmethod
    def get_transaction_edit_history(transaction_id):
        """Get edit history for a transaction"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            result = TransactionService.get_transaction_edit_history(transaction_id)
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_transaction_edit_history controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve edit history',
                'data': None
            }, 500
    
    @staticmethod
    def reject_edit_request(request_id):
        """Reject edit request (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin can reject edit requests
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins can reject edit requests.',
                    'data': None
                }, 403
            
            # Verify that the user is from the users table (not customers table)
            from app.models.user import User
            admin_user = User.query.get(user_id)
            if not admin_user or admin_user.role != 'admin':
                return {
                    'success': False,
                    'message': 'Access denied. Only admins from users table can reject edit requests.',
                    'data': None
                }, 403
            
            result = TransactionService.reject_edit_request(
                request_id=request_id,
                rejected_by=user_id
            )
            status_code = 200 if result['success'] else 400
            return result, status_code

        except Exception as e:
            logger.error(f'Error in reject_edit_request controller: {e}')
            return {
                'success': False,
                'message': 'Failed to reject edit request',
                'data': None
            }, 500

    @staticmethod
    def get_account_transactions(account_id):
        """Get transactions for a specific account"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Get parameters from request body (POST) or query string (fallback)
            data = request.get_json(silent=True) or {}
            page = data.get('page') or request.args.get('page', 1, type=int)
            limit = data.get('limit') or request.args.get('limit', 10, type=int)
            transaction_type = data.get('type') or request.args.get('type')
            start_date = data.get('start_date') or request.args.get('start_date')
            end_date = data.get('end_date') or request.args.get('end_date')
            
            # Convert to int if needed
            if isinstance(page, str):
                try:
                    page = int(page)
                except ValueError:
                    page = 1
            if isinstance(limit, str):
                try:
                    limit = int(limit)
                except ValueError:
                    limit = 10
            
            # Convert date strings to datetime objects
            if start_date:
                from datetime import datetime
                start_date = datetime.fromisoformat(start_date)
            if end_date:
                from datetime import datetime
                end_date = datetime.fromisoformat(end_date)
            
            # For staff users, they can only see their own account transactions
            if user_role == 'staff':
                # Verify the account belongs to the staff user
                from app.models import Account
                account = Account.query.get(account_id)
                if not account or account.customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only view your own account transactions.',
                        'data': None
                    }, 403
            
            result = TransactionService.get_account_transactions(
                account_id=account_id,
                page=page,
                limit=limit,
                transaction_type=transaction_type,
                start_date=start_date,
                end_date=end_date
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_account_transactions controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transactions',
                'data': None
            }, 500
    
    @staticmethod
    def get_all_transactions():
        """Get all transactions (Admin/Manager only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Admin can always view all transactions
            if user_role == 'admin':
                pass  # No restrictions
            # Manager needs transaction view permission
            elif user_role == 'manager':
                from app.models import UserPermission
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='transactions',
                    can_view=True
                ).first()
                
                if not permission:
                    return {
                        'success': False,
                        'message': 'Access denied. You do not have permission to view transactions.',
                        'data': None
                    }, 403
            else:
                # Staff cannot view all transactions
                return {
                    'success': False,
                    'message': 'Access denied. Only admins and managers can view all transactions.',
                    'data': None
                }, 403
            
            # Get parameters from request body (POST) or query string (fallback)
            data = request.get_json(silent=True) or {}
            page = data.get('page') or request.args.get('page', 1, type=int)
            limit = data.get('limit') or request.args.get('limit', 10, type=int)
            transaction_type = data.get('type') or request.args.get('type')
            account_id = data.get('account_id') or request.args.get('account_id')
            customer_id = data.get('customer_id') or request.args.get('customer_id')
            start_date = data.get('start_date') or request.args.get('start_date')
            end_date = data.get('end_date') or request.args.get('end_date')
            search = data.get('search') or request.args.get('search')
            
            # Convert to int if needed
            if isinstance(page, str):
                try:
                    page = int(page)
                except ValueError:
                    page = 1
            if isinstance(limit, str):
                try:
                    limit = int(limit)
                except ValueError:
                    limit = 10
            
            # Convert date strings to datetime objects
            if start_date:
                from datetime import datetime
                start_date = datetime.fromisoformat(start_date)
            if end_date:
                from datetime import datetime
                end_date = datetime.fromisoformat(end_date)
            
            result = TransactionService.get_all_transactions(
                page=page,
                limit=limit,
                transaction_type=transaction_type,
                account_id=account_id,
                customer_id=customer_id,
                start_date=start_date,
                end_date=end_date,
                search=search,
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_all_transactions controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transactions',
                'data': None
            }, 500
    
    @staticmethod
    def get_transaction_summary():
        """Get transaction summary statistics"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Get parameters from request body (POST) or query string (fallback)
            data = request.get_json(silent=True) or {}
            account_id = data.get('account_id') or request.args.get('account_id')
            start_date = data.get('start_date') or request.args.get('start_date')
            end_date = data.get('end_date') or request.args.get('end_date')
            
            # Convert date strings to datetime objects
            if start_date:
                from datetime import datetime
                start_date = datetime.fromisoformat(start_date)
            if end_date:
                from datetime import datetime
                end_date = datetime.fromisoformat(end_date)
            
            # For staff users, they can only see their own account summary
            if user_role == 'staff' and account_id:
                from app.models import Account
                account = Account.query.get(account_id)
                if not account or account.customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only view your own account summary.',
                        'data': None
                    }, 403
            
            result = TransactionService.get_transaction_summary(
                account_id=account_id,
                start_date=start_date,
                end_date=end_date
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_transaction_summary controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve transaction summary',
                'data': None
            }, 500
    
    @staticmethod
    def process_loan_repayment():
        """Process loan repayment"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            # Validate required fields
            if 'account_id' not in data or 'amount' not in data:
                return {
                    'success': False,
                    'message': 'Missing required fields: account_id and amount',
                    'data': None
                }, 400
            
            # Validate amount
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return {
                        'success': False,
                        'message': 'Amount must be positive',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Invalid amount format',
                    'data': None
                }, 400
            
            # For staff users, verify they own the account
            if user_role == 'staff':
                from app.models import Account
                account = Account.query.get(data['account_id'])
                if not account or account.customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only process repayments for your own accounts.',
                        'data': None
                    }, 403
            
            result = PaymentSimulationService.simulate_loan_repayment(
                account_id=data['account_id'],
                amount=amount,
                description=data.get('description', f"Loan repayment of {amount}"),
                created_by=user_id
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in process_loan_repayment controller: {e}')
            return {
                'success': False,
                'message': 'Failed to process loan repayment',
                'data': None
            }, 500
    
    @staticmethod
    def calculate_interest():
        """Calculate and apply interest for Savings, RD, FD, and DDS accounts"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if 'account_id' not in data:
                return {
                    'success': False,
                    'message': 'Missing required field: account_id',
                    'data': None
                }, 400
            
            # For staff users, verify they own the account
            if user_role == 'staff':
                from app.models import Account
                account = Account.query.get(data['account_id'])
                if not account or account.customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only calculate interest for your own accounts.',
                        'data': None
                    }, 403
            
            force = data.get('force', False)  # Allow force calculation to override frequency check
            
            result = TransactionService.calculate_interest(
                account_id=data['account_id'],
                created_by=user_id,
                force=force
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in calculate_interest controller: {e}')
            return {
                'success': False,
                'message': 'Failed to calculate interest',
                'data': None
            }, 500
    
    @staticmethod
    def bulk_calculate_interest_savings():
        """Bulk calculate interest for all Savings accounts (Admin/Manager only)"""
        try:
            from app.utils.decorators import admin_required
            from app.models import UserPermission
            
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if user_role == 'admin':
                pass  # Admin can always bulk calculate
            elif user_role == 'manager':
                # Check if manager has permission
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='transactions',
                    can_create=True  # Using can_create as permission to calculate interest
                ).first()
                
                if not permission:
                    return {
                        'success': False,
                        'message': 'Access denied. You do not have permission to calculate interest.',
                        'data': None
                    }, 403
            else:
                return {
                    'success': False,
                    'message': 'Access denied. Only admins and managers can bulk calculate interest.',
                    'data': None
                }, 403
            
            result = TransactionService.bulk_calculate_interest_for_savings(created_by=user_id)
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in bulk_calculate_interest_savings controller: {e}')
            return {
                'success': False,
                'message': 'Failed to bulk calculate interest',
                'data': None
            }, 500
