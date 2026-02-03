from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.auth_controller import AuthController
from app.utils.decorators import admin_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@jwt_required()
@admin_required
def register():
    """Register a new user (admin only)"""
    return AuthController.register()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    return AuthController.login()

@auth_bp.route('/profile/get', methods=['POST'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    return AuthController.get_profile()

@auth_bp.route('/profile', methods=['PUT', 'PATCH'])
@jwt_required()
def update_profile():
    """Update current user profile"""
    return AuthController.update_profile()
