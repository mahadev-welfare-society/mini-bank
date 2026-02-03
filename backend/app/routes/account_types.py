from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.controllers.account_type_controller import AccountTypeController
from app.utils.decorators import manager_or_admin_required

account_types_bp = Blueprint('account_types', __name__)

@account_types_bp.route('/', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def create_account_type():
    """Create a new account type (Admin/Manager only)"""
    return AccountTypeController.create_account_type()

@account_types_bp.route('/list', methods=['POST'])
@jwt_required()
def get_account_types():
    """Get all account types (All roles)"""
    return AccountTypeController.get_account_types()

@account_types_bp.route('/get/<int:account_type_id>', methods=['POST'])
@jwt_required()
def get_account_type(account_type_id):
    """Get a specific account type"""
    return AccountTypeController.get_account_type(account_type_id)

@account_types_bp.route('/<int:account_type_id>', methods=['PUT'])
@jwt_required()
@manager_or_admin_required
def update_account_type(account_type_id):
    """Update account type details (Admin/Manager only)"""
    return AccountTypeController.update_account_type(account_type_id)

@account_types_bp.route('/<int:account_type_id>', methods=['DELETE'])
@jwt_required()
@manager_or_admin_required
def delete_account_type(account_type_id):
    """Deactivate account type (Admin/Manager only)"""
    return AccountTypeController.delete_account_type(account_type_id)


@account_types_bp.route('/validate-transaction', methods=['POST'])
@jwt_required()
def validate_transaction():
    """Validate transaction based on account type rules (All roles)"""
    return AccountTypeController.validate_transaction()

@account_types_bp.route('/calculate-maturity', methods=['POST'])
@jwt_required()
def calculate_maturity():
    """Calculate maturity amount for RD/FD/DDS accounts (All roles)"""
    return AccountTypeController.calculate_maturity()

@account_types_bp.route('/interest-history/<int:account_type_id>', methods=['POST'])
@jwt_required()
def get_interest_history(account_type_id):
    """Get interest rate change history for an account type"""
    return AccountTypeController.get_interest_history(account_type_id)

@account_types_bp.route('/document', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def get_document():
    """Serve document file for viewing/downloading"""
    if request.method == 'OPTIONS':
        # Handle CORS preflight (no auth required)
        return AccountTypeController.handle_options()
    # Require JWT for actual file requests - check manually
    from flask_jwt_extended import get_jwt_identity
    if not get_jwt_identity():
        from flask import jsonify
        return jsonify({'success': False, 'message': 'Authorization required'}), 401
    return AccountTypeController.get_document()
