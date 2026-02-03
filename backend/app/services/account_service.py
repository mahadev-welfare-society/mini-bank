from app import db
from app.models import Account, AccountType, Customer, User, AccountParameterUpdate, Transaction, RDInstallment
from datetime import datetime, timedelta
from sqlalchemy.orm import joinedload
import logging
import os
import threading
from app.services.premature_account_service import calculate_premature_closure
from app.services.premature_account_service import calculate_fd_maturity
from app.services.premature_account_service import calculate_fd_premature
from app.services.premature_account_service import calculate_dds_maturity
from app.services.premature_account_service import calculate_rd_maturity
from app.services.premature_account_service import calculate_rd_premature_closure



logger = logging.getLogger(__name__)

class AccountService:
    @staticmethod
    def is_leap_year(year):
      return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

    @staticmethod
    def create_account(customer_id, account_type_id, initial_balance, created_by, 
                       loan_term_months=None, custom_interest_rate=None, emi_due_day=None,
                       rd_contribution_amount=None, rd_contribution_day=None, rd_term_days=None,
                       fd_term_days=None):
        """Create a new account for a customer
        
        Args:
            customer_id: ID of the customer
            account_type_id: ID of the account type
            initial_balance: Initial balance (loan amount for loans, deposit for FD)
            created_by: ID of the user creating the account
            loan_term_months: Optional loan term in months (for loans)
            custom_interest_rate: Optional custom interest rate (overrides account type default)
            emi_due_day: Optional day of month when EMI is due (1-31, for loans)
            rd_contribution_amount: Optional RD monthly contribution amount
            rd_contribution_day: Optional day of month for RD contributions (1-31)
            rd_term_days: Optional RD term in days
            fd_term_days: Optional FD term in days
        """
        try:
            # Validate customer exists
            customer = Customer.query.get(customer_id)
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            # Validate account type exists and is active
            account_type = AccountType.query.get(account_type_id)
            if not account_type or not account_type.is_active:
                return {
                    'success': False,
                    'message': 'Account type not found or inactive',
                    'data': None
                }
            
            # Validate initial balance
            if initial_balance < 0:
                return {
                    'success': False,
                    'message': 'Initial balance cannot be negative',
                    'data': None
                }
            
            # Validate emi_due_day if provided (must be 1-31)
            if emi_due_day is not None:
                try:
                    emi_due_day = int(emi_due_day)
                    if emi_due_day < 1 or emi_due_day > 31:
                        return {
                            'success': False,
                            'message': 'EMI due day must be between 1 and 31',
                            'data': None
                        }
                except (ValueError, TypeError):
                    return {
                        'success': False,
                        'message': 'EMI due day must be a valid number between 1 and 31',
                        'data': None
                    }
            
            # Validate rd_contribution_day if provided (must be 1-31)
            if rd_contribution_day is not None:
                try:
                    rd_contribution_day = int(rd_contribution_day)
                    if rd_contribution_day < 1 or rd_contribution_day > 31:
                        return {
                            'success': False,
                            'message': 'RD contribution day must be between 1 and 31',
                            'data': None
                        }
                except (ValueError, TypeError):
                    return {
                        'success': False,
                        'message': 'RD contribution day must be a valid number between 1 and 31',
                        'data': None
                    }
            
            # Validate custom_interest_rate if provided
            if custom_interest_rate is not None:
                try:
                    custom_interest_rate = float(custom_interest_rate)
                    if custom_interest_rate < 0 or custom_interest_rate > 100:
                        return {
                            'success': False,
                            'message': 'Custom interest rate must be between 0 and 100',
                            'data': None
                        }
                except (ValueError, TypeError):
                    return {
                        'success': False,
                        'message': 'Custom interest rate must be a valid number',
                        'data': None
                    }
            
            # For RD accounts, start_date and maturity_date will be set on first deposit
            # For FD and DDS accounts, set start_date and maturity_date on creation
            maturity_date = None
            start_date = None
            term_days_to_use = None
            
            if account_type.name == 'RD':
                # RD: start_date will be set when first deposit is made
                start_date = datetime.now().date()  # Temporary, will be updated on first deposit if balance is 0
                # Use custom term if provided, otherwise use account type default
                term_days_to_use = rd_term_days if rd_term_days else account_type.term_in_days
                if term_days_to_use and initial_balance > 0:
                    # If initial deposit is made, calculate maturity date
                    maturity_date = start_date + timedelta(days=term_days_to_use)
                else:
                    maturity_date = None  # Will be calculated on first deposit
            elif account_type.name in ['FD', 'DDS']:
                # FD/DDS: set start_date and maturity_date immediately
                start_date = datetime.now().date()
                # Use custom term if provided, otherwise use account type default
                term_days_to_use = fd_term_days if fd_term_days else account_type.term_in_days
                if term_days_to_use:
                    maturity_date = start_date + timedelta(days=term_days_to_use)
                else:
                    # Default to 365 days if no term specified
                    maturity_date = start_date + timedelta(days=365)
                    term_days_to_use = 365
            else:
                # Savings and Loan: just set start_date
                start_date = datetime.now().date()
            
            # Find an admin user for created_by (to satisfy foreign key constraint)
            # This is needed because customers (staff) are in customers table, not users table
            admin_user = User.query.filter_by(role='admin').first()
            if not admin_user:
                # Fallback: try to use provided created_by if it's a valid user
                user = User.query.get(created_by)
                if not user:
                    return {
                        'success': False,
                        'message': 'No valid admin user found for account creation',
                        'data': None
                    }
                created_by_user_id = created_by
            else:
                created_by_user_id = admin_user.id
            
            # Create account with snapshot of current account type parameters
            account = Account(
                customer_id=customer_id,
                account_type_id=account_type_id,
                account_type=account_type,
                balance=initial_balance,
                start_date=start_date,
                maturity_date=maturity_date,
                status='active',
                created_by=created_by_user_id,
                # Snapshot all account type parameters
                snapshot_interest_rate=account_type.interest_rate,
                snapshot_min_deposit=account_type.min_deposit,
                snapshot_max_deposit=account_type.max_deposit,
                snapshot_min_withdrawal=account_type.min_withdrawal,
                snapshot_max_withdrawal=account_type.max_withdrawal,
                snapshot_withdrawal_limit_daily=account_type.withdrawal_limit_daily,
                snapshot_withdrawal_limit_monthly=account_type.withdrawal_limit_monthly,
                snapshot_deposit_limit_daily=account_type.deposit_limit_daily,
                snapshot_deposit_limit_monthly=account_type.deposit_limit_monthly,
                snapshot_atm_withdrawal_limit_daily=account_type.atm_withdrawal_limit_daily,
                snapshot_minimum_balance=account_type.minimum_balance,
                snapshot_low_balance_penalty=account_type.low_balance_penalty,
                snapshot_interest_calculation_method=account_type.interest_calculation_method,
                snapshot_interest_calculation_frequency=account_type.interest_calculation_frequency,
                snapshot_early_withdrawal_penalty_rate=account_type.early_withdrawal_penalty_rate,
                snapshot_lock_in_period_days=account_type.lock_in_period_days,
                snapshot_contribution_frequency=account_type.contribution_frequency,
                snapshot_min_contribution_amount=account_type.min_contribution_amount,
                daily_contribution=float(initial_balance) if account_type.name=='DDS' else None,
                use_custom_parameters=False
            )
            
            # Handle custom interest rate for all account types
            interest_rate_to_use = account_type.interest_rate
            if custom_interest_rate is not None:
                account.custom_interest_rate = custom_interest_rate
                account.use_custom_parameters = True
                interest_rate_to_use = custom_interest_rate
                account.snapshot_interest_rate = custom_interest_rate
                logger.info(f'Using custom interest rate: {custom_interest_rate}% for {account_type.name} account')
            
            # Handle RD-specific parameters
            if account_type.name == 'RD':
                # Set contribution amount if provided
                if rd_contribution_amount is not None:
                    try:
                        rd_contribution_amount = float(rd_contribution_amount)
                        if rd_contribution_amount < 0:
                            return {
                                'success': False,
                                'message': 'RD contribution amount cannot be negative',
                                'data': None
                            }
                        account.snapshot_min_contribution_amount = rd_contribution_amount
                    except (ValueError, TypeError):
                        return {
                            'success': False,
                            'message': 'RD contribution amount must be a valid number',
                            'data': None
                        }
                
                # Set contribution day if provided
                if rd_contribution_day is not None:
                    account.rd_contribution_day = int(rd_contribution_day)
                elif start_date:
                    # Default to the day of start_date if not specified
                    account.rd_contribution_day = start_date.day
                
                # Set term if provided
                if rd_term_days is not None:
                    try:
                        rd_term_days = int(rd_term_days)
                        if rd_term_days <= 0:
                            return {
                                'success': False,
                                'message': 'RD term must be greater than 0',
                                'data': None
                            }
                        account.snapshot_lock_in_period_days = rd_term_days
                    except (ValueError, TypeError):
                        return {
                            'success': False,
                            'message': 'RD term must be a valid number',
                            'data': None
                        }
                elif term_days_to_use:
                    account.snapshot_lock_in_period_days = term_days_to_use
            
            # Handle FD-specific parameters
            elif account_type.name == 'FD':
                # FD accounts require an initial deposit
                if initial_balance <= 0:
                    return {
                        'success': False,
                        'message': 'FD account requires an initial deposit greater than 0',
                        'data': None
                    }
                
                # Validate minimum deposit if set
                min_deposit = account_type.min_deposit if account_type.min_deposit else 0
                if initial_balance < min_deposit:
                    return {
                        'success': False,
                        'message': f'FD account requires minimum deposit of ₹{min_deposit}',
                        'data': None
                    }
                
                # Set term if provided
                if fd_term_days is not None:
                    try:
                        fd_term_days = int(fd_term_days)
                        if fd_term_days <= 0:
                            return {
                                'success': False,
                                'message': 'FD term must be greater than 0',
                                'data': None
                            }
                        account.snapshot_lock_in_period_days = fd_term_days
                        # Update maturity_date if term was customized
                        if start_date:
                            account.maturity_date = start_date + timedelta(days=fd_term_days)
                    except (ValueError, TypeError):
                        return {
                            'success': False,
                            'message': 'FD term must be a valid number',
                            'data': None
                        }
                elif term_days_to_use:
                    account.snapshot_lock_in_period_days = term_days_to_use
            
            # Handle DDS-specific parameters (similar to FD)
            elif account_type.name == 'DDS':
                # DDS accounts require an initial deposit
                if initial_balance <= 0:
                    return {
                        'success': False,
                        'message': 'DDS account requires an initial deposit greater than 0',
                        'data': None
                    }
                
                # Validate minimum deposit if set
                min_deposit = account_type.min_deposit if account_type.min_deposit else 0
                if initial_balance < min_deposit:
                    return {
                        'success': False,
                        'message': f'DDS account requires minimum deposit of ₹{min_deposit}',
                        'data': None
                    }
                
                # Set term if provided
                if fd_term_days is not None:
                    try:
                        fd_term_days = int(fd_term_days)
                        if fd_term_days <= 0:
                            return {
                                'success': False,
                                'message': 'DDS term must be greater than 0',
                                'data': None
                            }
                        account.snapshot_lock_in_period_days = fd_term_days
                        # Update maturity_date if term was customized
                        if start_date:
                            account.maturity_date = start_date + timedelta(days=fd_term_days)
                    except (ValueError, TypeError):
                        return {
                            'success': False,
                            'message': 'DDS term must be a valid number',
                            'data': None
                        }
                elif term_days_to_use:
                    account.snapshot_lock_in_period_days = term_days_to_use
            
            # Snapshot loan parameters if account type is Loan
            if account_type.name == 'Loan':
                loan_params = account_type.get_loan_parameters()
                # For loan accounts, balance is negative (outstanding amount)
                # Principal is the absolute value of initial_balance (or initial_balance if positive)
                loan_principal = abs(initial_balance) if initial_balance < 0 else initial_balance
                account.snapshot_loan_principal = loan_principal
                account.snapshot_repayment_frequency = loan_params.get('repayment_frequency', 'monthly')
                account.snapshot_loan_penalty_rate = loan_params.get('penalty_rate', 5.0)
                
                # Set EMI due day if provided
                if emi_due_day is not None:
                    account.emi_due_day = int(emi_due_day)
                elif account.start_date:
                    # Default to the day of start_date if not specified
                    account.emi_due_day = account.start_date.day
                
                # Calculate loan term in months (if term_in_days is set, convert to months)
                if loan_term_months:
                    try:
                        account.snapshot_loan_term_months = max(1, int(round(float(loan_term_months))))
                    except (TypeError, ValueError):
                        logger.warning(f'Invalid loan_term_months="{loan_term_months}" provided. Falling back to defaults.')
                        account.snapshot_loan_term_months = None
                if not account.snapshot_loan_term_months:
                    if account_type.term_in_days:
                        account.snapshot_loan_term_months = max(1, int(round(account_type.term_in_days / 30.44)))
                    else:
                        # Default to 12 months if not specified
                        account.snapshot_loan_term_months = 12
                
                # Calculate EMI amount using the interest rate (custom or default)
                if loan_principal and loan_principal > 0:
                    account.snapshot_emi_amount = account.calculate_emi(
                        principal=loan_principal,
                        interest_rate=interest_rate_to_use,
                        term_months=account.snapshot_loan_term_months
                    )
                    # Set initial balance to negative (outstanding amount)
                    account.balance = -loan_principal
            
            db.session.add(account)
            db.session.commit()

            # Create first RD installment if initial deposit is provided
            if account_type.name == 'RD' and initial_balance > 0:
                try:
                    rd_installment = RDInstallment(
                        account_id=account.id,
                        amount=initial_balance,
                        deposit_date=account.start_date or datetime.now().date()
                    )

                    db.session.add(rd_installment)
                    db.session.commit()

                    logger.info(
                        f'RD installment created: Account {account.id}, '
                        f'Amount ₹{initial_balance}, Date {rd_installment.deposit_date}'
                    )

                except Exception as rd_error:
                    db.session.rollback()
                    logger.error(
                        f'Failed to create RD installment for account {account.id}: {rd_error}'
                    )

            
            logger.info(f'Account created with snapshot: {account_type.name} for customer {customer.name} (Interest Rate: {account_type.interest_rate}%)')
            
            # Generate EMI installments for loan accounts
            if account_type.name == 'Loan' and account.snapshot_loan_principal and account.snapshot_loan_principal > 0:
                from app.services.emi_service import EMIService
                emi_generated = EMIService.generate_emi_installments(account.id)
                if emi_generated:
                    logger.info(f'EMI installments generated successfully for loan account {account.id}')
                else:
                    logger.warning(f'Failed to generate EMI installments for loan account {account.id}')
            
            # Create initial transaction if initial balance > 0
            transaction_amount = 0
            transaction_type = None
            balance_before = 0.0
            balance_after = account.balance
            
            if account_type.name == 'Loan' and abs(account.balance) > 0:
                # Loan disbursal transaction
                transaction_type = 'loan_disbursal'
                transaction_amount = abs(account.balance)  # Loan amount (positive)
                balance_before = 0.0
                balance_after = account.balance  # Negative for loans
            elif account_type.name in ['Savings', 'RD', 'FD', 'DDS'] and initial_balance > 0:
                # Deposit transaction for savings, RD, FD, DDS
                transaction_type = 'deposit'
                transaction_amount = initial_balance
                balance_before = 0.0
                balance_after = account.balance  # Positive for deposits
            
            # Create transaction record if amount > 0
            if transaction_type and transaction_amount > 0:
                try:
                    # Determine creator type (user or customer)
                    creator_user = User.query.get(created_by)
                    creator_type = 'user' if creator_user else 'customer'
                    
                    # Generate reference number
                    reference_number = Transaction.generate_reference_number()
                    
                    # Create transaction
                    transaction = Transaction(
                        account_id=account.id,
                        transaction_type=transaction_type,
                        amount=transaction_amount,
                        balance_before=balance_before,
                        balance_after=balance_after,
                        description=f'Initial {transaction_type.replace("_", " ").title()} - Account opened with ₹{transaction_amount:,.2f}',
                        reference_number=reference_number,
                        status='completed',
                        created_by=created_by,
                        creator_type=creator_type
                    )
                    
                    db.session.add(transaction)
                    db.session.commit()
                    
                    logger.info(f'Initial transaction created: {transaction_type} of ₹{transaction_amount:,.2f} for account {account.id}')
                except Exception as trans_error:
                    # Don't fail account creation if transaction creation fails
                    # Account is already committed, so we just log the error
                    logger.error(f'Error creating initial transaction for account {account.id}: {trans_error}')
                    # Rollback only the transaction creation attempt
                    db.session.rollback()
            
            # Send account creation email notification (non-blocking background thread)
            # Import Flask app to create application context in thread
            from flask import current_app
            
            # Capture the app instance before starting the thread
            app = current_app._get_current_object()
            
            def send_account_email_async():
                # Push Flask application context for the thread
                with app.app_context():
                    try:
                        from app.services.email_service import EmailService
                        from datetime import date
                        
                        # Prepare account details for email
                        account_details = {
                            'balance': account.balance if account.balance >= 0 else abs(account.balance),
                            'interest_rate': interest_rate_to_use
                        }
                        
                        # Add account-specific details
                        if account_type.name == 'Loan':
                            if account.snapshot_emi_amount:
                                account_details['emi_amount'] = account.snapshot_emi_amount
                            if account.snapshot_loan_term_months:
                                account_details['term_months'] = account.snapshot_loan_term_months
                            if account.emi_due_day:
                                account_details['emi_due_day'] = account.emi_due_day
                        
                        elif account_type.name == 'RD':
                            if account.snapshot_min_contribution_amount:
                                account_details['contribution_amount'] = account.snapshot_min_contribution_amount
                            if account.rd_contribution_day:
                                account_details['contribution_day'] = account.rd_contribution_day
                            if account.snapshot_lock_in_period_days:
                                account_details['term_days'] = account.snapshot_lock_in_period_days
                        
                        elif account_type.name == 'FD':
                            if account.snapshot_lock_in_period_days:
                                account_details['term_days'] = account.snapshot_lock_in_period_days
                            if account.maturity_date:
                                if isinstance(account.maturity_date, date):
                                    account_details['maturity_date'] = account.maturity_date.strftime('%Y-%m-%d')
                                else:
                                    account_details['maturity_date'] = str(account.maturity_date)
                        
                        elif account_type.name == 'DDS':
                            if account.snapshot_lock_in_period_days:
                                account_details['term_days'] = account.snapshot_lock_in_period_days
                            if account.maturity_date:
                                if isinstance(account.maturity_date, date):
                                    account_details['maturity_date'] = account.maturity_date.strftime('%Y-%m-%d')
                                else:
                                    account_details['maturity_date'] = str(account.maturity_date)
                        
                        frontend_url = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app')
                        login_url = f"{frontend_url}/login"
                        
                        EmailService.send_account_creation_email(
                            customer_email=customer.email,
                            customer_name=customer.name,
                            account_type=account_type.name,
                            account_id=account.id,
                            account_details=account_details,
                            login_url=login_url
                        )
                        logger.info(f'Account creation email sent to {customer.email} for account {account.id}')
                    except Exception as email_error:
                        # Don't fail account creation if email fails
                        logger.error(f'Error sending account creation email to {customer.email}: {email_error}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_account_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Account creation email sending started in background thread for account {account.id}')
            
            return {
                'success': True,
                'message': 'Account created successfully',
                'data': account.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating account: {e}')
            return {
                'success': False,
                'message': 'Failed to create account',
                'data': None
            }
    
    @staticmethod
    def activate_loan_account(account_id, loan_amount, created_by, loan_term_months=None):
        """Activate an existing loan account by setting loan parameters and balance"""
        try:
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            if account.account_type.name != 'Loan':
                return {
                    'success': False,
                    'message': 'Account is not a loan account',
                    'data': None
                }
            
            if account.balance != 0:
                return {
                    'success': False,
                    'message': 'Loan account already has an outstanding balance. Cannot activate again.',
                    'data': None
                }
            
            account_type = account.account_type
            loan_params = account_type.get_loan_parameters()
            
            # Set loan principal
            account.snapshot_loan_principal = loan_amount
            account.snapshot_repayment_frequency = loan_params.get('repayment_frequency', 'monthly')
            account.snapshot_loan_penalty_rate = loan_params.get('penalty_rate', 5.0)
            
            # Set loan term (use provided term or default from account type)
            if loan_term_months:
                account.snapshot_loan_term_months = max(1, int(round(float(loan_term_months))))
            elif account_type.term_in_days:
                account.snapshot_loan_term_months = max(1, int(round(account_type.term_in_days / 30.44)))
            else:
                account.snapshot_loan_term_months = 12
            
            # Calculate EMI amount
            account.snapshot_emi_amount = account.calculate_emi(
                principal=loan_amount,
                interest_rate=account_type.interest_rate,
                term_months=account.snapshot_loan_term_months
            )
            
            # Set balance to negative (outstanding amount)
            account.balance = -loan_amount
            
            # Update start_date to today (loan activation date)
            account.start_date = datetime.now().date()
            
            # Find an admin user for created_by (to satisfy foreign key constraint)
            admin_user = User.query.filter_by(role='admin').first()
            if admin_user:
                account.created_by = admin_user.id
            else:
                logger.warning(f'No admin user found for loan activation. Using provided created_by: {created_by}')
                # Try to use provided created_by if it's a valid user
                user = User.query.get(created_by)
                if user:
                    account.created_by = created_by
                else:
                    return {
                        'success': False,
                        'message': 'No valid admin user found for account creation',
                        'data': None
                    }, 400
            
            db.session.commit()
            
            logger.info(f'Loan account {account_id} activated with principal: {loan_amount}, EMI: {account.snapshot_emi_amount}')
            
            # Generate EMI installments for activated loan account
            from app.services.emi_service import EMIService
            emi_generated = EMIService.generate_emi_installments(account_id)
            if emi_generated:
                logger.info(f'EMI installments generated successfully for activated loan account {account_id}')
            else:
                logger.warning(f'Failed to generate EMI installments for activated loan account {account_id}')
            
            return {
                'success': True,
                'message': 'Loan account activated successfully',
                'data': account.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error activating loan account: {e}')
            return {
                'success': False,
                'message': 'Failed to activate loan account',
                'data': None
            }
    
    @staticmethod
    def get_accounts(user_role, user_id=None, page=1, limit=10, search='', account_type_filter='', status_filter=''):
        """Get accounts with pagination and filters based on user role"""
        try:
            if user_role == 'admin':
                # Admin can see all accounts
                query = Account.query
            elif user_role == 'manager':
                # Manager can see all accounts
                query = Account.query
            else:  # staff - can only see their own accounts
                query = Account.query.filter(Account.customer_id == user_id)
            
            # Apply search filter
            if search:
                search_term = f"%{search}%"
                query = query.join(Customer).filter(
                    db.or_(
                        Customer.name.ilike(search_term),
                        Customer.email.ilike(search_term)
                    )
                )
            
            # Apply account type filter
            if account_type_filter:
                query = query.join(AccountType).filter(AccountType.name == account_type_filter)
            
            # Apply status filter
            if status_filter:
                query = query.filter(Account.status == status_filter)
            
            # Sort by creation date (oldest first)
            query = query.order_by(Account.created_at.asc())
            
            # Get total count for pagination
            total_count = query.count()
            
            # Calculate pagination
            offset = (page - 1) * limit
            accounts = query.offset(offset).limit(limit).all()
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                'success': True,
                'message': 'Accounts retrieved successfully',
                'data': [account.to_dict() for account in accounts],
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_count': total_count,
                    'limit': limit,
                    'has_next': has_next,
                    'has_prev': has_prev
                }
            }
            
        except Exception as e:
            logger.error(f'Error getting accounts: {e}')
            return {
                'success': False,
                'message': 'Failed to get accounts',
                'data': None
            }
    
    @staticmethod
    def get_account(account_id, user_role, user_id=None):
        """Get a specific account with role-based access, including account_type display_name"""
        try:
            from sqlalchemy.orm import joinedload

            # Eager load account_type to get display_name
            account = Account.query.options(joinedload(Account.account_type)).filter_by(id=account_id).first()

            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }

            # Check access permissions
            if user_role == 'staff' and account.customer_id != user_id:
                return {
                    'success': False,
                    'message': 'Access denied',
                    'data': None
                }

            # Convert to dict
            account_dict = account.to_dict()

            # Include display_name if account_type exists
            if account.account_type:
                account_dict['account_type_display_name'] = account.account_type.display_name
                account_dict['account_type_name'] = account.account_type.name
            else:
                account_dict['account_type_display_name'] = None
                account_dict['account_type_name'] = None

            return {
                'success': True,
                'message': 'Account retrieved successfully',
                'data': account_dict
            }

        except Exception as e:
            logger.error(f'Error getting account: {e}')
            return {
                'success': False,
                'message': 'Failed to get account',
                'data': None
            }
        
    @staticmethod
    def update_account_status(account_id, status, user_role, user_id=None):
        """Update account status (close account)"""
        try:
            account = Account.query.get(account_id)
            
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Check access permissions
            if user_role == 'staff' and account.customer_id != user_id:
                return {
                    'success': False,
                    'message': 'Access denied',
                    'data': None
                }
            
            # Validate status
            if status not in ['active', 'closed']:
                return {
                    'success': False,
                    'message': 'Invalid status. Must be active or closed',
                    'data': None
                }
            
            account.status = status
            db.session.commit()
            
            logger.info(f'Account {account_id} status updated to {status}')
            
            return {
                'success': True,
                'message': 'Account status updated successfully',
                'data': account.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating account status: {e}')
            return {
                'success': False,
                'message': 'Failed to update account status',
                'data': None
            }
    
    @staticmethod
    def get_customer_accounts(customer_id, user_role, user_id=None):
        """Get all accounts for a specific customer"""
        try:
            from app.models import Customer, UserPermission
            
            # Check if user can access this customer's accounts
            if user_role == 'staff':
                if customer_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied',
                        'data': None
                    }
            elif user_role == 'manager':
                # Check if manager has permission to view customers
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='customers_management',
                    can_view=True
                ).first()
                
                if not permission:
                    return {
                        'success': False,
                        'message': 'Access denied - No permission',
                        'data': None
                    }
                
                # Manager can only access accounts of customers assigned to them
                customer = Customer.query.get(customer_id)
                if not customer or customer.assigned_manager_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied - Customer not assigned to you',
                        'data': None
                    }
            # Admin can access any customer's accounts (no check needed)
            # Eager load account_type to avoid N+1 queries
            accounts = Account.query.options(joinedload(Account.account_type)).filter_by(customer_id=customer_id).order_by(Account.created_at.asc()).all()

            account_list = []
            for acc in accounts:
                acc_dict = acc.to_dict()
                if acc.account_type:
                    acc_dict['account_type'] = {
                        'name': acc.account_type.name.lower(),       # lowercase for internal use
                        'display_name': acc.account_type.display_name  # UI-friendly name
                    }
                else:
                    acc_dict['account_type'] = {
                        'name': 'unknown',
                        'display_name': 'Unknown'
                    }
                account_list.append(acc_dict)

            return {
                'success': True,
                'message': 'Customer accounts retrieved successfully',
                'data': account_list
            }
            
        except Exception as e:
            logger.error(f'Error getting customer accounts: {e}')
            return {
                'success': False,
                'message': 'Failed to get customer accounts',
                'data': None
            }
    
    @staticmethod
    def update_account_interest_rate(account_id, new_rate, updated_by, reason=None):
        """Update interest rate for a specific account"""
        try:
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Get current value
            old_value = account.get_effective_interest_rate()
            
            # Log the change
            update_log = AccountParameterUpdate(
                account_id=account_id,
                updated_by=updated_by,
                parameter_name='interest_rate',
                old_value=str(old_value),
                new_value=str(new_rate),
                reason=reason or 'Interest rate update'
            )
            
            # Update account
            if not account.use_custom_parameters:
                account.use_custom_parameters = True
            
            account.custom_interest_rate = new_rate
            db.session.add(update_log)
            db.session.commit()
            
            logger.info(f'Updated interest rate for account {account_id}: {old_value}% -> {new_rate}%')
            
            return {
                'success': True,
                'message': 'Interest rate updated successfully',
                'data': account.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating account interest rate: {e}')
            return {
                'success': False,
                'message': 'Failed to update interest rate',
                'data': None
            }
    
    @staticmethod
    def bulk_update_account_type_interest_rate(account_type_id, new_rate, updated_by, reason=None):
        """Bulk update interest rate for all active accounts of a specific type"""
        try:
            accounts = Account.query.filter_by(
                account_type_id=account_type_id,
                status='active'
            ).all()
            
            if not accounts:
                return {
                    'success': False,
                    'message': 'No active accounts found for this account type',
                    'data': None
                }
            
            updated_count = 0
            for account in accounts:
                # Get current value
                old_value = account.get_effective_interest_rate()
                
                # Skip if already has this value
                if old_value == new_rate:
                    continue
                
                # Log the change
                update_log = AccountParameterUpdate(
                    account_id=account.id,
                    updated_by=updated_by,
                    parameter_name='interest_rate',
                    old_value=str(old_value),
                    new_value=str(new_rate),
                    reason=reason or f'Bulk update for {account.account_type.name if account.account_type else "account type"}'
                )
                
                # Update account
                if not account.use_custom_parameters:
                    account.use_custom_parameters = True
                
                account.custom_interest_rate = new_rate
                db.session.add(update_log)
                updated_count += 1
            
            db.session.commit()
            
            logger.info(f'Bulk updated interest rate for {updated_count} accounts: {account_type_id} -> {new_rate}%')
            
            return {
                'success': True,
                'message': f'Interest rate updated for {updated_count} accounts',
                'data': {
                    'updated_count': updated_count,
                    'total_accounts': len(accounts)
                }
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error bulk updating account interest rate: {e}')
            return {
                'success': False,
                'message': 'Failed to bulk update interest rate',
                'data': None
            }
    
    @staticmethod
    def break_fixed_deposit_account(account_id, created_by, user_role, user_id=None):
        """Break FD/RD/DDS account and transfer balance to Savings account"""
        try:
            # Get the account to break
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            # Validate account type (only FD, RD, or DDS can be broken)
            account_type_name = account.account_type.name if account.account_type else None
            if account_type_name not in ['FD', 'RD', 'DDS']:
                return {
                    'success': False,
                    'message': f'Only FD, RD, or DDS accounts can be broken. This account is {account_type_name}',
                    'data': None
                }
            
            # Validate account is active
            if account.status != 'active':
                return {
                    'success': False,
                    'message': 'Account is not active. Only active accounts can be broken.',
                    'data': None
                }
            
            # Check permissions
            if user_role == 'admin':
                # Admin can break any account
                pass
            elif user_role == 'manager':
                # Manager can only break accounts of customers assigned to them
                customer = Customer.query.get(account.customer_id)
                if not customer or customer.assigned_manager_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied - Customer not assigned to you',
                        'data': None
                    }
            else:
                return {
                    'success': False,
                    'message': 'Only admin and managers can break accounts',
                    'data': None
                }
            
            # Get customer's Savings account (find or create if doesn't exist)
            savings_account_type = AccountType.query.filter_by(name='Savings').first()
            if not savings_account_type:
                return {
                    'success': False,
                    'message': 'Savings account type not found. Cannot transfer balance.',
                    'data': None
                }
            
            # Find existing Savings account for this customer
            savings_account = Account.query.filter_by(
                customer_id=account.customer_id,
                account_type_id=savings_account_type.id,
                status='active'
            ).first()
            
            # If no Savings account exists, create one
            if not savings_account:
                savings_account = Account(
                    customer_id=account.customer_id,
                    account_type_id=savings_account_type.id,
                    balance=0.0,
                    start_date=datetime.now().date(),
                    maturity_date=None,
                    status='active',
                    created_by=created_by,
                    # Snapshot all account type parameters
                    snapshot_interest_rate=savings_account_type.interest_rate,
                    snapshot_min_deposit=savings_account_type.min_deposit,
                    snapshot_max_deposit=savings_account_type.max_deposit,
                    snapshot_min_withdrawal=savings_account_type.min_withdrawal,
                    snapshot_max_withdrawal=savings_account_type.max_withdrawal,
                    snapshot_withdrawal_limit_daily=savings_account_type.withdrawal_limit_daily,
                    snapshot_withdrawal_limit_monthly=savings_account_type.withdrawal_limit_monthly,
                    snapshot_deposit_limit_daily=savings_account_type.deposit_limit_daily,
                    snapshot_deposit_limit_monthly=savings_account_type.deposit_limit_monthly,
                    snapshot_atm_withdrawal_limit_daily=savings_account_type.atm_withdrawal_limit_daily,
                    snapshot_minimum_balance=savings_account_type.minimum_balance,
                    snapshot_low_balance_penalty=savings_account_type.low_balance_penalty,
                    snapshot_interest_calculation_method=savings_account_type.interest_calculation_method,
                    snapshot_interest_calculation_frequency=savings_account_type.interest_calculation_frequency,
                    snapshot_early_withdrawal_penalty_rate=savings_account_type.early_withdrawal_penalty_rate,
                    snapshot_lock_in_period_days=savings_account_type.lock_in_period_days,
                    snapshot_contribution_frequency=savings_account_type.contribution_frequency,
                    snapshot_min_contribution_amount=savings_account_type.min_contribution_amount,
                    use_custom_parameters=False
                )
                db.session.add(savings_account)
                db.session.flush()  # Flush to get the savings account ID
                logger.info(f'Created Savings account {savings_account.id} for customer {account.customer_id} during account break')
            
            # Calculate amount to transfer (current balance + interest if applicable)
            current_balance = account.balance
            transfer_amount = current_balance
            maturity_amount= 0
            penalty_amount = 0.0

            # Calculate maturity amount if account has reached maturity
            if account.maturity_date and account.maturity_date <= datetime.now().date():
                if account_type_name == "DDS":
                    maturity_data = calculate_dds_maturity(account)
                    maturity_amount = maturity_data['transfer_amount']
                elif account_type_name == "FD":
                    maturity_data = calculate_fd_maturity(account)
                    maturity_amount = maturity_data['transfer_amount']
                elif account_type_name == "RD":
                    maturity_data = calculate_rd_maturity(account)
                    maturity_amount = maturity_data['transfer_amount']
                    print(maturity_data,'maturityData')
                else:
                    maturity_amount = account.calculate_maturity_amount()
                # Account has reached maturity, calculate maturity amount with interest
                # maturity_amount = account.calculate_maturity_amount()
                transfer_amount = maturity_amount
                logger.info(f'Account {account_id} has reached maturity. Current balance: {current_balance}, Maturity amount: {transfer_amount}')
            else:
                # Account is being broken before maturity
                if account_type_name == "DDS":
                    closure_data = calculate_premature_closure(account)
                    transfer_amount = closure_data['transfer_amount']
                    interest_earned = closure_data['interest_earned']
                    penalty_amount = closure_data['penalty_amount']

                    print(f"Account {account.id} - Interest Earned: {interest_earned}, Penalty: {penalty_amount}, Transfer: {transfer_amount}")
                elif account_type_name == "FD":
                    closure_data = calculate_fd_premature(account)
                    transfer_amount = closure_data['transfer_amount']
                    interest_earned = closure_data.get('interest_till_closure', 0)
                    penalty_amount = closure_data['penalty_amount']

                elif account_type_name == "RD":
                    closure_data = calculate_rd_premature_closure(account)
                    transfer_amount = closure_data['transfer_amount']
                    penalty_amount = closure_data['penalty_amount']
                    print("inside RD condition")
                # Apply early withdrawal penalty if applicable

                else:
                    raise ValueError(f"Unsupported account type for premature closure: {account_type_name}")

                # elif account.snapshot_early_withdrawal_penalty_rate and account.snapshot_early_withdrawal_penalty_rate > 0:
                #     penalty_amount = current_balance * (account.snapshot_early_withdrawal_penalty_rate / 100)
                #     transfer_amount = current_balance - penalty_amount
                #     logger.info(f'Applied early withdrawal penalty: {penalty_amount}. Transfer amount: {transfer_amount}')
            
            # 🔥 BLOCK ONLY SAVINGS ACCOUNTS
            if account_type_name == "SAVINGS" and transfer_amount <= 0:
              return {
              'success': False,
                'message': 'Savings account has no balance to transfer',
             'data': None
            }

            # ✅ DDS & other accounts → allow closure even if zero/negative
            if transfer_amount <= 0:   
               transfer_amount = 0.0

            # Manually update balances and create transaction records
            from app.models import Transaction
            
            # Store balances before transfer
            fd_balance_before = account.balance
            savings_balance_before = savings_account.balance
            
            # Update balances manually
            account.balance = 0.0
            account.status = 'closed'
            account.updated_at = datetime.utcnow()
            
            savings_account.balance = savings_balance_before + transfer_amount
            savings_account.updated_at = datetime.utcnow()
            
            if account_type_name == "DDS":
                description = (
                    f'Premature DDS break - '
                    f'penalty: ₹{penalty_amount:.2f}, '
                    f'net credited: ₹{transfer_amount:.2f}'
            )
            elif account_type_name == "RD":
                description = (
                    f'Premature RD break - '
                    f'penalty: ₹{penalty_amount:.2f}, '
                    f'net credited: ₹{transfer_amount:.2f}'
            )
            else:
                description = (
                    f'Account break - {account_type_name} account broken '
                    f'and balance transferred to Savings'
            )

            # Create transaction records for audit trail
            # Transaction 1: Withdrawal from FD/RD/DDS account
            withdrawal_transaction = Transaction(
                account_id=account_id,
                transaction_type='withdrawal',
                amount=current_balance,
                balance_before=fd_balance_before,
                balance_after=0.0,
                description=description,
                reference_number=Transaction.generate_reference_number(),
                status='completed',
                created_by=created_by,
                creator_type='user'
            )
            db.session.add(withdrawal_transaction)
            
            # Transaction 2: Deposit to Savings account
            deposit_transaction = Transaction(
                account_id=savings_account.id,
                transaction_type='deposit',
                amount=transfer_amount,
                balance_before=savings_balance_before,
                balance_after=savings_balance_before + transfer_amount,
                description=f'Balance transfer from broken {account_type_name} account (ID: {account_id})',
                reference_number=Transaction.generate_reference_number(),
                status='completed',
                created_by=created_by,
                creator_type='user'
            )
            db.session.add(deposit_transaction)
            
            db.session.commit()
            
            # Store values needed for email before starting thread (to avoid session issues)
            customer_email = account.customer.email if account.customer and account.customer.email else None
            customer_name = account.customer.name if account.customer else None
            broken_account_number = f"ACC{account.id:06d}"
            savings_account_number = f"ACC{savings_account.id:06d}"
            withdrawal_ref = withdrawal_transaction.reference_number
            deposit_ref = deposit_transaction.reference_number
            withdrawal_date = withdrawal_transaction.created_at.strftime('%B %d, %Y at %I:%M %p') if withdrawal_transaction.created_at else None
            deposit_date = deposit_transaction.created_at.strftime('%B %d, %Y at %I:%M %p') if deposit_transaction.created_at else None
            final_savings_balance = savings_balance_before + transfer_amount
            
            # Send email notifications for both transactions (non-blocking background thread)
            def send_break_account_emails_async():
                try:
                    if customer_email and customer_name:
                        from app.services.email_service import EmailService
                        
                        # Email 1: Withdrawal from broken account
                        EmailService.send_transaction_notification_email(
                            customer_email=customer_email,
                            customer_name=customer_name,
                            transaction_type='withdrawal',
                            amount=current_balance,  # Original balance before penalty
                            account_type=account_type_name,
                            account_number=broken_account_number,
                            balance_before=fd_balance_before,
                            balance_after=0.0,
                            reference_number=withdrawal_ref,
                            description=f'{account_type_name} account broken - Amount ₹{transfer_amount:,.2f} transferred to Savings account' + (f' (Early withdrawal penalty: ₹{(current_balance - transfer_amount):,.2f} applied)' if current_balance > transfer_amount else ''),
                            transaction_date=withdrawal_date
                        )
                        
                        # Email 2: Deposit to Savings account
                        EmailService.send_transaction_notification_email(
                            customer_email=customer_email,
                            customer_name=customer_name,
                            transaction_type='deposit',
                            amount=transfer_amount,
                            account_type='Savings',
                            account_number=savings_account_number,
                            balance_before=savings_balance_before,
                            balance_after=final_savings_balance,
                            reference_number=deposit_ref,
                            description=f'Balance transfer from broken {account_type_name} account (ID: {account_id})',
                            transaction_date=deposit_date
                        )
                        
                        logger.info(f'Break account email notifications sent to {customer_email} for account {account_id}')
                    else:
                        logger.warning(f'Customer email not found for account {account_id}, skipping email notifications')
                except Exception as email_error:
                    # Don't fail account break if email fails
                    logger.error(f'Error sending break account email notifications: {email_error}')
                    import traceback
                    logger.error(f'Email error traceback: {traceback.format_exc()}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_break_account_emails_async, daemon=True)
            email_thread.start()
            logger.info(f'Break account email notifications started in background thread for account {account_id}')
            
            logger.info(f'Successfully broke {account_type_name} account {account_id} and transferred {transfer_amount} to Savings account {savings_account.id}')
            
            return {
                'success': True,
                'message': f'{account_type_name} account broken successfully. Balance transferred to Savings account.',
                'data': {
                    'broken_account': account.to_dict(),
                    'savings_account': savings_account.to_dict(),
                    'transfer_amount': transfer_amount
                }
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error breaking account {account_id}: {e}')
            return {
                'success': False,
                'message': 'Failed to break account',
                'data': None
            }
    
    @staticmethod
    def get_account_parameter_history(account_id):
        """Get parameter update history for an account"""
        try:
            account = Account.query.get(account_id)
            if not account:
                return {
                    'success': False,
                    'message': 'Account not found',
                    'data': None
                }
            
            updates = AccountParameterUpdate.query.filter_by(
                account_id=account_id
            ).order_by(AccountParameterUpdate.created_at.desc()).all()
            
            return {
                'success': True,
                'message': 'Parameter history retrieved successfully',
                'data': [update.to_dict() for update in updates]
            }
            
        except Exception as e:
            logger.error(f'Error getting parameter history: {e}')
            return {
                'success': False,
                'message': 'Failed to get parameter history',
                'data': None
            }
 