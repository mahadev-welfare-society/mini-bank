from app import db
from app.models import AccountInterestLog, Account

def get_interest_logs_service(account_id=None, start_date=None, end_date=None):
    query = db.session.query(AccountInterestLog).join(Account)

    # Filter by account_id
    if account_id:
        query = query.filter(AccountInterestLog.account_id == account_id)

    if start_date:
        query = query.filter(AccountInterestLog.calculated_date >= start_date)
    if end_date:
        query = query.filter(AccountInterestLog.calculated_date <= end_date)

    logs = query.order_by(AccountInterestLog.calculated_date.desc()).all()

    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "account_id": log.account_id,
            "account_type": log.account.account_type.name if log.account.account_type else None,
            "customer_name": log.account.customer.name if log.account.customer else None,
            "interest_amount": float(log.interest_amount),
            "balance_before": float(log.balance_before),
            "balance_after": float(log.balance_after),
            "calculated_date": log.calculated_date.isoformat(),
        })

    return result
