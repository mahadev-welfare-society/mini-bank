from flask import Blueprint
from flask_jwt_extended import jwt_required
from app.controllers.dashboard_controller import DashboardController

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/', methods=['POST'])
@jwt_required()
def get_dashboard_data():
    """Get dashboard data based on user role"""
    return DashboardController.get_dashboard_data()
