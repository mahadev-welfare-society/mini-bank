from flask import request, jsonify
from app.services.interest_log_service import get_interest_logs_service

def get_interest_logs_controller():
    """
    Optional query params:
      - customer_id
      - account_id
      - start_date (yyyy-mm-dd)
      - end_date (yyyy-mm-dd)
    """
    account_id = request.args.get('account_id', type=int)
    start_date = request.args.get('start_date')  # yyyy-mm-dd
    end_date = request.args.get('end_date')

    # Pass arguments by name to avoid positional mismatch
    logs = get_interest_logs_service(
        account_id=account_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return jsonify({"logs": logs, "count": len(logs)})
