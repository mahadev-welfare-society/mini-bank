from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from app.services.dashboard_service import DashboardService
from app.services.customer_service import CustomerService
import logging

logger = logging.getLogger(__name__)

class DashboardController:
    @staticmethod
    def get_dashboard_data():
        """Get dashboard data based on user role"""
        try:
            current_user_id = get_jwt_identity()
            user_role, user_id = CustomerService.get_user_role_and_id(current_user_id)
            
            if not user_role:
                return jsonify({
                    'success': False,
                    'message': 'User not found',
                    'data': None
                }), 404
            
            result = DashboardService.get_dashboard_data(user_role, user_id)
            
            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify(result), 400
                
        except Exception as e:
            logger.error(f'Error in dashboard controller: {e}')
            return jsonify({
                'success': False,
                'message': 'Failed to get dashboard data',
                'data': None
            }), 500
