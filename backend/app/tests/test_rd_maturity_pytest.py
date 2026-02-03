import pytest
from datetime import date
from app.models import Account, RDInstallment
from app.services.premature_account_service import calculate_rd_maturity

# Dummy Account class (if you want to avoid DB)
class DummyAccount:
    def __init__(self, start_date, maturity_date, balance, installments, rate):
        self.start_date = start_date
        self.maturity_date = maturity_date
        self.balance = balance
        self.id = 1
        self.get_effective_interest_rate = lambda: rate
        self.installments = installments

class DummyInstallment:
    def __init__(self, amount):
        self.amount = amount

# Patch RDInstallment.query to return dummy data
class DummyQuery:
    def __init__(self, installments):
        self._installments = installments
    def filter_by(self, **kwargs):
        return self
    def order_by(self, *args):
        return self
    def all(self):
        return self._installments

@pytest.fixture
def dummy_account():
    installments = [DummyInstallment(amount=1000) for _ in range(5)]
    
    # Patch RDInstallment.query
    from app.services import premature_account_service
    premature_account_service.RDInstallment.query = DummyQuery(installments)

    account = DummyAccount(
        start_date=date(2025, 1, 1),
        maturity_date=date(2025, 6, 1),
        balance=sum(i.amount for i in installments),
        installments=installments,
        rate=12.0
    )
    return account

def test_rd_maturity(dummy_account):
    result = calculate_rd_maturity(dummy_account)
    assert result['principal'] == 5000
    assert result['interest_earned'] > 0
    assert result['transfer_amount'] == result['principal'] + result['interest_earned']
    print("RD Maturity Test Result:", result)
