from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.transaction_controller import TransactionController
from app.services.payment_simulation_service import PaymentSimulationService
from app.utils.decorators import admin_required

transaction_bp = Blueprint('transactions', __name__)

# Transaction management routes
@transaction_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    """Create a new transaction"""
    return TransactionController.create_transaction()

@transaction_bp.route('/edit-request', methods=['POST'])
@jwt_required()
def create_edit_request():
    """Create a transaction edit request (Staff/User)"""
    return TransactionController.create_edit_request()

@transaction_bp.route('/edit-requests/pending', methods=['POST'])
@jwt_required()
@admin_required
def get_pending_edit_requests():
    """Get all pending edit requests (Admin only)"""
    return TransactionController.get_pending_edit_requests()

@transaction_bp.route('/edit-requests/my-requests', methods=['POST'])
@jwt_required()
def get_my_edit_requests():
    """Get edit requests created by current user (Manager/Staff)"""
    return TransactionController.get_my_edit_requests()

@transaction_bp.route('/edit-requests/<int:request_id>/approve', methods=['POST'])
@jwt_required()
@admin_required
def approve_edit_request(request_id):
    """Approve edit request and update transaction (Admin only)"""
    return TransactionController.approve_edit_request(request_id)

@transaction_bp.route('/edit-requests/<int:request_id>/reject', methods=['POST'])
@jwt_required()
@admin_required
def reject_edit_request(request_id):
    """Reject edit request (Admin only)"""
    return TransactionController.reject_edit_request(request_id)

@transaction_bp.route('/<int:transaction_id>/direct-edit', methods=['PUT'])
@jwt_required()
@admin_required
def direct_edit_transaction(transaction_id):
    """Directly edit transaction (Admin only)"""
    return TransactionController.direct_edit_transaction(transaction_id)

@transaction_bp.route('/<int:transaction_id>/edit-history', methods=['POST'])
@jwt_required()
def get_transaction_edit_history(transaction_id):
    """Get edit history for a transaction"""
    return TransactionController.get_transaction_edit_history(transaction_id)

@transaction_bp.route('/list', methods=['POST'])
@jwt_required()
def get_all_transactions():
    """Get all transactions (Admin/Manager only)"""
    return TransactionController.get_all_transactions()

@transaction_bp.route('/summary', methods=['POST'])
@jwt_required()
def get_transaction_summary():
    """Get transaction summary statistics"""
    return TransactionController.get_transaction_summary()


@transaction_bp.route('/loan-repayment', methods=['POST'])
@jwt_required()
def process_loan_repayment():
    """Process loan repayment"""
    return TransactionController.process_loan_repayment()

@transaction_bp.route('/calculate-interest', methods=['POST'])
@jwt_required()
def calculate_interest():
    """Calculate and apply interest for Savings, RD, and FD accounts"""
    return TransactionController.calculate_interest()

@transaction_bp.route('/bulk-calculate-interest-savings', methods=['POST'])
@jwt_required()
def bulk_calculate_interest_savings():
    """Bulk calculate interest for all Savings accounts (Admin/Manager only)"""
    return TransactionController.bulk_calculate_interest_savings()

# Payment simulation routes (for testing without payment gateway)
@transaction_bp.route('/simulate-deposit', methods=['POST'])
@jwt_required()
def simulate_deposit():
    """Simulate a deposit transaction"""
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    from app.services.customer_service import CustomerService
    
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
        
        if 'account_id' not in data or 'amount' not in data:
            return {
                'success': False,
                'message': 'Missing required fields: account_id and amount',
                'data': None
            }, 400
        
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return {
                    'success': False,
                    'message': 'Amount must be positive',
                    'data': None
                }, 400
        except (ValueError, TypeError):
            return {
                'success': False,
                'message': 'Invalid amount format',
                'data': None
            }, 400
        
        result = PaymentSimulationService.simulate_deposit(
            account_id=data['account_id'],
            amount=amount,
            description=data.get('description', ''),
            created_by=user_id
        )
        
        status_code = 201 if result['success'] else 400
        return result, status_code
        
    except Exception as e:
        return {
            'success': False,
            'message': 'Failed to simulate deposit',
            'data': None
        }, 500

@transaction_bp.route('/simulate-withdrawal', methods=['POST'])
@jwt_required()
def simulate_withdrawal():
    """Simulate a withdrawal transaction"""
    from flask import request
    from flask_jwt_extended import get_jwt_identity
    from app.services.customer_service import CustomerService
    
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
        
        if 'account_id' not in data or 'amount' not in data:
            return {
                'success': False,
                'message': 'Missing required fields: account_id and amount',
                'data': None
            }, 400
        
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return {
                    'success': False,
                    'message': 'Amount must be positive',
                    'data': None
                }, 400
        except (ValueError, TypeError):
            return {
                'success': False,
                'message': 'Invalid amount format',
                'data': None
            }, 400
        
        result = PaymentSimulationService.simulate_withdrawal(
            account_id=data['account_id'],
            amount=amount,
            description=data.get('description', ''),
            created_by=user_id
        )
        
        status_code = 201 if result['success'] else 400
        return result, status_code
        
    except Exception as e:
        return {
            'success': False,
            'message': 'Failed to simulate withdrawal',
            'data': None
        }, 500
