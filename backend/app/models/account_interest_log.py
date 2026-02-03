from app import db

class AccountInterestLog(db.Model):
    __tablename__ = "account_interest_logs"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    interest_amount = db.Column(db.Numeric(12, 2), nullable=False)
    balance_before = db.Column(db.Numeric(12, 2), nullable=False)
    balance_after = db.Column(db.Numeric(12, 2), nullable=False)
    calculated_date = db.Column(db.Date, nullable=False)  # The date the interest is applied
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # <-- add this relationship
    account = db.relationship("Account", backref="interest_logs", lazy="joined")