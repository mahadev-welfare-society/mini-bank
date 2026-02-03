from datetime import date
from calendar import monthrange
from app import db
from app.models import Account, AccountType, RDInstallment, AccountInterestLog


def days_in_year(year):
    return 366 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 365


def calculate_rd_monthly_interest():
    today = date.today()

    # Only run safely on month start (extra protection)
    if today.day != 30:
        return

    # We calculate interest for the PREVIOUS month
    year = today.year
    month = today.month - 1 or 12
    if month == 12:
        year -= 1

    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    accounts = (
        db.session.query(Account)
        .join(AccountType, Account.account_type)
        .filter(
            Account.status == 'active',
            AccountType.name.ilike('RD%')
        )
        .all()
    )

    print(f"Processing RD interest for {len(accounts)} accounts")

    for account in accounts:
        interest_rate = account.get_effective_interest_rate()
        print(interest_rate,'intrest_rate')
        if not interest_rate or interest_rate <= 0:
            continue

        year_days = days_in_year(year)
        daily_rate = (interest_rate / 100) / year_days

        total_interest = 0

        # Fetch installments deposited up to month end
        installments = (
            db.session.query(RDInstallment)
            .filter(
                RDInstallment.account_id == account.id,
                # RDInstallment.deposit_date <= month_end
            )
            .all()
        )
        print('fgfdsdfghgfdsdfgh')
        for inst in installments:
            deposit_date = inst.deposit_date

            # Interest starts from deposit date or month start
            interest_start = max(deposit_date, month_start)

            # Days the installment earned interest in that month
            days = (month_end - interest_start).days + 1
            print(days,'days')
            if days <= 0:
                continue

            interest = inst.amount * daily_rate * days
            total_interest += interest
            print(total_interest,'total_intrest')
        if total_interest <= 0:
            continue

        total_interest = round(total_interest, 2)
        balance_before = account.balance

        # RD interest credited once per month
        # account.balance += total_interest
        account.last_interest_calculated_date = month_end

        log = AccountInterestLog(
            account_id=account.id,
            interest_amount=total_interest,
            balance_before=balance_before,
            balance_after=account.balance,
            calculated_date=month_end
        )

        db.session.add(log)

        print(
            f"RD Account {account.id} | "
            f"Interest Added: {total_interest}"
        )

    db.session.commit()

# app/services/rd_interest.py

def calculate_rd_future_interest(monthly_installment, remaining_months, annual_rate):
    """
    Calculate future interest that would have been earned
    from next month till maturity.
    """
    if remaining_months <= 0 or monthly_installment <= 0:
        return 0.0

    monthly_rate = (annual_rate / 100) / 12
    future_interest = 0.0

    for month in range(remaining_months):
        months_left = remaining_months - month
        interest = monthly_installment * monthly_rate * months_left
        future_interest += interest

    return round(future_interest, 2)
