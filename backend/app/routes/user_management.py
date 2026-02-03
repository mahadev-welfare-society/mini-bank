from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.user_management_controller import UserManagementController

user_management_bp = Blueprint('user_management', __name__)

# Manager management routes
@user_management_bp.route('/managers', methods=['POST'])
@jwt_required()
def get_all_managers():
    """Get all managers (Admin only)"""
    return UserManagementController.get_all_managers()

@user_management_bp.route('/managers/create', methods=['POST'])
@jwt_required()
def create_manager():
    """Create a new manager (Admin only)"""
    return UserManagementController.create_manager()

@user_management_bp.route('/managers/<int:manager_id>', methods=['PUT'])
@jwt_required()
def update_manager(manager_id):
    """Update manager details (Admin only)"""
    return UserManagementController.update_manager(manager_id)

@user_management_bp.route('/managers/<int:manager_id>', methods=['DELETE'])
@jwt_required()
def delete_manager(manager_id):
    """Delete manager (Admin only)"""
    return UserManagementController.delete_manager(manager_id)

@user_management_bp.route('/managers/<int:manager_id>/toggle-active', methods=['PATCH'])
@jwt_required()
def toggle_manager_active(manager_id):
    """Toggle a manager's active status"""
    from flask import request
    data = request.get_json() or {}
    is_active = data.get('is_active', True)
    return UserManagementController.toggle_manager_active(manager_id, is_active)

# Permission management routes
@user_management_bp.route('/managers/<int:manager_id>/permissions', methods=['POST'])
@jwt_required()
def get_manager_permissions(manager_id):
    """Get manager permissions (Admin only)"""
    return UserManagementController.get_manager_permissions(manager_id)

@user_management_bp.route('/managers/<int:manager_id>/permissions', methods=['PUT'])
@jwt_required()
def update_manager_permissions(manager_id):
    """Update manager permissions (Admin only)"""
    return UserManagementController.update_manager_permissions(manager_id)

@user_management_bp.route('/modules', methods=['POST'])
@jwt_required()
def get_available_modules():
    """Get available modules for permission assignment (Admin only)"""
    return UserManagementController.get_available_modules()
