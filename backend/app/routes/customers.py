from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.customer_controller import CustomerController
from app.utils.decorators import manager_or_admin_required

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def create_customer():
    """Create a new staff/customer (admin/manager only)"""
    return CustomerController.create_customer()

@customers_bp.route('/list', methods=['POST'])
@jwt_required()
def get_customers():
    """Get all customers (role-based access)"""
    return CustomerController.get_customers()

@customers_bp.route('/me', methods=['POST'])
@jwt_required()
def get_me():
    """Get current user's own information (for staff)"""
    return CustomerController.get_me()

@customers_bp.route('/get/<int:customer_id>', methods=['POST'])
@jwt_required()
def get_customer(customer_id):
    """Get a specific customer"""
    return CustomerController.get_customer(customer_id)

@customers_bp.route('/<int:customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    """Update a customer"""
    return CustomerController.update_customer(customer_id)

@customers_bp.route('/<int:customer_id>/toggle-active', methods=['PATCH'])
@jwt_required()
def toggle_customer_active(customer_id):
    """Toggle a customer's active status"""
    from flask import request
    data = request.get_json() or {}
    is_active = data.get('is_active', True)
    return CustomerController.toggle_customer_active(customer_id, is_active)

@customers_bp.route('/<int:customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    """Delete a customer"""
    return CustomerController.delete_customer(customer_id)
