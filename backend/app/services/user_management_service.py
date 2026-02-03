from app import db
from app.models import User, Customer, UserPermission
from werkzeug.security import generate_password_hash
from sqlalchemy.orm import joinedload
import logging
import os
import threading

logger = logging.getLogger(__name__)

class UserManagementService:
    
    @staticmethod
    def get_user_role_and_id(user_id):
        """Get user role and ID from both users and customers tables"""
        try:
            # First check users table (for admin)
            user = User.query.get(user_id)
            if user:
                return user.role, user.id
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.get(user_id)
            if customer:
                return customer.role, customer.id
            
            return None, None
        except Exception as e:
            logger.error(f'Error getting user role and ID: {e}')
            return None, None
    
    @staticmethod
    def get_all_managers():
        """Get all manager users"""
        try:
            # Eager load relationships to avoid N+1 queries
            # Note: last_updater is a backref, so we load creator and last_updater_manager
            managers = Customer.query.options(
                joinedload(Customer.creator),
                joinedload(Customer.last_updater_manager)
            ).filter_by(role='manager').all()
            
            # Pre-fetch all admin users who might be last_updaters to avoid N+1 queries
            admin_user_ids = [m.last_update_by for m in managers if m.last_update_by]
            admin_users = {}
            if admin_user_ids:
                admins = User.query.filter(User.id.in_(admin_user_ids)).all()
                admin_users = {admin.id: admin for admin in admins}
            
            # Attach admin users to managers for easy access in to_dict
            for manager in managers:
                if manager.last_update_by and manager.last_update_by in admin_users:
                    # Manually set the last_updater attribute
                    manager.last_updater = admin_users[manager.last_update_by]
            
            return {
                'success': True,
                'data': [manager.to_dict() for manager in managers],
                'message': 'Managers retrieved successfully'
            }
        except Exception as e:
            logger.error(f'Error getting managers: {e}', exc_info=True)
            return {
                'success': False,
                'data': None,
                'message': 'Failed to retrieve managers'
            }
    
    @staticmethod
    def create_manager(name, email,phone, password, created_by):
        """Create a new manager user"""
        try:
            # Check if user already exists in either table
            existing_user = User.query.filter_by(email=email).first()
            existing_customer = Customer.query.filter_by(phone=phone).first()
            if existing_user or existing_customer:
                return {
                    'success': False,
                    'data': None,
                    'message': 'User with this phone number already exists'
                }
            
            # Create new manager in customers table (like staff)
            manager = Customer(
                name=name,
                email=email,
                phone=phone,
                password_hash=generate_password_hash(password),
                role='manager',
                created_by=created_by
            )
            
            db.session.add(manager)
            db.session.commit()
            
            # Send welcome email with credentials (non-blocking background thread)
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
                            customer_id=manager.id,
                            password=password,  # Plain password - only sent once at creation
                            role='manager',  # Manager role - will include credentials and login link
                            login_url=login_url
                        )
                        logger.info(f'Welcome email sent to manager {email}')
                    except Exception as email_error:
                        # Don't fail manager creation if email fails
                        logger.error(f'Error sending welcome email to manager {email}: {email_error}')
            
            # Start email sending in background thread
            email_thread = threading.Thread(target=send_welcome_email_async, daemon=True)
            email_thread.start()
            logger.info(f'Welcome email sending started in background thread for manager {email}')
            
            return {
                'success': True,
                'data': manager.to_dict(),
                'message': 'Manager created successfully'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error creating manager: {e}')
            return {
                'success': False,
                'data': None,
                'message': 'Failed to create manager'
            }
    
    @staticmethod
    def update_manager(manager_id, name, email,phone, password, created_by, last_update_by=None):
        """Update manager details"""
        try:
            manager = Customer.query.get(manager_id)
            if not manager:
                return {
                    'success': False,
                    'data': None,
                    'message': 'Manager not found'
                }
            
            if manager.role != 'manager':
                return {
                    'success': False,
                    'data': None,
                    'message': 'User is not a manager'
                }
            
            # Check if email is already taken by another user
            existing_user = User.query.filter(User.email == email).first()
            existing_customer = Customer.query.filter(Customer.email == email, Customer.id != manager_id).first()
            if existing_user or existing_customer:
                return {
                    'success': False,
                    'data': None,
                    'message': 'Email already taken by another user'
                }
            
            manager.name = name
            manager.email = email
            manager.phone = phone
            if password is not None and password != '':
                manager.password_hash = generate_password_hash(password)
            if last_update_by:
                manager.last_update_by = last_update_by
            manager.updated_at = db.func.now()
            
            db.session.commit()
            
            return {
                'success': True,
                'data': manager.to_dict(),
                'message': 'Manager updated successfully'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating manager: {e}')
            return {
                'success': False,
                'data': None,
                'message': 'Failed to update manager'
            }
    
    @staticmethod
    def delete_manager(manager_id, created_by):
        """Delete a manager (soft delete by changing role)"""
        try:
            manager = Customer.query.get(manager_id)
            if not manager:
                return {
                    'success': False,
                    'data': None,
                    'message': 'Manager not found'
                }
            
            if manager.role != 'manager':
                return {
                    'success': False,
                    'data': None,
                    'message': 'User is not a manager'
                }
            
            # Before deleting, update all customers assigned to this manager
            # Set their assigned_manager_id to null so they are not affected
            assigned_customers = Customer.query.filter_by(assigned_manager_id=manager_id).all()
            if assigned_customers:
                for customer in assigned_customers:
                    customer.assigned_manager_id = None
                logger.info(f'Updated assigned_manager_id to null for {len(assigned_customers)} customers assigned to manager {manager_id}')
            
            # Soft delete by changing role to 'inactive'
            manager.role = 'inactive'
            manager.updated_at = db.func.now()
            
            # Also remove all permissions
            UserPermission.query.filter_by(user_id=manager_id).delete()
            
            db.session.commit()
            
            return {
                'success': True,
                'data': None,
                'message': 'Manager deleted successfully'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error deleting manager: {e}')
            return {
                'success': False,
                'data': None,
                'message': 'Failed to delete manager'
            }
    
    @staticmethod
    def toggle_manager_active(manager_id, is_active, last_update_by):
        """Toggle a manager's active status"""
        try:
            manager = Customer.query.get(manager_id)
            if not manager:
                return {
                    'success': False,
                    'message': 'Manager not found',
                    'data': None
                }
            
            if manager.role != 'manager':
                return {
                    'success': False,
                    'message': 'User is not a manager',
                    'data': None
                }
            
            manager.is_active = is_active
            manager.last_update_by = last_update_by
            db.session.commit()
            
            status_text = 'activated' if is_active else 'deactivated'
            return {
                'success': True,
                'message': f'Manager {status_text} successfully',
                'data': manager.to_dict()
            }
        except Exception as e:
            logger.error(f'Error toggling manager active status: {e}')
            db.session.rollback()
            return {
                'success': False,
                'message': 'Failed to toggle manager active status',
                'data': None
            }
    
    @staticmethod
    def get_manager_permissions(manager_id):
        """Get permissions for a specific manager"""
        try:
            permissions = UserPermission.query.filter_by(user_id=manager_id, user_type='customer').all()
            return {
                'success': True,
                'data': [permission.to_dict() for permission in permissions],
                'message': 'Permissions retrieved successfully'
            }
        except Exception as e:
            logger.error(f'Error getting manager permissions: {e}')
            return {
                'success': False,
                'data': None,
                'message': 'Failed to retrieve permissions'
            }
    
    @staticmethod
    def update_manager_permissions(manager_id, permissions_data, created_by, last_update_by=None):
        """Update permissions for a manager"""
        try:
            # First, delete existing permissions for this manager
            UserPermission.query.filter_by(user_id=manager_id, user_type='customer').delete()
            
            # Create new permissions
            for permission in permissions_data:
                user_permission = UserPermission(
                    user_id=manager_id,
                    user_type='customer',  # Managers are in customers table
                    module=permission['module'],
                    can_view=permission.get('can_view', False),
                    can_create=permission.get('can_create', False),
                    can_update=permission.get('can_update', False),
                    can_delete=permission.get('can_delete', False),
                    created_by=created_by,
                    last_update_by=last_update_by
                )
                db.session.add(user_permission)
            
            db.session.commit()
            
            return {
                'success': True,
                'data': None,
                'message': 'Permissions updated successfully'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating manager permissions: {e}')
            return {
                'success': False,
                'data': None,
                'message': 'Failed to update permissions'
            }
    
    @staticmethod
    def get_available_modules():
        """Get list of available modules for permission assignment"""
        return {
            'success': True,
            'data': [
                 {
                    'id': 'customers_management',
                    'name': 'Customers Management',
                    'description': 'Manage customers and their accounts',
                    'hide_create': False,
                    'hide_update': False,
                    'hide_delete': True
                },
                {
                    'id': 'customer_accounts',
                    'name': 'Customer Accounts',
                    'description': 'Manage customer accounts and their details',
                    'hide_create': False,
                    'hide_update': False,
                    'hide_delete': True  # Hide delete for customer accounts
                },
                {
                    'id': 'account_types',
                    'name': 'Account Types',
                    'description': 'Manage account types and their parameters',
                    'hide_create': True,
                    'hide_update': False,
                    'hide_delete': True
                },
                {
                    'id': 'transactions',
                    'name': 'Transactions',
                    'description': 'Manage transactions and their details',
                    'hide_create': False,  # Hide create for transactions
                    'hide_update': True,
                    'hide_delete': True   # Hide delete for transactions
                }
            ],
            'message': 'Available modules retrieved successfully'
        }
