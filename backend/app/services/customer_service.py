from app import db
from app.models import Customer, User, Account, AccountType, UserPermission, Transaction
from datetime import datetime
from sqlalchemy.orm import joinedload
import logging
import os
import threading

logger = logging.getLogger(__name__)

class CustomerService:
    @staticmethod
    def get_user_role_and_id(user_id):
        """Get user role and ID from both users and customers tables"""
        try:
            # Convert user_id to int if it's a string (JWT returns string)
            try:
                user_id_int = int(user_id) if user_id else None
            except (ValueError, TypeError):
                logger.error(f'Invalid user_id format: {user_id}')
                return None, None
            
            if not user_id_int:
                return None, None
            
            # First check users table (for admin)
            user = User.query.get(user_id_int)
            if user:
                return user.role, user.id
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.get(user_id_int)
            if customer:
                return customer.role, customer.id
            
            return None, None
        except Exception as e:
            logger.error(f'Error getting user role and ID: {e}')
            return None, None

    @staticmethod
    def toggle_customer_active(customer_id, is_active, last_update_by=None, last_update_by_manager_id=None):
        """Toggle a customer's active status"""
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            customer.is_active = is_active
            # Set last_update_by based on who updated (admin or manager)
            if last_update_by_manager_id is not None:
                # Manager updated - clear admin update, set manager update
                customer.last_update_by = None
                customer.last_update_by_manager_id = last_update_by_manager_id
            elif last_update_by is not None:
                # Admin updated - clear manager update, set admin update
                customer.last_update_by = last_update_by
                customer.last_update_by_manager_id = None
            db.session.commit()
            
            status_text = 'activated' if is_active else 'deactivated'
            return {
                'success': True,
                'message': f'Customer {status_text} successfully',
                'data': customer.to_dict()
            }
        except Exception as e:
            logger.error(f'Error toggling customer active status: {e}', exc_info=True)
            db.session.rollback()
            return {
                'success': False,
                'message': f'Failed to toggle customer active status: {str(e)}',
                'data': None
            }

    def create_customer(name, email, phone, role, address, password, account_types, created_by, assigned_manager_id=None, address_village=None, address_post_office=None, address_tehsil=None, address_district=None, address_state=None, address_pincode=None):
        """Create a new staff/customer with account type assignments"""
        try:
            # Check if customer with email already exists
            existing_customer = Customer.query.filter_by(phone=phone).first()
            if existing_customer:
                return {
                    'success': False,
                    'message': 'Staff with this phone number already exists',
                    'data': None
                }
            
            # Validate assigned_manager_id if provided
            if assigned_manager_id:
                manager = Customer.query.filter_by(id=assigned_manager_id, role='manager').first()
                if not manager:
                    return {
                        'success': False,
                        'message': 'Invalid manager ID. Manager not found',
                    'data': None
                }
            
            customer = Customer(
                name=name,
                email=email,
                phone=phone,
                role=role,
                created_by=created_by,
                assigned_manager_id=assigned_manager_id,
                is_active=(role != 'staff'),  # staff requires approval
                address_village=address_village,
                address_post_office=address_post_office,
                address_tehsil=address_tehsil,
                address_district=address_district,
                address_state=address_state,
                address_pincode=address_pincode
            )
            # Set password - generate one if not provided
            password_to_use = password
            if not password_to_use:
                # Generate a random password if not provided
                import secrets
                import string
                alphabet = string.ascii_letters + string.digits
                password_to_use = ''.join(secrets.choice(alphabet) for i in range(12))
            customer.set_password(password_to_use)
            
            db.session.add(customer)
            db.session.flush()  # Flush to get the customer ID
            
            # Always create a Savings account for every customer (staff role)
            if role == 'staff':
                try:
                    # Get Savings account type
                    savings_account_type = AccountType.query.filter_by(name='Savings').first()
                    if savings_account_type:
                        # Check if Savings is already in account_types to avoid duplication
                        savings_already_included = 'savings' in account_types if account_types else False
                        
                        # Create Savings account
                        savings_account = Account(
                            customer_id=customer.id,
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
                        logger.info(f'Auto-created Savings account for customer {customer.id}')
                    else:
                        logger.warning(f'Savings account type not found. Cannot auto-create Savings account for customer {customer.id}')
                except Exception as savings_error:
                    logger.error(f'Error auto-creating Savings account for customer {customer.id}: {savings_error}')
                    # Don't fail customer creation if Savings account creation fails
                    pass
            
            # Create additional account type assignments (only for staff role)
            if role == 'staff' and account_types:
                try:
                    logger.info(f'Creating accounts for customer {customer.id} with account_types: {account_types}')
                    # Map lowercase frontend values to database names
                    name_mapping = {
                        'savings': 'Savings',
                        'rd': 'RD', 
                        'fd': 'FD',
                        'dds': 'DDS',
                        'loan': 'Loan'
                    }
                    
                    for account_type_name in account_types:
                        try:
                            # Skip Savings if already auto-created (to avoid duplication)
                            if account_type_name == 'savings':
                                logger.info(f'Skipping Savings account creation as it was already auto-created for customer {customer.id}')
                                continue
                            
                            # Get the account type ID from the AccountType table
                            db_name = name_mapping.get(account_type_name, account_type_name)
                            account_type = AccountType.query.filter_by(name=db_name).first()
                            logger.info(f'Looking for account type: {db_name}, found: {account_type}')
                            if account_type:
                                # For RD accounts, start_date and maturity_date will be set on first deposit
                                # For FD accounts, set start_date and maturity_date on creation
                                maturity_date = None
                                start_date = None
                                if account_type.name == 'RD':
                                    # RD: start_date will be set when first deposit is made
                                    start_date = datetime.now().date()  # Temporary, will be updated on first deposit
                                    maturity_date = None  # Will be calculated on first deposit
                                elif account_type.name == 'FD' and account_type.term_in_days:
                                    # FD: set start_date and maturity_date immediately
                                    start_date = datetime.now().date()
                                    from datetime import timedelta
                                    maturity_date = start_date + timedelta(days=account_type.term_in_days)
                                else:
                                    # Savings and Loan: just set start_date
                                    start_date = datetime.now().date()
                                
                                # Create account with snapshot of current account type parameters
                                account = Account(
                                    customer_id=customer.id,
                                    account_type_id=account_type.id,
                                    balance=0.0,
                                    start_date=start_date,
                                    maturity_date=maturity_date,
                                    status='active',
                                    created_by=created_by,
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
                                    use_custom_parameters=False
                                )
                                db.session.add(account)
                                logger.info(f'Added account with snapshot for customer {customer.id} with type {account_type.name} (Interest Rate: {account_type.interest_rate}%)')
                            else:
                                logger.warning(f'Account type not found: {db_name}')
                        except Exception as account_error:
                            logger.error(f'Error creating account for type {account_type_name}: {account_error}')
                            raise account_error
                except Exception as accounts_error:
                    logger.error(f'Error in account creation process: {accounts_error}')
                    raise accounts_error
            
            db.session.commit()
            
            logger.info(f'Staff created: {email} with role: {role} and account types: {account_types}')
            
            # Send welcome email with credentials (non-blocking background thread)
            # Send welcome email for both managers and staff customers
            if role in ['manager', 'staff']:
                # Import Flask app to create application context in thread
                from flask import current_app
                
                # Capture the app instance before starting the thread
                app = current_app._get_current_object()
            
            def send_welcome_email_async():
                # Push Flask application context for the thread
                with app.app_context():
                    try:
                        from app.services.email_service import EmailService
                        frontend_url = os.environ.get('FRONTEND_URL', 'https://mini-bank-project.vercel.app')
                        login_url = f"{frontend_url}/login"
                        
                        EmailService.send_customer_welcome_email(
                            customer_email=email,
                            customer_name=name,
                            customer_id=customer.id,
                                password=password_to_use,  # Plain password - only sent once at creation (only for managers)
                                role=role,  # Pass role to determine email template
                            login_url=login_url
                        )
                        logger.info(f'Welcome email sent to {email}')
                    except Exception as email_error:
                        # Don't fail customer creation if email fails
                        logger.error(f'Error sending welcome email to {email}: {email_error}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_welcome_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Welcome email sending started in background thread for {email}')
            
            return {
                'success': True,
                'message': f'Staff created successfully as {role}',
                'data': customer.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating customer: {e}')
            return {
                'success': False,
                'message': 'Failed to create customer',
                'data': None
            }
    
    @staticmethod
    def get_customers(user_role, user_id=None, page=1, limit=10, search='', sort_by='created_at', sort_order='asc'):
        """Get customers with pagination, search, and filters based on user role"""
        try:
            logger.info(f'get_customers called with: user_role={user_role}, user_id={user_id}, page={page}, limit={limit}, search={search}, sort_by={sort_by}, sort_order={sort_order}')
            if user_role == 'admin':
                # Admin can see all staff customers (exclude managers)
                query = Customer.query.filter(Customer.role == 'staff')
            elif user_role == 'manager':
                # Check if manager has permission to view customers
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='customers_management',
                    can_view=True
                ).first()
                
                if not permission:
                    # Manager doesn't have permission, return empty
                    return {
                        'success': True,
                        'message': 'No permission to view customers',
                        'data': [],
                        'pagination': {
                            'current_page': page,
                            'total_pages': 0,
                            'total_count': 0,
                            'limit': limit,
                            'has_next': False,
                            'has_prev': False
                        }
                    }
                
                # Manager can only see customers assigned to them
                query = Customer.query.filter(
                    Customer.role == 'staff',
                    Customer.assigned_manager_id == user_id
                )
            else:  # staff/customer - can only see their own profile
                # Staff/Customer role should not see customer list
                # They should only see their own profile
                query = Customer.query.filter(Customer.id == user_id)
            
            # Apply search filter
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    db.or_(
                        Customer.name.ilike(search_term),
                        Customer.email.ilike(search_term),
                        Customer.phone.ilike(search_term)
                    )
                )
            
            # Apply sorting
            if sort_by == 'name':
                sort_column = Customer.name
            elif sort_by == 'email':
                sort_column = Customer.email
            elif sort_by == 'role':
                sort_column = Customer.role
            else:  # default to created_at
                sort_column = Customer.created_at
            
            if sort_order == 'asc':
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())
            
            # Get total count for pagination
            total_count = query.count()
            
            # Calculate pagination
            offset = (page - 1) * limit
            customers = query.offset(offset).limit(limit).all()
            
            # Get account data for each customer
            # Eager load accounts and account_type to avoid N+1 queries
            customers = Customer.query.options(joinedload(Customer.accounts).joinedload(Account.account_type)).filter(Customer.id.in_([c.id for c in customers])).all()
            
            customers_data = []
            for customer in customers:
                customer_dict = customer.to_dict()
                
                # Include actual account data
                accounts = []
                # Map database names back to frontend lowercase values for account type
                name_mapping = {
                    'Savings': 'savings',
                    'RD': 'rd', 
                    'FD': 'fd',
                    'DDS': 'dds',
                    'Loan': 'loan'
                }
                for acc in customer.accounts:
                    if acc.status == 'active':
                        try:
                            account_dict = acc.to_dict()
                            # Ensure account_type is set correctly
                            if acc.account_type:
                                account_dict['account_type'] = name_mapping.get(acc.account_type.name, acc.account_type.name.lower())
                            else:
                                account_dict['account_type'] = 'unknown'
                                logger.warning(f'Account {acc.id} has no account_type relationship')
                            accounts.append(account_dict)
                        except Exception as e:
                            logger.error(f'Error processing account {acc.id}: {e}')
                            continue
                
                customer_dict['accounts'] = accounts
                
                # Keep account_types for backward compatibility (just the names)
                account_types = [acc['account_type'] for acc in accounts]
                customer_dict['account_types'] = account_types
                
                customers_data.append(customer_dict)
            
            # Calculate pagination info
            total_pages = (total_count + limit - 1) // limit  # Ceiling division
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                'success': True,
                'message': 'Customers retrieved successfully',
                'data': customers_data,
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
            logger.error(f'Error getting customers: {e}')
            return {
                'success': False,
                'message': 'Failed to get customers',
                'data': None
            }
    
    @staticmethod
    def get_customer(customer_id, user_role, user_id):
        """Get a specific customer"""
        try:
            # Eager load account_type relationship to avoid N+1 queries
            customer = Customer.query.options(joinedload(Customer.accounts).joinedload(Account.account_type)).filter_by(id=customer_id).first()
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            # Check permissions
            if user_role == 'admin':
                # Admin can access any customer
                pass
            elif user_role == 'manager':
                # Check if manager has permission
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
                
                # Manager can only access customers assigned to them
                if customer.assigned_manager_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied - Customer not assigned to you',
                        'data': None
                    }
            else:  # staff
                if customer.id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied',
                        'data': None
                    }
            
            # Get account data for this customer
            customer_dict = customer.to_dict()
            
            # Include actual account data instead of just account type names
            # Sort accounts by creation date (oldest first)
            sorted_accounts = sorted(customer.accounts, key=lambda x: x.created_at)
            logger.info(f'Customer {customer_id} has {len(sorted_accounts)} total accounts')
            accounts = []
            # Map database names back to frontend lowercase values for account type
            name_mapping = {
                'Savings': 'savings',
                'RD': 'rd', 
                'FD': 'fd',
                'Loan': 'loan'
            }
            for acc in sorted_accounts:
                logger.info(f'Processing account {acc.id}: status={acc.status}, account_type={acc.account_type.name if acc.account_type else None}')
                if acc.status == 'active':
                    try:
                        account_dict = acc.to_dict()
                        # Ensure account_type is set correctly
                        if acc.account_type:
                            account_dict['account_type'] = name_mapping.get(acc.account_type.name, acc.account_type.name.lower())
                            logger.info(f'Account {acc.id} ({acc.account_type.name}) added to response')
                        else:
                            account_dict['account_type'] = 'unknown'
                            logger.warning(f'Account {acc.id} has no account_type relationship')
                        accounts.append(account_dict)
                    except Exception as e:
                        logger.error(f'Error processing account {acc.id}: {e}', exc_info=True)
                        continue
                else:
                    logger.info(f'Account {acc.id} skipped (status: {acc.status})')
            
            logger.info(f'Returning {len(accounts)} active accounts for customer {customer_id}')
            
            customer_dict['accounts'] = accounts
            
            # Keep account_types for backward compatibility (just the names)
            account_types = [acc['account_type'] for acc in accounts]
            customer_dict['account_types'] = account_types
            
            return {
                'success': True,
                'message': 'Customer retrieved successfully',
                'data': customer_dict
            }
            
        except Exception as e:
            logger.error(f'Error getting customer: {e}')
            return {
                'success': False,
                'message': 'Failed to get customer',
                'data': None
            }
    
    @staticmethod
    def update_customer(customer_id, name, email, phone, address, role, password, account_types, user_role, user_id, assigned_manager_id=None, last_update_by=None, last_update_by_manager_id=None, address_village=None, address_post_office=None, address_tehsil=None, address_district=None, address_state=None, address_pincode=None):
        """Update a customer with account type assignments"""
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            # Check permissions
            if user_role == 'admin':
                # Admin can update any customer
                logger.info(f'Admin {user_id} updating customer {customer_id}')
                pass
            elif user_role == 'manager':
                # Check if manager has permission
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='customers_management',
                    can_update=True
                ).first()
                
                logger.info(f'Manager {user_id} updating customer {customer_id}. Has permission: {permission is not None}, Customer assigned_manager_id: {customer.assigned_manager_id}')
                
                if not permission:
                    logger.warning(f'Manager {user_id} does not have update permission for customers_management')
                    return {
                        'success': False,
                        'message': 'Access denied - No permission to update customers',
                        'data': None
                    }
                
                # Manager can only update customers assigned to them
                if customer.assigned_manager_id != user_id:
                    logger.warning(f'Manager {user_id} tried to update customer {customer_id} (assigned to manager: {customer.assigned_manager_id}). Access denied.')
                    return {
                        'success': False,
                        'message': f'Access denied - This customer is not assigned to you. Assigned to manager ID: {customer.assigned_manager_id}',
                        'data': None
                    }
                
                logger.info(f'Manager {user_id} authorized to update customer {customer_id}')
            else:  # staff
                if customer.created_by != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied',
                        'data': None
                    }
            
            # Validate assigned_manager_id if provided
            if assigned_manager_id is not None:
                if assigned_manager_id == 0 or assigned_manager_id == '':
                    # Clear assignment
                    assigned_manager_id = None
                else:
                    manager = Customer.query.filter_by(id=assigned_manager_id, role='manager').first()
                    if not manager:
                        return {
                            'success': False,
                            'message': 'Invalid manager ID. Manager not found',
                    'data': None
                }
            
            # Check if phone is already taken by another customer
            existing_customer = Customer.query.filter(
                Customer.phone == phone,
                Customer.id != customer_id
            ).first()
            
            if existing_customer:
                return {
                    'success': False,
                    'message': 'Phone number already taken by another customer',
                    'data': None
                }
            
            # Update customer
            customer.name = name
            customer.email = email
            customer.phone = phone
            if address is not None:
                customer.address = address
            customer.role = role
            # Only update address fields if they are provided (not None)
            # This preserves existing values if fields are not included in the update request
            if address_village is not None:
                customer.address_village = address_village
            if address_post_office is not None:
                customer.address_post_office = address_post_office
            if address_tehsil is not None:
                customer.address_tehsil = address_tehsil
            if address_district is not None:
                customer.address_district = address_district
            if address_state is not None:
                customer.address_state = address_state
            if address_pincode is not None:
                customer.address_pincode = address_pincode
            # Set last_update_by based on who updated (admin or manager)
            if last_update_by_manager_id is not None:
                # Manager updated - clear admin update, set manager update
                customer.last_update_by = None
                customer.last_update_by_manager_id = last_update_by_manager_id
            elif last_update_by is not None:
                # Admin updated - clear manager update, set admin update
                customer.last_update_by = last_update_by
                customer.last_update_by_manager_id = None
            
            # Only admin can change assigned_manager_id
            if user_role == 'admin' and assigned_manager_id is not None:
                customer.assigned_manager_id = assigned_manager_id
            
            # Update password if provided
            if password:
                customer.set_password(password)
            
            # Update account types (only for staff role)
            # Validate: Cannot remove account types that have active accounts
            if role == 'staff':
                # Get current active accounts for this customer
                current_active_accounts = Account.query.filter_by(
                    customer_id=customer_id,
                    status='active'
                ).all()
                
                # Map account type names to lowercase for comparison
                name_mapping = {
                    'Savings': 'savings',
                    'RD': 'rd',
                    'FD': 'fd',
                    'Loan': 'loan'
                }
                
                # Get account type names that have active accounts
                active_account_type_names = set()
                for account in current_active_accounts:
                    if account.account_type:
                        account_type_name = account.account_type.name
                        lowercase_name = name_mapping.get(account_type_name, account_type_name.lower())
                        active_account_type_names.add(lowercase_name)
                
                # Check if trying to remove an account type that has active accounts
                account_types_set = set(account_types or [])
                removed_types = active_account_type_names - account_types_set
                
                if removed_types:
                    # Convert back to readable names
                    readable_names = {
                        'savings': 'Savings',
                        'rd': 'RD',
                        'fd': 'FD',
                        'dds': 'DDS',
                        'loan': 'Loan'
                    }
                    removed_readable = [readable_names.get(t, t.title()) for t in removed_types]
                    return {
                        'success': False,
                        'message': f'Cannot remove account types with active accounts: {", ".join(removed_readable)}. Please close all active accounts of these types first.',
                        'data': {
                            'protected_account_types': removed_readable,
                            'active_accounts': [
                                {
                                    'id': acc.id,
                                    'account_type': acc.account_type.name if acc.account_type else None,
                                    'balance': acc.balance,
                                    'status': acc.status
                                }
                                for acc in current_active_accounts
                                if acc.account_type and name_mapping.get(acc.account_type.name, acc.account_type.name.lower()) in removed_types
                            ]
                        }
                    }, 400
                
                # Get existing account type IDs to preserve accounts that are not being changed
                existing_account_type_ids = {acc.account_type_id for acc in current_active_accounts if acc.account_type}
                
                # Map lowercase frontend values to database names
                name_mapping_db = {
                    'savings': 'Savings',
                    'rd': 'RD', 
                    'fd': 'FD',
                    'dds': 'DDS',
                    'loan': 'Loan'
                }
                
                # Get new account type IDs being assigned
                new_account_type_ids = set()
                if account_types:
                    for account_type_name in account_types:
                        db_name = name_mapping_db.get(account_type_name, account_type_name)
                        account_type = AccountType.query.filter_by(name=db_name).first()
                        if account_type:
                            new_account_type_ids.add(account_type.id)
                
                # Find account types to remove (have active accounts but not in new list)
                account_types_to_remove = existing_account_type_ids - new_account_type_ids
                
                # Close accounts that are being removed (instead of deleting)
                if account_types_to_remove:
                    accounts_to_close = Account.query.filter(
                        Account.customer_id == customer_id,
                        Account.account_type_id.in_(account_types_to_remove),
                        Account.status == 'active'
                    ).all()
                    
                    for account in accounts_to_close:
                        if account.balance > 0:
                            return {
                                'success': False,
                                'message': f'Cannot remove account type with balance. Account {account.id} ({account.account_type.name if account.account_type else "Unknown"}) has balance: {account.balance}',
                                'data': {
                                    'account_id': account.id,
                                    'account_type': account.account_type.name if account.account_type else None,
                                    'balance': account.balance
                                }
                            }, 400
                        # Close the account if balance is zero
                        account.status = 'closed'
                        logger.info(f'Closed account {account.id} as account type is being removed')
                
                # Find account types to add (not in existing accounts)
                account_types_to_add = new_account_type_ids - existing_account_type_ids
            
            # Then add new account type assignments (only for staff role)
            if role == 'staff' and account_types:
                # Map lowercase frontend values to database names
                name_mapping_db = {
                    'savings': 'Savings',
                    'rd': 'RD', 
                    'fd': 'FD',
                    'dds': 'DDS',
                    'loan': 'Loan'
                }
                
                # For created_by, use the customer's original creator (admin from users table)
                # This is because accounts.created_by must reference users.id, not customers.id
                # If manager is updating, we still use the original admin who created the customer
                account_creator_id = customer.created_by
                
                # Verify the creator exists in users table (should always be an admin)
                creator_user = User.query.get(account_creator_id)
                if not creator_user:
                    # Fallback: if somehow the creator doesn't exist, find the first admin
                    admin_user = User.query.filter_by(role='admin').first()
                    if admin_user:
                        account_creator_id = admin_user.id
                    else:
                        logger.error(f'No admin user found for account creation. Customer created_by: {customer.created_by}')
                        return {
                            'success': False,
                            'message': 'System error: No admin user found',
                            'data': None
                        }
                
                # Only create accounts for new account types (not already existing)
                for account_type_name in account_types:
                    # Get the account type ID from the AccountType table
                    db_name = name_mapping_db.get(account_type_name, account_type_name)
                    account_type = AccountType.query.filter_by(name=db_name).first()
                    if account_type and account_type.id in account_types_to_add:
                        # For RD accounts, start_date and maturity_date will be set on first deposit
                        # For FD accounts, set start_date and maturity_date on creation
                        maturity_date = None
                        start_date = None
                        if account_type.name == 'RD':
                            # RD: start_date will be set when first deposit is made
                            start_date = datetime.now().date()  # Temporary, will be updated on first deposit
                            maturity_date = None  # Will be calculated on first deposit
                        elif account_type.name == 'FD' and account_type.term_in_days:
                            # FD: set start_date and maturity_date immediately
                            from datetime import timedelta
                            start_date = datetime.now().date()
                            maturity_date = start_date + timedelta(days=account_type.term_in_days)
                        else:
                            # Savings and Loan: just set start_date
                            start_date = datetime.now().date()
                        
                        # Create account with snapshot of current account type parameters
                        account = Account(
                            customer_id=customer.id,
                            account_type_id=account_type.id,
                            balance=0.0,
                            start_date=start_date,
                            maturity_date=maturity_date,
                            status='active',
                            created_by=account_creator_id,  # Use customer's original creator (admin)
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
                            use_custom_parameters=False
                        )
                        db.session.add(account)
                        logger.info(f'Created new account {account_type.name} for customer {customer.id} during update')
            
            db.session.commit()
            
            logger.info(f'Customer updated: {email} with account types: {account_types}')
            
            return {
                'success': True,
                'message': f'Customer updated successfully as {role}',
                'data': customer.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating customer: {e}')
            return {
                'success': False,
                'message': 'Failed to update customer',
                'data': None
            }
    
    @staticmethod
    def delete_customer(customer_id, user_role, user_id):
        """Delete a customer"""
        try:
            customer = Customer.query.get(customer_id)
            if not customer:
                return {
                    'success': False,
                    'message': 'Customer not found',
                    'data': None
                }
            
            # Check permissions
            if user_role == 'admin':
                # Admin can delete any customer
                pass
            elif user_role == 'manager':
                # Check if manager has permission
                permission = UserPermission.query.filter_by(
                    user_id=user_id,
                    user_type='customer',
                    module='customers_management',
                    can_delete=True
                ).first()
                
                if not permission:
                    return {
                        'success': False,
                        'message': 'Access denied - No permission',
                        'data': None
                    }
                
                # Manager can only delete customers assigned to them
                if customer.assigned_manager_id != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied - Customer not assigned to you',
                        'data': None
                    }
            else:  # staff
                if customer.created_by != user_id:
                    return {
                        'success': False,
                        'message': 'Access denied',
                        'data': None
                    }
            
            # Check if customer has active accounts with balances
            accounts = Account.query.filter_by(customer_id=customer_id, status='active').all()
            
            if accounts:
                # Categorize accounts by type and check for balances
                account_details = []
                has_loan = False
                has_rd = False
                has_fd = False
                has_savings = False
                loan_balance = 0
                rd_balance = 0
                fd_balance = 0
                savings_balance = 0
                
                for account in accounts:
                    account_type_name = account.account_type.name if account.account_type else 'Unknown'
                    balance = abs(account.balance) if account.balance < 0 else account.balance
                    
                    if account_type_name == 'Loan' and balance > 0:
                        has_loan = True
                        loan_balance += balance
                    elif account_type_name == 'RD' and balance > 0:
                        has_rd = True
                        rd_balance += balance
                    elif account_type_name == 'FD' and balance > 0:
                        has_fd = True
                        fd_balance += balance
                    elif account_type_name == 'Savings' and balance > 0:
                        has_savings = True
                        savings_balance += balance
                
                # Build detailed error message
                error_messages = []
                if has_loan:
                    error_messages.append(f'Active Loan account with outstanding balance of ₹{loan_balance:,.2f}')
                if has_rd:
                    error_messages.append(f'Active RD (Recurring Deposit) account with balance of ₹{rd_balance:,.2f}')
                if has_fd:
                    error_messages.append(f'Active FD (Fixed Deposit) account with balance of ₹{fd_balance:,.2f}')
                if has_savings:
                    error_messages.append(f'Active Savings account with balance of ₹{savings_balance:,.2f}')
                
                if error_messages:
                    message = f'Cannot delete customer. Customer has {len(error_messages)} active account(s) with balances. Please close all accounts or transfer balances before deletion.'
                    return {
                        'success': False,
                        'message': message,
                        'data': None
                    }
            
            # If we reach here, either no accounts or all accounts have zero balance
            # Explicitly delete transactions, account parameter updates, then accounts, then customer
            # This ensures proper cleanup even if CASCADE doesn't work as expected
            
            # Get all accounts for this customer (including closed ones)
            all_accounts = Account.query.filter_by(customer_id=customer_id).all()
            account_ids = [acc.id for acc in all_accounts]
            
            # Delete all account parameter updates first
            if account_ids:
                from app.models import AccountParameterUpdate
                param_updates_count = AccountParameterUpdate.query.filter(
                    AccountParameterUpdate.account_id.in_(account_ids)
                ).delete(synchronize_session=False)
                logger.info(f'Deleted {param_updates_count} account parameter updates for {len(account_ids)} accounts')
            
            # Delete all EMI installments for these accounts (must be before account deletion)
            if account_ids:
                from app.models import EMIInstallment
                emi_count = EMIInstallment.query.filter(
                    EMIInstallment.account_id.in_(account_ids)
                ).delete(synchronize_session=False)
                logger.info(f'Deleted {emi_count} EMI installments for {len(account_ids)} accounts')
            
            # Delete all transactions for these accounts
            if account_ids:
                deleted_count = Transaction.query.filter(Transaction.account_id.in_(account_ids)).delete(synchronize_session=False)
                logger.info(f'Deleted {deleted_count} transactions for {len(account_ids)} accounts')
            
            # Delete all accounts for this customer
            if all_accounts:
                for account in all_accounts:
                    db.session.delete(account)
                logger.info(f'Deleted {len(all_accounts)} accounts')
            
            # Finally delete the customer
            db.session.delete(customer)
            db.session.commit()
            
            logger.info(f'Customer deleted: {customer.email}')
            
            return {
                'success': True,
                'message': 'Customer deleted successfully',
                'data': None
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error deleting customer: {e}')
            return {
                'success': False,
                'message': 'Failed to delete customer',
                'data': None
            }
     
    @staticmethod
    def approve_staff(customer_id, admin_id):
        """Approve a staff and create their accounts"""
        customer = Customer.query.get(customer_id)
        if not customer:
            return {'success': False, 'message': 'Customer not found'}

        if customer.role != 'staff':
            return {'success': False, 'message': 'Only staff require approval'}

        customer.is_active = True
        customer.last_update_by = admin_id
        db.session.commit()
        return {'success': True, 'message': 'Staff approved and accounts created', 'data': customer.to_dict()}
