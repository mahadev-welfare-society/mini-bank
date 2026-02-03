from app import db

class RDInstallment(db.Model):
    __tablename__ = 'rd_installments'

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    deposit_date = db.Column(db.Date, nullable=False)
