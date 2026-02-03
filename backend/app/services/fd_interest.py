from datetime import date, timedelta
from app import db
from app.models import Account, AccountType, AccountInterestLog
from sqlalchemy.orm import joinedload


def days_in_year(year):
    return 366 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 365


def calculate_fd_interest():
    today = date.today()

    accounts = (
        db.session.query(Account)
        .options(joinedload(Account.account_type))
        .join(AccountType)
        .filter(
            Account.status == 'active',
            AccountType.name.ilike('FD%'),
            Account.start_date <= today
        )
        .all()
    )

    for account in accounts:
        principal = account.balance
        interest_rate = account.get_effective_interest_rate()  # Implement this in Account model

        print("Processing account:", account.id, account.account_type.name)

        if not principal or not interest_rate:
            print(f"Skipping account {account.id}: missing principal or interest rate")
            continue

        # Determine start date based on last calculation
        last_date = account.last_interest_calculated_date
        start_date = (last_date + timedelta(days=1)) if last_date else account.start_date

        # Skip if start_date is in the future
        if start_date > today:
            print(f"Skipping account {account.id}: start_date {start_date} in the future")
            continue

        # Number of days to calculate
        total_days = (today - start_date).days + 1
        if total_days <= 0:
            print(f"Skipping account {account.id}: no days to calculate")
            continue

        year_days = days_in_year(start_date.year)
        interest = (principal * interest_rate * total_days) / (100 * year_days)

        # Log interest (do not add to balance)
        log = AccountInterestLog(
            account_id=account.id,
            interest_amount=round(interest, 2),
            balance_before=principal,
            balance_after=principal,
            calculated_date=today
        )
        db.session.add(log)

        # Update last interest calculated date
        account.last_interest_calculated_date = today
        db.session.add(account)

    db.session.commit()
