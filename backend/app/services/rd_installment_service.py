from app import db
from app.models import RDInstallment

class RDInstallmentService:
    @staticmethod
    def create_rd_installment(account_id, amount, deposit_date):
        rd_installment = RDInstallment(
            account_id=account_id,
            amount=amount,
            deposit_date=deposit_date
        )
        db.session.add(rd_installment)
        db.session.commit()
        return rd_installment