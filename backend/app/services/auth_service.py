from app import db
from app.models import User, Customer
from flask_jwt_extended import create_access_token
import logging

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    def register_user(name, email, password, role='staff'):
        """Register a new user"""
        try:
            # Check if user already exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return {
                    'success': False,
                    'message': 'User with this email already exists',
                    'data': None
                }
            
            # Create new user
            user = User(
                name=name,
                email=email,
                role=role
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f'User registered: {email}')
            
            return {
                'success': True,
                'message': 'User registered successfully',
                'data': user.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error registering user: {e}')
            return {
                'success': False,
                'message': 'Failed to register user',
                'data': None
            }
    
    @staticmethod
    def login_user(email, password):
        """Authenticate user and return JWT token - checks both users and customers tables"""
        try:
            # First check users table (for admin)
            user = User.query.filter_by(email=email).first()
            if user and user.check_password(password):
                # Create JWT token for admin
                access_token = create_access_token(identity=str(user.id))
                logger.info(f'Admin user logged in: {email}')
                return {
                    'success': True,
                    'message': 'Login successful',
                    'data': {
                        'access_token': access_token,
                        'user': user.to_dict()
                    }
                }
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.filter_by(email=email).first()
            if customer:
                # If customer role is staff, directly return "user not found"
                if customer.role == 'staff':
                    return {
                        'success': False,
                        'message': 'Invalid email or password',
                        'data': None
                    }
                
                # For manager, check password
                if customer.role == 'manager':
                    if customer.check_password(password):
                        # Create JWT token for manager
                        access_token = create_access_token(identity=str(customer.id))
                        logger.info(f'Manager logged in: {email}')
                        return {
                            'success': True,
                            'message': 'Login successful',
                            'data': {
                                'access_token': access_token,
                                'user': customer.to_dict()
                            }
                        }
                    else:
                        # Wrong password for manager - return "user not exist"
                        return {
                            'success': False,
                            'message': 'Invalid email or password',
                            'data': None
                        }
            
            # If neither found or password doesn't match
            return {
                'success': False,
                'message': 'Invalid email or password',
                'data': None
            }
            
        except Exception as e:
            logger.error(f'Error during login: {e}')
            return {
                'success': False,
                'message': 'Login failed',
                'data': None
            }
    
    @staticmethod
    def get_user_profile(user_id):
        """Get user profile by ID - checks both users and customers tables"""
        try:
            # Convert string ID to integer for database query
            user_id_int = int(user_id)
            
            # First check users table (for admin)
            user = User.query.get(user_id_int)
            if user:
                return {
                    'success': True,
                    'message': 'Profile retrieved successfully',
                    'data': user.to_dict()
                }
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.get(user_id_int)
            if customer:
                return {
                    'success': True,
                    'message': 'Profile retrieved successfully',
                    'data': customer.to_dict()
                }
            
            # If neither found
            return {
                'success': False,
                'message': 'User not found',
                'data': None
            }
            
        except (ValueError, TypeError) as e:
            logger.error(f'Invalid user ID format: {e}')
            return {
                'success': False,
                'message': 'Invalid user ID',
                'data': None
            }
        except Exception as e:
            logger.error(f'Error getting user profile: {e}')
            return {
                'success': False,
                'message': 'Failed to get profile',
                'data': None
            }
    
    @staticmethod
    def update_profile(user_id, name=None, phone=None, address=None):
        """
        Update user profile (name, phone, address) - email cannot be changed
        Works for both User (admin) and Customer (staff/manager)
        """
        try:
            user_id_int = int(user_id)
            
            # First check users table (for admin)
            user = User.query.get(user_id_int)
            if user:
                if name is not None:
                    user.name = name
                # Note: phone and address are not in User model, so we skip them
                db.session.commit()
                logger.info(f'Admin profile updated: {user.email}')
                return {
                    'success': True,
                    'message': 'Profile updated successfully',
                    'data': user.to_dict()
                }
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.get(user_id_int)
            if customer:
                if name is not None:
                    customer.name = name
                if phone is not None:
                    customer.phone = phone
                if address is not None:
                    customer.address = address
                db.session.commit()
                logger.info(f'Customer profile updated: {customer.email}')
                return {
                    'success': True,
                    'message': 'Profile updated successfully',
                    'data': customer.to_dict()
                }
            
            # If neither found
            return {
                'success': False,
                'message': 'User not found',
                'data': None
            }
            
        except (ValueError, TypeError) as e:
            logger.error(f'Invalid user ID format: {e}')
            return {
                'success': False,
                'message': 'Invalid user ID',
                'data': None
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating profile: {e}')
            return {
                'success': False,
                'message': 'Failed to update profile',
                'data': None
            }