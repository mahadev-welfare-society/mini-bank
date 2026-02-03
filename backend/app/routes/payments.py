from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.payment_controller import PaymentController

payment_bp = Blueprint('payments', __name__)

# Payment gateway routes
@payment_bp.route('/create-order', methods=['POST'])
@jwt_required()
def create_payment_order():
    """Create a Razorpay payment order"""
    return PaymentController.create_payment_order()

@payment_bp.route('/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    """Verify and process successful payment"""
    return PaymentController.verify_payment()

@payment_bp.route('/failure', methods=['POST'])
@jwt_required()
def handle_payment_failure():
    """Handle payment failure"""
    return PaymentController.handle_payment_failure()

