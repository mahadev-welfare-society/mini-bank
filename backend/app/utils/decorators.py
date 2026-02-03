from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Customer

def role_required(required_roles):
    """Decorator to check if user has required role - checks both users and customers tables"""
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = get_jwt_identity()
            
            # First check users table (for admin)
            user = User.query.get(current_user_id)
            if user and user.role in required_roles:
                return f(*args, **kwargs)
            
            # If not found in users table, check customers table (for staff/manager)
            customer = Customer.query.get(current_user_id)
            if customer and customer.role in required_roles:
                return f(*args, **kwargs)
            
            # If neither found or role doesn't match
            return jsonify({
                'success': False,
                'message': 'Insufficient permissions',
                'data': None
            }), 403
            
        return decorated_function
    return decorator

def admin_required(f):
    """Decorator to require admin role"""
    return role_required(['admin'])(f)

def manager_required(f):
    """Decorator to require manager role"""
    return role_required(['manager'])(f)

def manager_or_admin_required(f):
    """Decorator to require manager or admin role"""
    return role_required(['admin', 'manager'])(f)
