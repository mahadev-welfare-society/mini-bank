from flask import Blueprint
from app.controllers.interest_log_controller import get_interest_logs_controller

interest_log_bp = Blueprint('interest_log_bp', __name__)

# Route: /api/admin/interest-logs
interest_log_bp.add_url_rule('/', 'get_interest_logs', get_interest_logs_controller, methods=['GET'])
