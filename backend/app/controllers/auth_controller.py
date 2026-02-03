from flask import request
from flask_jwt_extended import get_jwt_identity
from app.services.auth_service import AuthService
import logging

logger = logging.getLogger(__name__)

class AuthController:
    @staticmethod
    def register():
        """Handle user registration"""
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['name', 'email', 'password']
            for field in required_fields:
                if not data.get(field):
                    return {
                        'success': False,
                        'message': f'{field} is required',
                        'data': None
                    }, 400
            
            # Get optional role (defaults to 'staff')
            role = data.get('role', 'staff')
            
            # Validate role
            valid_roles = ['admin', 'manager', 'staff']
            if role not in valid_roles:
                return {
                    'success': False,
                    'message': 'Invalid role. Must be admin, manager, or staff',
                    'data': None
                }, 400
            
            result = AuthService.register_user(
                name=data['name'],
                email=data['email'],
                password=data['password'],
                role=role
            )
            
            status_code = 201 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in register controller: {e}')
            return {
                'success': False,
                'message': 'Registration failed',
                'data': None
            }, 500
    
    @staticmethod
    def login():
        """Handle user login"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('email') or not data.get('password'):
                return {
                    'success': False,
                    'message': 'Email and password are required',
                    'data': None
                }, 400
            
            result = AuthService.login_user(
                email=data['email'],
                password=data['password']
            )
            
            status_code = 200 if result['success'] else 401
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in login controller: {e}')
            return {
                'success': False,
                'message': 'Login failed',
                'data': None
            }, 500
    
    @staticmethod
    def get_profile():
        """Get current user profile"""
        try:
            current_user_id = get_jwt_identity()
            result = AuthService.get_user_profile(current_user_id)
            
            status_code = 200 if result['success'] else 404
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in get_profile controller: {e}')
            return {
                'success': False,
                'message': 'Failed to get profile',
                'data': None
            }, 500
    
    @staticmethod
    def update_profile():
        """Update current user profile"""
        try:
            current_user_id = get_jwt_identity()
            data = request.get_json()
            
            # Only allow updating name, phone, and address (email cannot be changed)
            result = AuthService.update_profile(
                user_id=current_user_id,
                name=data.get('name'),
                phone=data.get('phone'),
                address=data.get('address')
            )
            
            status_code = 200 if result['success'] else 400
            return result, status_code
            
        except Exception as e:
            logger.error(f'Error in update_profile controller: {e}')
            return {
                'success': False,
                'message': 'Failed to update profile',
                'data': None
            }, 500