from app import db
from app.models import AccountType, User
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class AccountTypeService:
    @staticmethod
    def create_account_type(name, interest_rate, term_in_days, display_name, created_by, **kwargs):
        """Create a new account type with enhanced parameters"""
        try:
            # Check if account type with display_name already exists
            existing_type = AccountType.query.filter_by(display_name=display_name).first()
            if existing_type:
                return {
                    'success': False,
                    'message': 'Account type with this name already exists',
                    'data': None
                }
            
            # Validate interest rate
            if interest_rate < 0 or interest_rate > 100:
                return {
                    'success': False,
                    'message': 'Interest rate must be between 0 and 100',
                    'data': None
                }
            
            # Validate term for RD/FD/DDS accounts
            if name in ['RD', 'FD', 'DDS'] and (not term_in_days or term_in_days <= 0):
                return {
                    'success': False,
                    'message': f'{name} accounts require a valid term in days',
                    'data': None
                }
            
            # For Savings and Loan accounts, term should be null
            if name in ['Savings', 'Loan'] and term_in_days:
                return {
                    'success': False,
                    'message': f'{name} accounts should not have a term',
                    'data': None
                }
            
            # Create account type with enhanced parameters
            account_type = AccountType(
                name=name,
                display_name=display_name,
                interest_rate=interest_rate,
                term_in_days=term_in_days,
                created_by=created_by,
                min_deposit=kwargs.get('min_deposit', 0.0),
                max_deposit=kwargs.get('max_deposit'),
                min_withdrawal=kwargs.get('min_withdrawal', 0.0),
                max_withdrawal=kwargs.get('max_withdrawal'),
                withdrawal_limit_daily=kwargs.get('withdrawal_limit_daily'),
                withdrawal_limit_monthly=kwargs.get('withdrawal_limit_monthly'),
                deposit_limit_daily=kwargs.get('deposit_limit_daily'),
                deposit_limit_monthly=kwargs.get('deposit_limit_monthly'),
                atm_withdrawal_limit_daily=kwargs.get('atm_withdrawal_limit_daily'),
                minimum_balance=kwargs.get('minimum_balance', 0.0),
                low_balance_penalty=kwargs.get('low_balance_penalty', 0.0),
                interest_calculation_frequency=kwargs.get('interest_calculation_frequency'),
                interest_calculation_method=kwargs.get('interest_calculation_method', 'simple'),
                contribution_frequency=kwargs.get('contribution_frequency'),
                min_contribution_amount=kwargs.get('min_contribution_amount'),
                lock_in_period_days=kwargs.get('lock_in_period_days'),
                early_withdrawal_penalty_rate=kwargs.get('early_withdrawal_penalty_rate', 0.0),
                version=1
            )
            
            # Set loan parameters if provided
            if name == 'Loan' and kwargs.get('loan_parameters'):
                account_type.set_loan_parameters(kwargs['loan_parameters'])
            
            db.session.add(account_type)
            db.session.commit()
            
            logger.info(f'Account type created: {name} with interest rate {interest_rate}%')
            
            return {
                'success': True,
                'message': 'Account type created successfully',
                'data': account_type.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating account type: {e}')
            return {
                'success': False,
                'message': 'Failed to create account type',
                'data': None
            }
    
    @staticmethod
    def get_account_types():
        """Get all active account types"""
        try:
            account_types = AccountType.query.filter_by(is_active=True).all()
            
            return {
                'success': True,
                'message': 'Account types retrieved successfully',
                'data': [account_type.to_dict() for account_type in account_types]
            }
            
        except Exception as e:
            logger.error(f'Error getting account types: {e}')
            return {
                'success': False,
                'message': 'Failed to get account types',
                'data': None
            }
    
    @staticmethod
    def get_account_type(account_type_id):
        """Get a specific account type"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            return {
                'success': True,
                'message': 'Account type retrieved successfully',
                'data': account_type.to_dict()
            }
            
        except Exception as e:
            logger.error(f'Error getting account type: {e}')
            return {
                'success': False,
                'message': 'Failed to get account type',
                'data': None
            }
    
    @staticmethod
    def update_account_type(account_type_id, **kwargs):
        """Update an account type with enhanced parameters"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            # Update basic fields
            if 'name' in kwargs:
                # Check if name already exists (excluding current record)
                existing = AccountType.query.filter(
                    AccountType.name == kwargs['name'],
                    AccountType.id != account_type_id
                ).first()
                if existing:
                    return {
                        'success': False,
                        'message': 'Account type with this name already exists',
                        'data': None
                    }
                account_type.name = kwargs['name']
            
            if 'display_name' in kwargs:
                # Check if display_name already exists (excluding current record)
                existing = AccountType.query.filter(
                    AccountType.display_name == kwargs['display_name'],
                    AccountType.id != account_type_id
                ).first()
                if existing:
                    return {
                        'success': False,
                        'message': 'Account type with this display name already exists',
                        'data': None
                    }
                account_type.display_name = kwargs['display_name']
            
            if 'interest_rate' in kwargs:
                if kwargs['interest_rate'] < 0 or kwargs['interest_rate'] > 100:
                    return {
                        'success': False,
                        'message': 'Interest rate must be between 0 and 100',
                        'data': None
                    }
                account_type.interest_rate = kwargs['interest_rate']
            
            if 'term_in_days' in kwargs:
                # Validate term for RD/FD/DDS accounts
                if account_type.name in ['RD', 'FD', 'DDS'] and kwargs['term_in_days'] <= 0:
                    return {
                        'success': False,
                        'message': f'{account_type.name} accounts require a valid term in days',
                        'data': None
                    }
                
                # For Savings and Loan accounts, term should be null
                if account_type.name in ['Savings', 'Loan'] and kwargs['term_in_days']:
                    return {
                        'success': False,
                        'message': f'{account_type.name} accounts should not have a term',
                        'data': None
                    }
                
                account_type.term_in_days = kwargs['term_in_days']
            
            # Update enhanced parameters
            enhanced_fields = [
                'min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal',
                'withdrawal_limit_daily', 'withdrawal_limit_monthly',
                'deposit_limit_daily', 'deposit_limit_monthly',
                'atm_withdrawal_limit_daily', 'minimum_balance', 'low_balance_penalty',
                'interest_calculation_frequency', 'interest_calculation_method',
                'contribution_frequency', 'min_contribution_amount',
                'lock_in_period_days', 'early_withdrawal_penalty_rate'
            ]
            
            for field in enhanced_fields:
                if field in kwargs:
                    setattr(account_type, field, kwargs[field])
            
            # Update document_path (handle as JSON string or list)
            if 'document_path' in kwargs:
                if isinstance(kwargs['document_path'], str):
                    # Already a JSON string, store directly
                    account_type.document_path = kwargs['document_path']
                elif isinstance(kwargs['document_path'], (list, dict)):
                    # Convert list/dict to JSON string
                    account_type.set_document_history(kwargs['document_path'])
                else:
                    account_type.document_path = None
            
            # Update loan parameters
            if 'loan_parameters' in kwargs:
                account_type.set_loan_parameters(kwargs['loan_parameters'])
            
            # Increment version for tracking changes
            account_type.version += 1
            
            db.session.commit()
            
            logger.info(f'Account type updated: {account_type.name} (version {account_type.version})')
            
            return {
                'success': True,
                'message': 'Account type updated successfully',
                'data': account_type.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating account type: {e}')
            return {
                'success': False,
                'message': 'Failed to update account type',
                'data': None
            }
    
    @staticmethod
    def deactivate_account_type(account_type_id):
        """Deactivate an account type (soft delete)"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            account_type.is_active = False
            db.session.commit()
            
            logger.info(f'Account type deactivated: {account_type.name}')
            
            return {
                'success': True,
                'message': 'Account type deactivated successfully',
                'data': None
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error deactivating account type: {e}')
            return {
                'success': False,
                'message': 'Failed to deactivate account type',
                'data': None
            }
    
    
    @staticmethod
    def validate_transaction(account_type_id, transaction_type, amount):
        """Validate transaction based on account type rules"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            is_valid, message = account_type.validate_transaction(transaction_type, amount)
            
            return {
                'success': is_valid,
                'message': message,
                'data': {
                    'is_valid': is_valid,
                    'message': message,
                    'account_type': account_type.name
                }
            }
            
        except Exception as e:
            logger.error(f'Error validating transaction: {e}')
            return {
                'success': False,
                'message': 'Failed to validate transaction',
                'data': None
            }
    
    @staticmethod
    def calculate_maturity_amount(account_type_id, principal, start_date, end_date=None):
        """Calculate maturity amount for RD/FD/DDS accounts"""
        try:
            account_type = AccountType.query.get(account_type_id)
            
            if not account_type:
                return {
                    'success': False,
                    'message': 'Account type not found',
                    'data': None
                }
            
            if account_type.name not in ['RD', 'FD', 'DDS']:
                return {
                    'success': False,
                    'message': 'Maturity calculation only available for RD, FD, and DDS accounts',
                    'data': None
                }
            
            maturity_amount = account_type.calculate_maturity_amount(principal, start_date, end_date)
            
            return {
                'success': True,
                'message': 'Maturity amount calculated successfully',
                'data': {
                    'maturity_amount': maturity_amount,
                    'principal': principal,
                    'interest_earned': maturity_amount - principal,
                    'account_type': account_type.name
                }
            }
            
        except Exception as e:
            logger.error(f'Error calculating maturity amount: {e}')
            return {
                'success': False,
                'message': 'Failed to calculate maturity amount',
                'data': None
            }