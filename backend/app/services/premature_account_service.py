# from datetime import date

# def months_between(start_date, end_date):
#     """
#     Calculate number of whole months between two dates.
#     """
#     if start_date > end_date:
#         return 0

#     return (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)

# from calendar import monthrange

# def days_in_month(d):
#     return monthrange(d.year, d.month)[1]


# def calculate_daily_rate(annual_rate):
#     """Convert annual interest rate to daily rate considering leap years."""
#     today_year = date.today().year
#     days_in_year = 366 if today_year % 4 == 0 and (today_year % 100 != 0 or today_year % 400 == 0) else 365
#     return annual_rate / 100 / days_in_year

# def calculate_dds_future_interest(balance, daily_contribution, remaining_days, annual_rate):
#     """
#     Calculate future interest from the next day until maturity.
#     balance: current DDS balance (already includes completed contributions)
#     daily_contribution: daily contribution amount
#     remaining_days: days left in the DDS
#     annual_rate: interest rate in %
#     """
#     if remaining_days <= 0 or daily_contribution <= 0:
#         return 0.0

#     daily_rate = calculate_daily_rate(annual_rate)
#     future_balance = balance
#     future_interest = 0.0

#     for day in range(remaining_days):
#         # add today's contribution
#         future_balance += daily_contribution
#         # interest for today on current balance
#         interest_today = future_balance * daily_rate
#         future_interest += interest_today
#         future_balance += interest_today  # compounding

#     return round(future_interest, 2)


# def calculate_rd_future_interest(
#     monthly_installment,
#     remaining_months,
#     annual_rate
# ):
#     """
#     RD future interest (interest that would have been earned till maturity)
#     """
#     if remaining_months <= 0 or monthly_installment <= 0:
#         return 0.0

#     monthly_rate = annual_rate / 100 / 12
#     future_interest = 0.0
#     balance=0

#     for m in range(remaining_months, 0, -1):
#         balance=balance+monthly_installment
#         interest=balance * monthly_rate
#         balance=balance+interest
#         future_interest+=interest


#     return round(future_interest, 2)




# def calculate_premature_closure(account):
#     today = date.today()

#     balance = account.balance or 0
#     daily_contribution = account.daily_contribution or 0
#     annual_rate = account.get_effective_interest_rate() or 0
#     penalty_rate = account.snapshot_early_withdrawal_penalty_rate or 0.5

#     total_days = (account.maturity_date - account.start_date).days
#     days_completed = (today - account.start_date).days
#     remaining_days = max(total_days - days_completed, 0)

#     # Correct future interest
#     future_interest = calculate_dds_future_interest(
#         balance,
#         daily_contribution=daily_contribution,
#         remaining_days=remaining_days,
#         annual_rate=annual_rate
#     )

#     penalty_amount = round(future_interest * (penalty_rate / 100), 2)
#     transfer_amount = round(balance - penalty_amount, 2)

#     print("[DEBUG] DDS Premature Closure:")
#     print(f"  Balance so far: {balance}")
#     print(f"  Days completed: {days_completed}")
#     print(f"  Remaining days: {remaining_days}")
#     print(f"  Daily Contribution: {daily_contribution}")
#     print(f"  Future interest: {future_interest:.2f}")
#     print(f"  Penalty: {penalty_amount:.2f}")
#     print(f"  Net Payable: {transfer_amount:.2f}")

#     return {
#         "current_balance": round(balance, 2),
#         "days_completed": days_completed,
#         "remaining_days": remaining_days,
#         "interest_earned": round(balance - daily_contribution * days_completed, 2),
#         "future_interest": future_interest,
#         "penalty_amount": penalty_amount,
#         "transfer_amount": transfer_amount,
#     }

# from app.models import RDInstallment

# def calculate_rd_premature_closure(account):
#     """
#     RD premature closure logic
#     - Past interest stays
#     - Penalty = % of future interest
#     """

#     today = date.today()

#     balance = account.balance or 0.0
#     annual_rate = account.get_effective_interest_rate() or 0.0
#     penalty_rate = account.snapshot_early_withdrawal_penalty_rate or 0.5

#     # RD tenure in months
#     total_months = months_between(account.start_date, account.maturity_date)
#     completed_months = months_between(account.start_date, today)
#     remaining_months = max(total_months - completed_months, 0)

#     # Fetch RD installments
#     installments = (
#         RDInstallment.query
#         .filter_by(account_id=account.id)
#         .order_by(RDInstallment.deposit_date.asc())
#         .all()
#     )

#     monthly_installment = installments[0].amount if installments else 0.0

#     # Future interest (penalty base)
#     future_interest = calculate_rd_future_interest(
#         monthly_installment=monthly_installment,
#         remaining_months=remaining_months,
#         annual_rate=annual_rate
#     )

#     penalty_amount = round(future_interest * (penalty_rate / 100), 2)
#     transfer_amount = round(balance - penalty_amount, 2)

#     if transfer_amount < 0:
#         transfer_amount = 0.0

#     print("[DEBUG] RD Premature Closure:")
#     print(f"  Balance so far: {balance}")
#     print(f"  Completed months: {completed_months}")
#     print(f"  Remaining months: {remaining_months}")
#     print(f"  Monthly installment: {monthly_installment}")
#     print(f"  Future interest (lost): {future_interest:.2f}")
#     print(f"  Penalty: {penalty_amount:.2f}")
#     print(f"  Net Payable: {transfer_amount:.2f}")

#     return {
#         "current_balance": round(balance, 2),
#         "completed_months": completed_months,
#         "remaining_months": remaining_months,
#         "future_interest": future_interest,
#         "penalty_amount": penalty_amount,
#         "transfer_amount": transfer_amount,
#     }



# from datetime import date

# # Helper: exact days in a year
# def days_in_year(d):
#     return 366 if d.year % 4 == 0 and (d.year % 100 != 0 or d.year % 400 == 0) else 365

# def calculate_fd_premature(account, closure_date=None):
#     """
#     account: dict with keys:
#         - balance: principal
#         - rate: yearly ROI in %
#         - penalty_rate: early closure penalty in % (applied on future interest)
#         - start_date: FD start date (datetime.date)
#         - maturity_date: FD maturity date (datetime.date)
#     closure_date: datetime.date when FD is broken
#     """
#     closure_date = closure_date or date.today()

#     principal = account['balance']
#     rate = account['rate'] or 0
#     penalty_rate = account.get('penalty_rate', 0.5)

#     start_date = account['start_date']
#     maturity_date = account['maturity_date']

#     if closure_date < start_date:
#         raise ValueError("Closure date cannot be before FD start date")

#     # ----------------------------
#     # CALCULATE COMPLETED FULL YEARS (calendar based)
#     # ----------------------------
#     years_completed = closure_date.year - start_date.year
#     if (closure_date.month, closure_date.day) < (start_date.month, start_date.day):
#         years_completed -= 1
#     years_completed = max(years_completed, 0)

#     # ----------------------------
#     # COMPOUND INTEREST FOR COMPLETED YEARS
#     # ----------------------------
#     amount_after_years = principal
#     for _ in range(years_completed):
#         amount_after_years += amount_after_years * rate / 100

#     # ----------------------------
#     # INTEREST TILL CLOSURE (pro-rata for current incomplete year)
#     # ----------------------------
#     if years_completed == 0:
#         # less than 1 year: pro-rata interest from start_date to closure_date
#         days_elapsed = (closure_date - start_date).days + 1
#         interest_till_closure = principal * rate * days_elapsed / (100 * days_in_year(start_date))
#     else:
#         # completed some years, calculate pro-rata for remaining days in current year
#         last_anniversary = date(start_date.year + years_completed, start_date.month, start_date.day)
#         days_elapsed = (closure_date - last_anniversary).days + 1
#         interest_till_closure = amount_after_years * rate * days_elapsed / (100 * days_in_year(closure_date))

#     # ----------------------------
#     # FUTURE INTEREST (closure → maturity) for penalty calculation
#     # ----------------------------
#     remaining_days = (maturity_date - closure_date).days + 1
#     future_interest = (amount_after_years + interest_till_closure) * rate * remaining_days / (100 * days_in_year(closure_date))

#     # ----------------------------
#     # PENALTY: 0.5% of future interest
#     # ----------------------------
#     penalty = future_interest * penalty_rate / 100

#     # ----------------------------
#     # NET PAYABLE
#     # ----------------------------
#     net_amount = principal + interest_till_closure - penalty

#     # Debug
#     print("[FD PREMATURE DEBUG]")
#     print(f"Start date: {start_date}")
#     print(f"Break date: {closure_date}")
#     print(f"Completed years: {years_completed}")
#     print(f"Interest till closure: {interest_till_closure:.2f}")
#     print(f"Amount after years: {amount_after_years:.2f}")
#     print(f"Future interest (not paid): {future_interest:.2f}")
#     print(f"Penalty (@{penalty_rate}% of future interest): {penalty:.2f}")
#     print(f"Net payable: {net_amount:.2f}")

#     return {
#         "principal": round(principal, 2),
#         "completed_years": years_completed,
#         "interest_till_closure": round(interest_till_closure, 2),
#         "future_interest_lost": round(future_interest, 2),
#         "penalty_amount": round(penalty, 2),
#         "transfer_amount": round(net_amount, 2),
#     }


# def calculate_fd_maturity(account):
#     principal = account.balance
#     rate = account.get_effective_interest_rate()
#     start_date = account.start_date
#     maturity_date = account.maturity_date

#     total_days = (maturity_date - start_date).days + 1
#     year_days = 366 if start_date.year % 4 == 0 else 365

#     interest = (principal * rate * total_days) / (100 * year_days)
#     maturity_amount = principal + interest

#     print("[DEBUG] FD Maturity:")
#     print(f"  Principal: {principal}")
#     print(f"  Days: {total_days}")
#     print(f"  Interest: {interest:.2f}")
#     print(f"  Maturity Amount: {maturity_amount:.2f}")

#     return {
#         "principal": round(principal, 2),
#         "interest_earned": round(interest, 2),
#         "penalty_amount": 0.0,
#         "transfer_amount": round(maturity_amount, 2)
#     }

# def calculate_dds_maturity(account):
#     """
#     DDS maturity payout
#     All interest is already included in balance
#     """
#     balance = round(account.balance or 0, 2)

#     print("[DEBUG] DDS Maturity:")
#     print(f"  Final Balance: {balance}")

#     return {
#         "principal": round(account.daily_contribution * (
#             (account.maturity_date - account.start_date).days
#         ), 2),
#         "interest_earned": round(balance - (
#             account.daily_contribution * (
#                 (account.maturity_date - account.start_date).days
#             )
#         ), 2),
#         "transfer_amount": balance,
#         "penalty_amount": 0.0
#     }

from datetime import date
from calendar import monthrange

def months_between(start_date, end_date):
    """
    Calculate number of whole months between two dates.
    """
    if start_date > end_date:
        return 0

    return (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)

def days_in_month(d):
    return monthrange(d.year, d.month)[1]

def calculate_daily_rate(annual_rate):
    """Convert annual interest rate to daily rate considering leap years."""
    today_year = date.today().year
    days_in_year = 366 if today_year % 4 == 0 and (today_year % 100 != 0 or today_year % 400 == 0) else 365
    return annual_rate / 100 / days_in_year

def calculate_dds_future_interest(balance, daily_contribution, remaining_days, annual_rate):
    """
    Calculate future interest from the next day until maturity.
    balance: current DDS balance (already includes completed contributions)
    daily_contribution: daily contribution amount
    remaining_days: days left in the DDS
    annual_rate: interest rate in %
    """
    if remaining_days <= 0 or daily_contribution <= 0:
        return 0.0

    daily_rate = calculate_daily_rate(annual_rate)
    future_balance = balance
    future_interest = 0.0

    for day in range(remaining_days):
        # add today's contribution
        future_balance += daily_contribution
        # interest for today on current balance
        interest_today = future_balance * daily_rate
        future_interest += interest_today
        future_balance += interest_today  # compounding

    return round(future_interest, 2)

def calculate_rd_future_interest(current_balance, monthly_installment, remaining_months, annual_rate):
    """
    RD future interest (interest that would have been earned till maturity)
    Calculates interest on current balance plus future installments
    """
    if remaining_months <= 0 or monthly_installment <= 0:
        return 0.0

    monthly_rate = (annual_rate / 100) / 12
    future_interest = 0.0
    balance = current_balance  # Start with current balance

    for m in range(remaining_months):
        balance += monthly_installment
        interest = balance * monthly_rate
        balance += interest
        future_interest += interest

    return round(future_interest, 2)

def calculate_premature_closure(account):
    today = date.today()
    penalty_amount = 0.0
    balance = account.balance or 0
    daily_contribution = account.daily_contribution or 0
    annual_rate = account.get_effective_interest_rate() or 0
    penalty_rate = account.snapshot_early_withdrawal_penalty_rate or 0.5

    total_days = (account.maturity_date - account.start_date).days
    days_completed = (today - account.start_date).days
    remaining_days = max(total_days - days_completed, 0)

    # Correct future interest
    future_interest = calculate_dds_future_interest(
        balance,
        daily_contribution=daily_contribution,
        remaining_days=remaining_days,
        annual_rate=annual_rate
    )

    penalty_amount = round(future_interest * (penalty_rate / 100), 2)
    transfer_amount = round(balance - penalty_amount, 2)

    print("[DEBUG] DDS Premature Closure:")
    print(f"  Balance so far: {balance}")
    print(f"  Days completed: {days_completed}")
    print(f"  Remaining days: {remaining_days}")
    print(f"  Daily Contribution: {daily_contribution}")
    print(f"  Future interest: {future_interest:.2f}")
    print(f"  Penalty: {penalty_amount:.2f}")
    print(f"  Net Payable: {transfer_amount:.2f}")

    return {
        "current_balance": round(balance, 2),
        "days_completed": days_completed,
        "remaining_days": remaining_days,
        "interest_earned": round(balance - daily_contribution * days_completed, 2),
        "future_interest": future_interest,
        "penalty_amount": penalty_amount,
        "transfer_amount": transfer_amount,
    }

from app.models import RDInstallment

def calculate_rd_premature_closure(account):
    """
    RD premature closure logic
    - Past interest stays
    - Penalty = % of future interest
    - For partial months: only penalize remaining days in current cycle + future complete cycles
    """

    today = date.today()

    balance = account.balance or 0.0
    annual_rate = account.get_effective_interest_rate() or 0.0
    penalty_rate = account.snapshot_early_withdrawal_penalty_rate or 0.5

    # RD tenure in months
    total_months = months_between(account.start_date, account.maturity_date)
    
    # Fetch RD installments
    installments = (
        RDInstallment.query
        .filter_by(account_id=account.id)
        .order_by(RDInstallment.deposit_date.asc())
        .all()
    )

    monthly_installment = installments[0].amount if installments else 0.0

    # Get the day of month when installments are due (from start_date)
    installment_day = account.start_date.day
    
    # Calculate which installment cycle we're in
    months_since_start = months_between(account.start_date, today)
    # Add 1 to months_since_start to get next installment
    next_installment_months = months_since_start 
    target_year = account.start_date.year + (account.start_date.month + next_installment_months - 1) // 12
    target_month = (account.start_date.month + next_installment_months - 1) % 12 + 1
    days_in_target_month = monthrange(target_year, target_month)[1]
    expected_installment_day = min(installment_day, days_in_target_month)
    next_installment_date = date(target_year, target_month, expected_installment_day)
    if months_since_start == 0:
        current_cycle_start = account.start_date
    else:
        cycle_year = account.start_date.year + (account.start_date.month + months_since_start - 1) // 12
        cycle_month = (account.start_date.month + months_since_start - 1) % 12 + 1
        days_in_cycle_month = monthrange(cycle_year, cycle_month)[1]
        current_cycle_start = date(cycle_year, cycle_month, min(installment_day, days_in_cycle_month))
    
    # Calculate days in current incomplete cycle
    days_stayed_in_current_cycle = (today - current_cycle_start).days
    remaining_days_in_cycle = (next_installment_date - today).days
    # Completed months are those that have finished their full cycle
    completed_months = months_since_start - 1
    remaining_complete_months = max(total_months - completed_months-1, 0)
   
    monthly_rate = annual_rate / 100 / 12

    complete_balance = 0.0
    for i in range(completed_months):
        complete_balance += monthly_installment
        interest = complete_balance * monthly_rate
        complete_balance += interest

    complete_balance = complete_balance + monthly_installment
    # Calculate future interest for remaining days in current partial cycle
    future_interest_partial_cycle = 0.0

    if remaining_days_in_cycle > 0:
        # Pro-rata interest for remaining days in current cycle
        total_days_in_cycle = 30.24
        daily_rate_for_cycle = monthly_rate / total_days_in_cycle if total_days_in_cycle > 0 else 0
        
        # Interest on current balance for remaining days
        future_interest_partial_cycle = complete_balance * monthly_rate * remaining_days_in_cycle/total_days_in_cycle

    current_month_full_interest = complete_balance * monthly_rate
    complete_balance = complete_balance + current_month_full_interest -future_interest_partial_cycle
    # Calculate future interest for remaining complete months
    future_interest_complete_months = calculate_rd_future_interest(
        current_balance=complete_balance,
        monthly_installment=monthly_installment,
        remaining_months=remaining_complete_months,
        annual_rate=annual_rate
    )
    # Total future interest (penalty base)
    future_interest = future_interest_complete_months + future_interest_partial_cycle
    print(future_interest,'future_interest')
    print(complete_balance-(current_month_full_interest-future_interest_partial_cycle),'complete_balance')
    penalty_amount = round(future_interest * (penalty_rate / 100), 2)
    transfer_amount = round(complete_balance - penalty_amount-(current_month_full_interest-future_interest_partial_cycle), 2)

    if transfer_amount < 0:
        transfer_amount = 0.0

    print("[DEBUG] RD Premature Closure:")
    print(f"  Balance so far: {complete_balance}")
    print(f"  Completed months: {completed_months}")
    print(f"  Days stayed in current cycle: {days_stayed_in_current_cycle}")
    print(f"  Remaining days in current cycle: {remaining_days_in_cycle}")
    print(f"  Remaining complete months: {remaining_complete_months}")
    print(f"  Monthly installment: {monthly_installment}")
    print(f"  Future interest (complete months): {future_interest_complete_months:.2f}")
    print(f"  Future interest (partial cycle): {future_interest_partial_cycle:.2f}")
    print(f"  Total future interest (lost): {future_interest:.2f}")
    print(f"  Penalty: {penalty_amount:.2f}")
    print(f"  Net Payable: {transfer_amount:.2f}")

    return {
        "current_balance": round(balance, 2),
        "completed_months": completed_months,
        "remaining_months": remaining_complete_months,
        "remaining_days_in_cycle": remaining_days_in_cycle,
        "days_stayed_in_current_cycle": days_stayed_in_current_cycle,
        "future_interest": round(future_interest, 2),
        "penalty_amount": penalty_amount,
        "transfer_amount": transfer_amount,
    }

def calculate_fd_premature(account, closure_date=None):
    """
    account: Account object or dict with keys:
        - balance: principal
        - rate: yearly ROI in %
        - penalty_rate: early closure penalty in % (applied on future interest)
        - start_date: FD start date (datetime.date)
        - maturity_date: FD maturity date (datetime.date)
    closure_date: datetime.date when FD is broken
    """
    closure_date = closure_date or date.today()

    # Handle both Account object and dict
    if hasattr(account, 'balance'):
        # Account object
        principal = account.balance or 0
        rate = account.get_effective_interest_rate() or 0
        penalty_rate = account.snapshot_early_withdrawal_penalty_rate or 0.5
        start_date = account.start_date
        maturity_date = account.maturity_date
    else:
        # Dictionary
        principal = account['balance']
        rate = account['rate'] or 0
        penalty_rate = account.get('penalty_rate', 0.5)
        start_date = account['start_date']
        maturity_date = account['maturity_date']

    if closure_date < start_date:
        raise ValueError("Closure date cannot be before FD start date")

    # ----------------------------
    # CALCULATE COMPLETED FULL YEARS (calendar based)
    # ----------------------------
    years_completed = closure_date.year - start_date.year
    if (closure_date.month, closure_date.day) < (start_date.month, start_date.day):
        years_completed -= 1
    years_completed = max(years_completed, 0)

    # ----------------------------
    # COMPOUND INTEREST FOR COMPLETED YEARS
    # ----------------------------
    amount_after_years = principal
    for _ in range(years_completed):
        amount_after_years += amount_after_years * rate / 100

    # ----------------------------
    # INTEREST TILL CLOSURE (pro-rata for current incomplete year)
    # ----------------------------
    if years_completed == 0:
        # less than 1 year: pro-rata interest from start_date to closure_date
        days_elapsed = (closure_date - start_date).days
        if days_elapsed == 0:
            # Broken on same day as start - no interest earned
            interest_till_closure = 0.0
        else:
            # Include both start and closure dates in interest calculation
            # If broken 1 day after start: days_elapsed = 1, so we count 2 days (start + closure)
            interest_till_closure = principal * rate * (days_elapsed + 1) / (100 * days_in_year(start_date))
    else:
        # completed some years, calculate pro-rata for remaining days in current year
        last_anniversary = date(start_date.year + years_completed, start_date.month, start_date.day)
        days_elapsed = (closure_date - last_anniversary).days
        if days_elapsed == 0:
            # Broken exactly on anniversary date - full year's interest is already in amount_after_years
            # Interest till closure = amount_after_years - principal (this includes all completed years' interest)
            interest_till_closure = amount_after_years - principal
        else:
            # Include both anniversary and closure dates
            # Interest for completed years is already in amount_after_years, add pro-rata for remaining days
            interest_till_closure = (amount_after_years - principal) + (amount_after_years * rate * (days_elapsed + 1) / (100 * days_in_year(closure_date)))

    # ----------------------------
    # FUTURE INTEREST (closure → maturity) for penalty calculation
    # Penalty is calculated on interest for remaining tenure based on principal
    # Rule: penalty_rate% (e.g., 0.5%) of interest for remaining tenure
    # ----------------------------
    # Get FD tenure period (normalized to 365 days per year, not calendar days)
    if hasattr(account, 'snapshot_lock_in_period_days') and account.snapshot_lock_in_period_days:
        original_tenure = account.snapshot_lock_in_period_days
        # Normalize tenure to 365 days per year
        approx_years = original_tenure / 365.25
        years = round(approx_years)
        total_tenure_days = years * 365
    else:
        # Fallback: calculate from maturity date, but normalize to 365 days per year
        calendar_days = (maturity_date - start_date).days
        years = round(calendar_days / 365.25)
        total_tenure_days = years * 365
    
    # Calculate days elapsed using same normalization (365 days per year)
    # Use the years_completed already calculated and add remaining days in current year
    calendar_days_elapsed = (closure_date - start_date).days
    
    # Calculate days elapsed normalized to 365 days per year
    # Years completed (already calculated above) * 365 + days in current incomplete year
    if years_completed == 0:
        # Less than 1 year: use actual days elapsed (but max 365)
        days_elapsed_normalized = min(calendar_days_elapsed, 365)
    else:
        # Completed some years: years_completed * 365 + days in current year
        last_anniversary = date(start_date.year + years_completed, start_date.month, start_date.day)
        days_in_current_year = (closure_date - last_anniversary).days
        days_elapsed_normalized = (years_completed * 365) + min(days_in_current_year, 365)
    
    # Remaining days = total tenure days - days elapsed (both normalized to 365 days per year)
    remaining_days = total_tenure_days - days_elapsed_normalized
    
    if remaining_days < 0:
        remaining_days = 0
    if remaining_days > total_tenure_days:
        remaining_days = total_tenure_days
    
    # Calculate future interest on principal for remaining tenure (day-wise)
    # Use principal as base for penalty calculation
    # This represents the interest that would have been earned on the principal for the remaining tenure
    if remaining_days > 0:
        # Use standard 365 days per year for FD calculation
        future_interest = principal * rate * remaining_days / (100 * 365)
    else:
        future_interest = 0.0

    # ----------------------------
    # PENALTY: penalty_rate% of future interest (e.g., 0.5% of future interest)
    # ----------------------------
    penalty = future_interest * penalty_rate / 100

    # ----------------------------
    # NET PAYABLE
    # ----------------------------
    net_amount = principal + interest_till_closure - penalty

    # Debug
    print("[FD PREMATURE DEBUG]")
    print(f"Start date: {start_date}")
    print(f"Break date: {closure_date}")
    print(f"Maturity date: {maturity_date}")
    print(f"Total tenure days (normalized): {total_tenure_days} (365 days per year)")
    print(f"Days elapsed (normalized): {days_elapsed_normalized} (365 days per year)")
    print(f"Calendar days elapsed: {calendar_days_elapsed}")
    print(f"Completed years: {years_completed}")
    print(f"Remaining days (for penalty): {remaining_days}")
    print(f"Principal: ₹{principal:.2f}")
    print(f"Rate: {rate}%")
    print(f"Penalty rate: {penalty_rate}%")
    print(f"Interest till closure: ₹{interest_till_closure:.2f}")
    print(f"Amount after years: ₹{amount_after_years:.2f}")
    print(f"Current amount (Principal + Interest): ₹{principal + interest_till_closure:.2f}")
    print(f"Future interest (on principal for remaining {remaining_days} days): ₹{future_interest:.2f}")
    print(f"Penalty (@{penalty_rate}% of future interest): ₹{penalty:.2f}")
    print(f"Net payable (Current Amount - Penalty): ₹{net_amount:.2f}")
    print(f"  = {principal + interest_till_closure:.2f} - {penalty:.2f}")

    return {
        "principal": round(principal, 2),
        "completed_years": years_completed,
        "interest_till_closure": round(interest_till_closure, 2),
        "future_interest_lost": round(future_interest, 2),
        "penalty_amount": round(penalty, 2),
        "transfer_amount": round(net_amount, 2)
    }

def calculate_fd_maturity(account):
    """
    Calculate FD maturity amount based on account's interest calculation method.
    Uses the FD tenure period (365 days per year) for calculation, not actual calendar days.
    """
    principal = account.balance
    rate = account.get_effective_interest_rate() or 0
    start_date = account.start_date
    maturity_date = account.maturity_date
    
    # Get interest calculation method (simple or compound)
    calculation_method = account.get_effective_interest_calculation_method() if hasattr(account, 'get_effective_interest_calculation_method') else 'simple'
    
    # Get FD tenure from snapshot_lock_in_period_days or calculate from dates
    # For maturity, use exact tenure period (365 days per year), not calendar days
    if hasattr(account, 'snapshot_lock_in_period_days') and account.snapshot_lock_in_period_days:
        original_tenure = account.snapshot_lock_in_period_days
        # Normalize tenure to 365 days per year for calculation
        # Calculate approximate years
        approx_years = original_tenure / 365.25
        # Round to nearest year
        years = round(approx_years)
        # Use exactly 365 days per year (standard FD duration)
        tenure_days = years * 365
    else:
        # Fallback: calculate from dates, but use standard 365 days per year
        calendar_days = (maturity_date - start_date).days
        # Calculate number of years (round to nearest)
        years = round(calendar_days / 365.25)
        # Use exactly 365 days per year
        tenure_days = years * 365
    
    # Ensure minimum tenure is 365 days for 1-year FD
    if tenure_days < 365:
        tenure_days = 365
    
    # Calculate tenure in years (using standard 365 days per year)
    total_years = tenure_days / 365.0
    years_completed = int(total_years)  # Full years
    
    # FD maturity ALWAYS uses compound interest (year-by-year)
    # Interest is added to principal each year, then next year's interest is calculated on (Principal + Previous Interest)
    maturity_amount = principal
    total_interest = 0.0
    
    # Calculate compound interest year by year
    for year in range(years_completed):
        year_interest = maturity_amount * rate / 100
        maturity_amount += year_interest
        total_interest += year_interest
    
    # If there are remaining days (partial year), calculate pro-rata interest on the compounded amount
    remaining_days = tenure_days - (years_completed * 365)
    if remaining_days > 0:
        # Pro-rata interest for remaining days on the compounded amount
        remaining_interest = (maturity_amount * rate * remaining_days) / (100 * 365)
        maturity_amount += remaining_interest
        total_interest += remaining_interest
    
    interest = total_interest

    print("[DEBUG] FD Maturity (Compound Interest Year-by-Year):")
    print(f"  Principal: ₹{principal:.2f}")
    print(f"  Rate: {rate}%")
    print(f"  Years completed: {years_completed}")
    print(f"  Remaining days: {remaining_days}")
    print(f"  Start date: {start_date}")
    print(f"  Maturity date: {maturity_date}")
    print(f"  Tenure days (FD duration): {tenure_days}")
    print(f"  Total interest: ₹{interest:.2f}")
    print(f"  Maturity Amount: ₹{maturity_amount:.2f}")

    return {
        "principal": round(principal, 2),
        "interest_earned": round(interest, 2),
        "penalty_amount": 0.0,
        "transfer_amount": round(maturity_amount, 2)
    }

def calculate_dds_maturity(account):
    """
    DDS maturity payout
    All interest is already included in balance
    """
    balance = round(account.balance or 0, 2)

    print("[DEBUG] DDS Maturity:")
    print(f"  Final Balance: {balance}")

    return {
        "principal": round(account.daily_contribution * (
            (account.maturity_date - account.start_date).days
        ), 2),
        "interest_earned": round(balance - (
            account.daily_contribution * (
                (account.maturity_date - account.start_date).days
            )
        ), 2),
        "transfer_amount": balance,
        "penalty_amount": 0.0
    }


def calculate_rd_maturity(account):
    """
    RD maturity calculation using compound interest
    - All installments completed
    - No penalty
    - Interest calculated month-wise with compounding
    - Each month: deposit + interest on current balance, then compound
    """

    annual_rate = account.get_effective_interest_rate() or 0.0
    monthly_rate = annual_rate / 100 / 12

    # Fetch all RD installments
    installments = (
        RDInstallment.query
        .filter_by(account_id=account.id)
        .order_by(RDInstallment.deposit_date.asc())
        .all()
    )

    if not installments:
        return {
            "principal": 0.0,
            "interest_earned": 0.0,
            "penalty_amount": 0.0,
            "transfer_amount": 0.0
        }

    total_installments = len(installments)
    principal = sum(i.amount for i in installments)

    # Compound interest calculation: month-by-month
    # Start with balance = 0
    # For each month: add deposit, calculate interest on current balance, add interest to balance
    balance = 0.0
    total_interest_earned = 0.0

    for inst in installments:
        # Add the deposit for this month
        balance += inst.amount
        
        # Calculate interest on the current balance (compounded amount)
        monthly_interest = balance * monthly_rate
        
        # Add interest to balance (compound it)
        balance += monthly_interest
        total_interest_earned += monthly_interest

    maturity_amount = balance

    print("[DEBUG] RD Maturity (Compound Interest):")
    print(f"  Total Installments: {total_installments}")
    print(f"  Principal: {principal:.2f}")
    print(f"  Interest Earned: {total_interest_earned:.2f}")
    print(f"  Maturity Amount: {maturity_amount:.2f}")

    return {
        "principal": round(principal, 2),
        "interest_earned": round(total_interest_earned, 2),
        "penalty_amount": 0.0,
        "transfer_amount": round(maturity_amount, 2)
    }

def days_in_year(d):
    return 366 if d.year % 4 == 0 and (d.year % 100 != 0 or d.year % 400 == 0) else 365
