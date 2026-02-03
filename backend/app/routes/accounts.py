from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.account_controller import AccountController
from app.utils.decorators import manager_or_admin_required, admin_required

accounts_bp = Blueprint('accounts', __name__)

@accounts_bp.route('/', methods=['POST'])
@jwt_required()
def create_account():
    """Create new account for a customer (Admin/Manager) or apply for loan (Customer)"""
    return AccountController.create_account()

@accounts_bp.route('/list', methods=['POST'])
@jwt_required()
def get_accounts():
    """List accounts (role-based access)"""
    return AccountController.get_accounts()

@accounts_bp.route('/get/<int:account_id>', methods=['POST'])
@jwt_required()
def get_account(account_id):
    """View account details"""
    return AccountController.get_account(account_id)

@accounts_bp.route('/<int:account_id>/status', methods=['PUT'])
@jwt_required()
def update_account_status(account_id):
    """Close or update account status"""
    return AccountController.update_account_status(account_id)

@accounts_bp.route('/customer/<int:customer_id>', methods=['POST'])
@jwt_required()
def get_customer_accounts(customer_id):
    """Get all accounts for a specific customer"""
    return AccountController.get_customer_accounts(customer_id)

@accounts_bp.route('/<int:account_id>/transactions', methods=['POST'])
@jwt_required()
def get_account_transactions(account_id):
    """Get transactions for a specific account"""
    from app.controllers.transaction_controller import TransactionController
    return TransactionController.get_account_transactions(account_id)

@accounts_bp.route('/<int:account_id>/interest-rate', methods=['PUT'])
@admin_required
def update_account_interest_rate(account_id):
    """Update interest rate for a specific account (Admin only)"""
    from app.controllers.account_controller import AccountController
    return AccountController.update_account_interest_rate(account_id)

@accounts_bp.route('/account-type/<int:account_type_id>/bulk-update-interest-rate', methods=['PUT'])
@admin_required
def bulk_update_account_type_interest_rate(account_type_id):
    """Bulk update interest rate for all accounts of a type (Admin only)"""
    from app.controllers.account_controller import AccountController
    return AccountController.bulk_update_account_type_interest_rate(account_type_id)

@accounts_bp.route('/<int:account_id>/parameter-history', methods=['POST'])
@admin_required
def get_account_parameter_history(account_id):
    """Get parameter update history for an account (Admin only)"""
    from app.controllers.account_controller import AccountController
    return AccountController.get_account_parameter_history(account_id)

@accounts_bp.route('/<int:account_id>/emi-schedule', methods=['POST'])
@jwt_required()
def get_emi_schedule(account_id):
    """Get EMI schedule for a loan account"""
    from app.controllers.account_controller import AccountController
    return AccountController.get_emi_schedule(account_id)

@accounts_bp.route('/<int:account_id>/break', methods=['POST'])
@jwt_required()
@manager_or_admin_required
def break_account(account_id):
    """Break FD/RD/DDS account and transfer balance to Savings (Admin/Manager only)"""
    from app.controllers.account_controller import AccountController
    return AccountController.break_account(account_id)
