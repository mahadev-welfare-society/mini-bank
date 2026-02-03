from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.account_service import AccountService
from app.services.customer_service import CustomerService
import logging

logger = logging.getLogger(__name__)

class AccountController:
    @staticmethod
    def create_account():
        """Handle account creation"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Validate required fields
            if not data.get('account_type_id'):
                return {
                    'success': False,
                    'message': 'account_type_id is required',
                    'data': None
                }, 400
            
            # Validate initial_balance - allow 0 but check if it's provided
            if 'initial_balance' not in data or data.get('initial_balance') is None:
                return {
                    'success': False,
                    'message': 'initial_balance is required',
                    'data': None
                }, 400
            
            # Determine customer_id based on user role
            customer_id = data.get('customer_id')
            if not customer_id:
                # If customer_id not provided, use current user's ID (for staff applying for their own loan)
                if user_role == 'staff':
                    customer_id = user_id
                else:
                    return {
                        'success': False,
                        'message': 'customer_id is required',
                        'data': None
                    }, 400
            
            # Validate initial balance - convert to float, allow 0
            try:
                initial_balance = float(data['initial_balance'])
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Initial balance must be a valid number',
                    'data': None
                }, 400
            
            # Check if staff is trying to create account for themselves
            if user_role == 'staff':
                if int(customer_id) != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only create accounts for yourself.',
                        'data': None
                    }, 403
                # For staff, only allow loan account creation (self-service)
                from app.models import AccountType, Account
                account_type = AccountType.query.get(int(data['account_type_id']))
                if not account_type or account_type.name != 'Loan':
                    return {
                        'success': False,
                        'message': 'As a customer, you can only apply for loan accounts. Please contact your manager for other account types.',
                        'data': None
                    }, 403
                
                # Check if loan account already exists for this customer with 0 balance
                existing_loan_account = Account.query.filter_by(
                    customer_id=customer_id,
                    account_type_id=account_type.id,
                    status='active'
                ).first()
                
                if existing_loan_account and existing_loan_account.balance == 0:
                    # Update existing loan account instead of creating new one
                    result = AccountService.activate_loan_account(
                        account_id=existing_loan_account.id,
                        loan_amount=initial_balance,
                        loan_term_months=data.get('loan_term_months'),
                        created_by=current_user_id
                    )
                    status_code = 200 if result['success'] else 400
                    return result, status_code
            
            # Check account type and extract type-specific parameters
            from app.models import AccountType
            account_type = AccountType.query.get(int(data['account_type_id']))
            account_type_name = account_type.name if account_type else None
            
            # Extract common parameters
            custom_interest_rate = data.get('custom_interest_rate')
            
            if account_type_name == 'Loan':
                # For loan accounts, extract loan-specific parameters
                loan_term_months = data.get('loan_term_months')
                emi_due_day = data.get('emi_due_day')
                
                result = AccountService.create_account(
                    customer_id=int(customer_id),
                    account_type_id=int(data['account_type_id']),
                    initial_balance=initial_balance,
                    created_by=current_user_id,
                    loan_term_months=int(loan_term_months) if loan_term_months else None,
                    custom_interest_rate=float(custom_interest_rate) if custom_interest_rate else None,
                    emi_due_day=int(emi_due_day) if emi_due_day else None
                )
                status_code = 201 if result['success'] else 400
                return result, status_code
            elif account_type_name == 'RD':
                # For RD accounts, extract RD-specific parameters
                rd_contribution_amount = data.get('rd_contribution_amount')
                rd_contribution_day = data.get('rd_contribution_day')
                rd_term_days = data.get('rd_term_days')
                
                result = AccountService.create_account(
                    customer_id=int(customer_id),
                    account_type_id=int(data['account_type_id']),
                    initial_balance=initial_balance,
                    created_by=current_user_id,
                    custom_interest_rate=float(custom_interest_rate) if custom_interest_rate else None,
                    rd_contribution_amount=float(rd_contribution_amount) if rd_contribution_amount else None,
                    rd_contribution_day=int(rd_contribution_day) if rd_contribution_day else None,
                    rd_term_days=int(rd_term_days) if rd_term_days else None
                )

                status_code = 201 if result['success'] else 400
                return result, status_code
            elif account_type_name == 'FD':
                # For FD accounts, extract FD-specific parameters
                fd_term_days = data.get('fd_term_days')
                
                result = AccountService.create_account(
                    customer_id=int(customer_id),
                    account_type_id=int(data['account_type_id']),
                    initial_balance=initial_balance,
                    created_by=current_user_id,
                    custom_interest_rate=float(custom_interest_rate) if custom_interest_rate else None,
                    fd_term_days=int(fd_term_days) if fd_term_days else None
                )
                status_code = 201 if result['success'] else 400
                return result, status_code
            elif account_type_name == 'DDS':
                # For DDS accounts, extract DDS-specific parameters (similar to FD)
                fd_term_days = data.get('fd_term_days')  # Reuse fd_term_days parameter for DDS
                
                result = AccountService.create_account(
                    customer_id=int(customer_id),
                    account_type_id=int(data['account_type_id']),
                    initial_balance=initial_balance,
                    created_by=current_user_id,
                    custom_interest_rate=float(custom_interest_rate) if custom_interest_rate else None,
                    fd_term_days=int(fd_term_days) if fd_term_days else None
                )
                status_code = 201 if result['success'] else 400
                return result, status_code
            else:
                # For other account types (Savings, etc.)
                result = AccountService.create_account(
                    customer_id=int(customer_id),
                    account_type_id=int(data['account_type_id']),
                    initial_balance=initial_balance,
                    created_by=current_user_id,
                    custom_interest_rate=float(custom_interest_rate) if custom_interest_rate else None
                )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_account controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create account',
                'data': None
            }, 500
    
    @staticmethod
    def get_accounts():
        """Handle getting all accounts with pagination and filters"""
        try:
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Get parameters from request body (with fallback to query params)
            data = request.get_json(silent=True) or {}
            page = data.get('page') or request.args.get('page', 1, type=int)
            limit = data.get('limit') or request.args.get('limit', 10, type=int)
            
            # Get filter parameters
            search = data.get('search') or request.args.get('search', '').strip()
            account_type_filter = data.get('account_type') or request.args.get('account_type', '').strip()
            status_filter = data.get('status') or request.args.get('status', '').strip()
            
            # Ensure string values are properly stripped
            if isinstance(search, str):
                search = search.strip()
            if isinstance(account_type_filter, str):
                account_type_filter = account_type_filter.strip()
            if isinstance(status_filter, str):
                status_filter = status_filter.strip()
            
            # Validate pagination parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 100:  # Max 100 items per page
                limit = 10
            
            result = AccountService.get_accounts(
                user_role=user_role,
                user_id=user_id,
                page=page,
                limit=limit,
                search=search,
                account_type_filter=account_type_filter,
                status_filter=status_filter
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_accounts controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get accounts',
                'data': None
            }, 500
    
    @staticmethod
    def get_account(account_id):
        """Handle getting a specific account"""
        try:
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            result = AccountService.get_account(
                account_id=account_id,
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 404
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_account controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get account',
                'data': None
            }, 500
    
    @staticmethod
    def update_account_status(account_id):
        """Handle updating account status"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Validate required fields
            if not data.get('status'):
                return {
                    'success': False,
                    'message': 'status is required',
                    'data': None
                }, 400
            
            result = AccountService.update_account_status(
                account_id=account_id,
                status=data['status'],
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_account_status controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update account status',
                'data': None
            }, 500
    
    @staticmethod
    def get_customer_accounts(customer_id):
        """Handle getting all accounts for a specific customer"""
        try:
            current_user_id = get_jwt_identity()
            
            # Get user role and ID
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            result = AccountService.get_customer_accounts(
                customer_id=customer_id,
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 403
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_customer_accounts controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get customer accounts',
                'data': None
            }, 500
    
    @staticmethod
    def update_account_interest_rate(account_id):
        """Handle updating interest rate for a specific account (Admin only)"""
        try:
            from app.utils.decorators import admin_required
            from functools import wraps
            
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Only admins can update account parameters',
                    'data': None
                }, 403
            
            data = request.get_json()
            
            if 'interest_rate' not in data:
                return {
                    'success': False,
                    'message': 'interest_rate is required',
                    'data': None
                }, 400
            
            try:
                new_rate = float(data['interest_rate'])
                if new_rate < 0 or new_rate > 100:
                    return {
                        'success': False,
                        'message': 'Interest rate must be between 0 and 100',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Interest rate must be a valid number',
                    'data': None
                }, 400
            
            reason = data.get('reason', 'Interest rate update')
            
            result = AccountService.update_account_interest_rate(
                account_id=account_id,
                new_rate=new_rate,
                updated_by=user_id,
                reason=reason
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_account_interest_rate controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update interest rate',
                'data': None
            }, 500
    
    @staticmethod
    def bulk_update_account_type_interest_rate(account_type_id):
        """Handle bulk updating interest rate for all accounts of a type (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Only admins can bulk update account parameters',
                    'data': None
                }, 403
            
            data = request.get_json()
            
            if 'interest_rate' not in data:
                return {
                    'success': False,
                    'message': 'interest_rate is required',
                    'data': None
                }, 400
            
            try:
                new_rate = float(data['interest_rate'])
                if new_rate < 0 or new_rate > 100:
                    return {
                        'success': False,
                        'message': 'Interest rate must be between 0 and 100',
                        'data': None
                    }, 400
            except (ValueError, TypeError):
                return {
                    'success': False,
                    'message': 'Interest rate must be a valid number',
                    'data': None
                }, 400
            
            reason = data.get('reason', f'Bulk interest rate update')
            
            result = AccountService.bulk_update_account_type_interest_rate(
                account_type_id=account_type_id,
                new_rate=new_rate,
                updated_by=user_id,
                reason=reason
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in bulk_update_account_type_interest_rate controller: {e}')
            return {
                'success': False,
                'message': 'Failed to bulk update interest rate',
                'data': None
            }, 500
    
    @staticmethod
    def get_account_parameter_history(account_id):
        """Handle getting parameter update history for an account"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin can view parameter history
            if user_role != 'admin':
                return {
                    'success': False,
                    'message': 'Only admins can view parameter history',
                    'data': None
                }, 403
            
            result = AccountService.get_account_parameter_history(account_id)
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_account_parameter_history controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get parameter history',
                'data': None
            }, 500
    
    @staticmethod
    def get_emi_schedule(account_id):
        """Get EMI schedule for a loan account"""
        try:
            from app.models import Account
            from app.services.customer_service import CustomerService
            
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }, 404
            
            # Check if account is loan account
            if not account.account_type or account.account_type.name != 'Loan':
                return {
                    'success': False,
                    'message': 'Account is not a loan account',
                    'data': None
                }, 400
            
            # Check access permissions
            if user_role == 'staff':
                if account.customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied. You can only view your own accounts.',
                        'data': None
                    }, 403
            
            # Generate EMI installments if they don't exist (for backward compatibility)
            from app.models import EMIInstallment
            from app.services.emi_service import EMIService
            existing_installments = EMIInstallment.query.filter_by(account_id=account_id).count()
            if existing_installments == 0:
                logger.info(f'No EMI installments found for account {account_id}. Generating installments...')
                emi_generated = EMIService.generate_emi_installments(account_id)
                if emi_generated:
                    logger.info(f'Generated EMI installments for existing loan account {account_id}')
                else:
                    logger.warning(f'Failed to generate EMI installments for account {account_id}')
            
            # Get EMI schedule
            schedule = account.get_emi_schedule()
            
            # Debug logging
            logger.info(f'EMI Schedule for account {account_id}: principal={account.snapshot_loan_principal}, emi_amount={account.snapshot_emi_amount}, term_months={account.snapshot_loan_term_months}, start_date={account.start_date}, schedule_length={len(schedule)}')
            
            # Get loan summary
            outstanding_balance = abs(account.balance) if account.balance < 0 else 0
            paid_emis = account.get_paid_emis_count()
            next_payment_date = account.get_next_payment_date()
            
            # If schedule is empty, provide debug info
            if not schedule:
                logger.warning(f'Empty EMI schedule for account {account_id}. Principal: {account.snapshot_loan_principal}, EMI: {account.snapshot_emi_amount}, Term: {account.snapshot_loan_term_months}, Start Date: {account.start_date}')
            
            return {
                'success': True,
                'message': 'EMI schedule retrieved successfully',
                'data': {
                    'schedule': schedule,
                    'summary': {
                        'outstanding_balance': outstanding_balance,
                        'principal': account.snapshot_loan_principal,
                        'emi_amount': account.snapshot_emi_amount,
                        'total_emis': account.snapshot_loan_term_months,
                        'paid_emis': paid_emis,
                        'remaining_emis': account.snapshot_loan_term_months - paid_emis if account.snapshot_loan_term_months else 0,
                        'next_payment_date': next_payment_date.isoformat() if next_payment_date else None,
                        'interest_rate': account.get_effective_interest_rate(),
                        'repayment_frequency': account.snapshot_repayment_frequency
                    },
                    'debug': {
                        'has_principal': bool(account.snapshot_loan_principal),
                        'has_emi_amount': bool(account.snapshot_emi_amount),
                        'has_term_months': bool(account.snapshot_loan_term_months),
                        'has_start_date': bool(account.start_date),
                        'balance': account.balance
                    }
                }
            }, 200
            
        except Exception as e:
            logger.error(f'Error in get_emi_schedule controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get EMI schedule',
                'data': None
            }, 500
    
    @staticmethod
    def break_account(account_id):
        """Handle breaking FD/RD/DDS account and transferring balance to Savings"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Only admin and manager can break accounts
            if user_role not in ['admin', 'manager']:
                return {
                    'success': False,
                    'message': 'Only admin and managers can break accounts',
                    'data': None
                }, 403
            
            result = AccountService.break_fixed_deposit_account(
                account_id=account_id,
                created_by=current_user_id,
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in break_account controller: {e}')
            return {
                'success': False,
                'message': 'Failed to break account',
                'data': None
            }, 500