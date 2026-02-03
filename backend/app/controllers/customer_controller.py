from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.customer_service import CustomerService
from app.models import User, Customer, UserPermission
import logging
import re
logger = logging.getLogger(__name__)

def validate_email(email: str) -> bool:
    """Validate email format"""
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return bool(re.match(email_regex, email))

def validate_phone(phone: str) -> bool:
    """Validate that phone contains exactly 10 digits"""
    digits_only = re.sub(r'\D', '', phone)  # Remove all non-digit characters
    return len(digits_only) == 10

def get_user_role_and_id(user_id):
    """Get user role and ID from both users and customers tables"""
    try:
        # Convert string ID to integer for database query
        user_id_int = int(user_id)
        
        # First check users table (for admin)
        user = User.query.get(user_id_int)
        if user:
            return user.role, user_id_int
        
        # If not found in users table, check customers table (for staff/manager)
        customer = Customer.query.get(user_id_int)
        if customer:
            return customer.role, user_id_int
        return None, None
    except (ValueError, TypeError) as e:
        logger.error(f'Error in get_user_role_and_id: {e}')
        return None, None

class CustomerController:
    @staticmethod
    def create_customer():
        """Handle customer creation"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            # Debug: Log the received data
            logger.info(f'Received customer data: {data}')
            
            if data.get('email') is not None and data.get('email') != '':
                if not validate_email(data.get('email')):
                    return {
                        'success': False,
                        'message': 'Invalid email address',
                        'data': None
                    }, 400    
            # Validate required fields
            required_fields = ['name', 'phone', 'role', 'address_pincode']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            # Validate role
            valid_roles = ['staff']
            if data['role'] not in valid_roles:
                return {
                    'success': False,
                    'message': 'Invalid role. Only staff role is allowed',
                    'data': None
                }, 400
            
            # Validate account types
            account_types = data.get('account_types', [])
            valid_account_types = ['savings', 'rd', 'fd', 'loan', 'dds']
            for account_type in account_types:
                if account_type not in valid_account_types:
                    return {
                        'success': False,
                        'message': f'Invalid account type: {account_type}. Must be one of: {", ".join(valid_account_types)}',
                        'data': None
                    }, 400
            
            # Get user role and ID to determine the correct created_by value
            user_role, user_id_int = get_user_role_and_id(current_user_id)
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 404
            
            # Check permissions: Admin can always create, Manager needs can_create permission
            if user_role == 'admin':
                # Admin can create customers
                pass
            elif user_role == 'manager':
                # Check if manager has create permission
                from app.models import UserPermission
                permission = UserPermission.query.filter_by(
                    user_id=user_id_int,
                    user_type='customer',
                    module='customers_management',
                    can_create=True
                ).first()
                
                if not permission:
                    return {
                        'success': False,
                        'message': 'Access denied - No permission to create customers',
                        'data': None
                    }, 403
            else:
                # Staff cannot create customers
                return {
                    'success': False,
                    'message': 'Only admin and managers with permission can create customers',
                    'data': None
                }, 403
            
            # For created_by, we need to use an admin user ID (from users table)
            # because customers.created_by references users.id
            admin_user = User.query.filter_by(role='admin').first()
            if not admin_user:
                return {
                    'success': False,
                    'message': 'System error: No admin user found',
                    'data': None
                }, 500
            
            created_by_id = admin_user.id  # Always use admin's ID for created_by
            
            # Get assigned_manager_id if provided, or auto-assign to manager if manager is creating
            assigned_manager_id = data.get('assigned_manager_id')
            if assigned_manager_id:
                try:
                    assigned_manager_id = int(assigned_manager_id)
                except (ValueError, TypeError):
                    assigned_manager_id = None
            
            # If manager is creating a customer and no assigned_manager_id is provided,
            # automatically assign it to the creating manager
            if user_role == 'manager' and not assigned_manager_id:
                assigned_manager_id = user_id_int
            
            result = CustomerService.create_customer(
                name=data['name'],
                email=data['email'],
                phone=data.get('phone'),
                address=data.get('address'),
                role=data['role'],
                password=data.get('password'),  # Password is optional
                account_types=account_types,
                created_by=created_by_id,
                assigned_manager_id=assigned_manager_id,
                address_village=data.get('address_village'),
                address_post_office=data.get('address_post_office'),
                address_tehsil=data.get('address_tehsil'),
                address_district=data.get('address_district'),
                address_state=data.get('address_state'),
                address_pincode=data.get('address_pincode')
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_customer controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create customer',
                'data': None
            }, 500
    
    @staticmethod
    def get_customers():
        """Handle getting all customers with pagination, search, and filters"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Get pagination parameters from request body (POST) or query string (fallback)
            # Use silent=True to return None instead of raising error if no JSON body
            data = request.get_json(silent=True) or {}
            
            page = data.get('page') or request.args.get('page', 1, type=int)
            limit = data.get('limit') or request.args.get('limit', 10, type=int)
            
            # Get search and filter parameters
            search = data.get('search') or request.args.get('search', '').strip()
            sort_by = data.get('sort_by') or request.args.get('sort_by', 'created_at').strip()
            sort_order = data.get('sort_order') or request.args.get('sort_order', 'desc').strip()
            
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
            
            # Validate pagination parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 100:  # Max 100 items per page
                limit = 10
            
            # Validate sort parameters
            valid_sort_fields = ['created_at', 'name', 'email', 'role']
            if sort_by not in valid_sort_fields:
                sort_by = 'created_at'
            
            if sort_order not in ['asc', 'desc']:
                sort_order = 'desc'
            
            # Debug logging
            logger.info(f'Calling get_customers with: user_role={user_role}, user_id={user_id}, page={page}, limit={limit}, search={search}, sort_by={sort_by}, sort_order={sort_order}')
            
            result = CustomerService.get_customers(
                user_role, 
                user_id, 
                page, 
                limit,
                search=search,
                sort_by=sort_by,
                sort_order=sort_order
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_customers controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get customers',
                'data': None
            }, 500
    
    @staticmethod
    def get_customer(customer_id):
        """Handle getting a specific customer"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            result = CustomerService.get_customer(customer_id, user_role, user_id)
            
            status_code = 200 if result['success'] else 404
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_customer controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get customer',
                'data': None
            }, 500
    
    @staticmethod
    def update_customer(customer_id):
        """Handle customer update"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            user_role, user_id = get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            if data.get('email') is not None and data.get('email') != '':
                if not validate_email(data.get('email')):
                    return {
                        'success': False,
                        'message': 'Invalid email address',
                        'data': None
                    }, 400
            # Validate required fields
            required_fields = ['name', 'phone', 'role', 'address_pincode']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            # Validate role
            valid_roles = ['staff']
            if data['role'] not in valid_roles:
                return {
                    'success': False,
                    'message': 'Invalid role. Only staff role is allowed',
                    'data': None
                }, 400
            # Validate account types
            account_types = data.get('account_types', [])
            valid_account_types = ['savings', 'rd', 'fd', 'loan', 'dds']
            for account_type in account_types:
                if account_type not in valid_account_types:
                    return {
                        'success': False,
                        'message': f'Invalid account type: {account_type}. Must be one of: {", ".join(valid_account_types)}',
                        'data': None
                    }, 400

            # Get assigned_manager_id if provided (only admin can change this)
            assigned_manager_id = None
            if user_role == 'admin' and 'assigned_manager_id' in data:
                assigned_manager_id = data.get('assigned_manager_id')
                if assigned_manager_id:
                    try:
                        assigned_manager_id = int(assigned_manager_id)
                    except (ValueError, TypeError):
                        assigned_manager_id = None
            
            # Determine who updated: admin or manager
            # - If current user is admin (in users table), use their ID for last_update_by
            # - If current user is manager (in customers table), use their ID for last_update_by_manager_id
            last_update_by = None
            last_update_by_manager_id = None
            
            if user_role == 'admin':
                # Admin is in users table, so use their ID directly
                try:
                    current_user_id_int = int(current_user_id)
                    admin_user = User.query.get(current_user_id_int)
                    if admin_user and admin_user.role == 'admin':
                        last_update_by = admin_user.id
                except (ValueError, TypeError) as e:
                    logger.error(f'Error converting user_id to int: {e}')
            elif user_role == 'manager':
                # Manager is in customers table, so use their ID for last_update_by_manager_id
                last_update_by_manager_id = user_id
            
            result = CustomerService.update_customer(
                customer_id=customer_id,
                name=data['name'],
                email=data['email'],
                phone=data.get('phone'),
                address=data.get('address'),
                role=data['role'],
                password=data.get('password'),  # Add password handling
                account_types=account_types,
                user_role=user_role,
                user_id=user_id,
                assigned_manager_id=assigned_manager_id,
                last_update_by=last_update_by,
                last_update_by_manager_id=last_update_by_manager_id,
                address_village=data.get('address_village'),
                address_post_office=data.get('address_post_office'),
                address_tehsil=data.get('address_tehsil'),
                address_district=data.get('address_district'),
                address_state=data.get('address_state'),
                address_pincode=data.get('address_pincode')
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_customer controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update customer',
                'data': None
            }, 500
    
    @staticmethod
    def toggle_customer_active(customer_id, is_active=True):
        """Handle customer active status toggle"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            # Determine who updated: admin or manager
            # - If current user is admin (in users table), use their ID for last_update_by
            # - If current user is manager (in customers table), use their ID for last_update_by_manager_id
            last_update_by = None
            last_update_by_manager_id = None
            
            if user_role == 'admin':
                # Admin is in users table, so use their ID directly
                try:
                    current_user_id_int = int(current_user_id)
                    admin_user = User.query.get(current_user_id_int)
                    if admin_user and admin_user.role == 'admin':
                        last_update_by = admin_user.id
                except (ValueError, TypeError) as e:
                    logger.error(f'Error converting user_id to int: {e}')
            elif user_role == 'manager':
                # Manager is in customers table, so use their ID for last_update_by_manager_id
                last_update_by_manager_id = user_id
            
            result = CustomerService.toggle_customer_active(
                customer_id, is_active, last_update_by, last_update_by_manager_id
            )
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in toggle_customer_active controller: {e}', exc_info=True)
            return {
                'success': False,
                'message': f'Failed to toggle customer active status: {str(e)}',
                'data': None
            }, 500
    
    @staticmethod
    def delete_customer(customer_id):
        """Handle customer deletion"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = get_user_role_and_id(current_user_id)
            
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 401
            
            result = CustomerService.delete_customer(
                customer_id=customer_id,
                user_role=user_role,
                user_id=user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in delete_customer controller: {e}')
            return {
                'success': False,
                'message': 'Failed to delete customer',
                'data': None
            }, 500

    @staticmethod
    def get_me():
        """Get current user's own information (for staff)"""
        try:
            user_id = get_jwt_identity()
            if not user_id:
                return {
                    'success': False,
                    'message': 'Authentication required',
                    'data': None
                }, 401

            # Get user role and ID
            user_role, user_id_int = get_user_role_and_id(user_id)
            if not user_role:
                return {
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }, 404

            # Only staff can access their own information
            if user_role not in ['staff', 'manager']:
                return {
                    'success': False,
                    'message': 'Access denied',
                    'data': None
                }, 403

            # Get customer information
            result = CustomerService.get_customer(user_id_int, user_role, user_id_int)
            
            if result['success']:
                return {
                    'success': True,
                    'message': 'Customer information retrieved successfully',
                    'data': result['data']
                }, 200
            else:
                return {
                    'success': False,
                    'message': result['message'],
                    'data': None
                }, result.get('status_code', 500)

        except Exception as e:
            logger.error(f'Error in get_me controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve customer information',
                'data': None
            }, 500
