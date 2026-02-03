from datetime import date, timedelta
from app import db
from app.models import Account
from app.models import AccountType
from app.models import AccountInterestLog
def days_in_year(year):
    return 366 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 365

def calculate_dds_daily_interest():
    today = date.today()

    accounts = (
    db.session.query(Account)
    .join(AccountType, Account.account_type)  # join relationship
    .filter(
        Account.status == 'active',
        AccountType.name.ilike('DDS%')  # starts with 'DDS', case-insensitive
    )
    .all()
    )
    print("Active accounts:", len(accounts))

    for account in accounts:
        if not account.account_type:
            continue
        
        print("Processing account:", account.id, account.account_type.name)


        interest_rate = account.get_effective_interest_rate()

        if not interest_rate or interest_rate <= 0:
            continue

        # Determine start date
        last_date = account.last_interest_calculated_date
        start_date = last_date + timedelta(days=1) if last_date else account.start_date

        # If start_date is today, still calculate 1 day of interest
        if not start_date:
            print(f"Skipping account {account.id}: no start date")
            continue

        days = (today - start_date).days
        if days < 0:
            print(f"Skipping account {account.id}: start_date in the future")
            continue

        # For first day, ensure at least 1 day
        if days == 0:
            days = 1

        year_days = days_in_year(today.year)
        daily_rate = (interest_rate / 100) / year_days
        interest = account.balance * daily_rate * days

        print(f"Adding interest {interest:.2f} to account {account.id} for {days} days")

        balance_before = account.balance

        # Update account
        account.balance += round(interest, 2)
        account.last_interest_calculated_date = today

        # Log the interest
        log = AccountInterestLog(
        account_id=account.id,
        interest_amount=round(interest, 2),
        balance_before=balance_before,
        balance_after=account.balance,
        calculated_date=today
        )
        db.session.add(log)        

    db.session.commit()
