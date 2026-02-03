from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.user_management_service import UserManagementService
from app.utils.decorators import admin_required
import logging
import re
logger = logging.getLogger(__name__)

class UserManagementController:
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        return bool(re.match(email_regex, email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate that phone contains exactly 10 digits"""
        digits_only = re.sub(r'\D', '', phone)  # Remove all non-digit characters
        return len(digits_only) == 10
    
    @staticmethod
    @admin_required
    def get_all_managers():
        """Get all managers (Admin only)"""
        try:
            return UserManagementService.get_all_managers()
        except Exception as e:
            logger.error(f'Error in get_all_managers controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve managers',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def create_manager():
        """Create a new manager (Admin only)"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            if data.get('email') is not None and data.get('email') != '':
                if not UserManagementController.validate_email(data.get('email')):
                    return {
                        'success': False,
                        'message': 'Invalid email address',
                        'data': None
                    }, 400
            # Validate required fields
            required_fields = ['name', 'phone', 'password']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            result = UserManagementService.create_manager(
                name=data['name'],
                email=data['email'],
                phone=data['phone'],
                password=data['password'],
                created_by=current_user_id
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in create_manager controller: {e}')
            return {
                'success': False,
                'message': 'Failed to create manager',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def update_manager(manager_id):
        """Update manager details (Admin only)"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            if data.get('email') is not None and data.get('email') != '':
                if not UserManagementController.validate_email(data.get('email')):
                    return {
                        'success': False,
                        'message': 'Invalid email address',
                        'data': None
                    }, 400

            if data.get('password') is not None and data.get('password') != '':
                if not UserManagementController.validate_password(data.get('password')):
                    return {
                        'success': False,
                        'message': 'Password must be at least 8 characters long',
                        'data': None
                    }, 400

            # Validate required fields
            required_fields = ['name', 'email', 'phone']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            # Validate phone format
            if data.get('phone') and not UserManagementController.validate_phone(data.get('phone')):
                return {
                    'success': False,
                    'message': 'Invalid phone number. Phone must contain exactly 10 digits',
                        'data': None
                    }, 400
            
            # Get current admin user ID for last_update_by (since it references users.id)
            # Only admins can update managers, so current_user_id should be an admin
            from app.models import User
            try:
                current_user_id_int = int(current_user_id)
                admin_user = User.query.get(current_user_id_int)
                if admin_user and admin_user.role == 'admin':
                    last_update_by = admin_user.id
                else:
                    # Fallback: find any admin user
                    admin_user = User.query.filter_by(role='admin').first()
                    last_update_by = admin_user.id if admin_user else None
            except (ValueError, TypeError):
                # Fallback: find any admin user
                admin_user = User.query.filter_by(role='admin').first()
                last_update_by = admin_user.id if admin_user else None
            
            result = UserManagementService.update_manager(
                manager_id=manager_id,
                name=data['name'],
                email=data['email'],
                phone=data.get('phone') or '',
                password=data.get('password'),
                created_by=current_user_id,
                last_update_by=last_update_by
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_manager controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update manager',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def delete_manager(manager_id):
        """Delete manager (Admin only)"""
        try:
            current_user_id = get_jwt_identity()
            
            result = UserManagementService.delete_manager(
                manager_id=manager_id,
                created_by=current_user_id
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in delete_manager controller: {e}')
            return {
                'success': False,
                'message': 'Failed to delete manager',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def toggle_manager_active(manager_id, is_active):
        """Handle manager active status toggle"""
        try:
            # Get current admin user ID for last_update_by (since it references users.id)
            # Only admins can toggle manager status, so current_user_id should be an admin
            current_user_id = get_jwt_identity()
            from app.models import User
            try:
                current_user_id_int = int(current_user_id)
                admin_user = User.query.get(current_user_id_int)
                if admin_user and admin_user.role == 'admin':
                    last_update_by = admin_user.id
                else:
                    # Fallback: find any admin user
                    admin_user = User.query.filter_by(role='admin').first()
                    last_update_by = admin_user.id if admin_user else None
            except (ValueError, TypeError):
                # Fallback: find any admin user
                admin_user = User.query.filter_by(role='admin').first()
                last_update_by = admin_user.id if admin_user else None
            
            result = UserManagementService.toggle_manager_active(manager_id, is_active, last_update_by)
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in toggle_manager_active controller: {e}')
            return {
                'success': False,
                'message': 'Failed to toggle manager active status',
                'data': None
            }, 500
    
    @staticmethod
    def get_manager_permissions(manager_id):
        """Get manager permissions (Admin can view any, Manager can view own)"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = UserManagementService.get_user_role_and_id(current_user_id)
            
            # Admin can view any manager's permissions
            if user_role == 'admin':
                return UserManagementService.get_manager_permissions(manager_id)
            
            # Manager can only view their own permissions
            elif user_role == 'manager' and user_id == manager_id:
                return UserManagementService.get_manager_permissions(manager_id)
            
            # Staff or unauthorized access
            else:
                return {
                    'success': False,
                    'message': 'Access denied. You can only view your own permissions.',
                    'data': None
                }, 403
                
        except Exception as e:
            logger.error(f'Error in get_manager_permissions controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve permissions',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def update_manager_permissions(manager_id):
        """Update manager permissions (Admin only)"""
        try:
            data = request.get_json()
            current_user_id = get_jwt_identity()
            
            if not data.get('permissions'):
                return {
                    'success': False,
                    'message': 'Permissions data is required',
                    'data': None
                }, 400
            
            # Get current admin user ID for last_update_by (since it references users.id)
            # Only admins can update permissions, so current_user_id should be an admin
            from app.models import User
            try:
                current_user_id_int = int(current_user_id)
                admin_user = User.query.get(current_user_id_int)
                if admin_user and admin_user.role == 'admin':
                    last_update_by = admin_user.id
                else:
                    # Fallback: find any admin user
                    admin_user = User.query.filter_by(role='admin').first()
                    last_update_by = admin_user.id if admin_user else None
            except (ValueError, TypeError):
                # Fallback: find any admin user
                admin_user = User.query.filter_by(role='admin').first()
                last_update_by = admin_user.id if admin_user else None
            
            result = UserManagementService.update_manager_permissions(
                manager_id=manager_id,
                permissions_data=data['permissions'],
                created_by=current_user_id,
                last_update_by=last_update_by
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_manager_permissions controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update permissions',
                'data': None
            }, 500
    
    @staticmethod
    @admin_required
    def get_available_modules():
        """Get available modules for permission assignment (Admin only)"""
        try:
            return UserManagementService.get_available_modules()
        except Exception as e:
            logger.error(f'Error in get_available_modules controller: {e}')
            return {
                'success': False,
                'message': 'Failed to retrieve modules',
                'data': None
            }, 500
