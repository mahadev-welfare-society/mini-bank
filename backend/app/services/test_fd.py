from datetime import date, timedelta

# -------------------------------
# Helper: days in year
# -------------------------------
def days_in_year(d):
    return 366 if d.year % 4 == 0 and (d.year % 100 != 0 or d.year % 400 == 0) else 365

# -------------------------------
# FD premature calculation
# -------------------------------
def calculate_fd_premature(account, closure_date=None):
    closure_date = closure_date or date.today()

    principal = account['balance']
    rate = account['rate'] or 0
    penalty_rate = account.get('penalty_rate', 0.5)

    start_date = account['start_date']
    maturity_date = account['maturity_date']

    if closure_date < start_date:
        raise ValueError("Closure date before FD start")

    # Calculate completed full years
    years_completed = closure_date.year - start_date.year
    if (closure_date.month, closure_date.day) < (start_date.month, start_date.day):
        years_completed -= 1
    years_completed = max(years_completed, 0)

    # Compound for completed years
    amount_after_years = principal
    for _ in range(years_completed):
        amount_after_years += amount_after_years * rate / 100

    # Remaining days interest (simple)
    remaining_days = (maturity_date - closure_date).days+1
    future_interest = amount_after_years * rate * remaining_days / (100 * days_in_year(closure_date))
    full_interest = amount_after_years * rate / (100)

    # Penalty
    penalty = future_interest * penalty_rate / 100

    # Net payable
    net_amount = amount_after_years - penalty

    return {
        "principal": round(principal, 2),
        "completed_years": years_completed,
        "amount_after_years": round(amount_after_years, 2),
        "future_interest_lost": round(future_interest, 2),
        "penalty_amount": round(penalty, 2),
        "transfer_amount": round(net_amount, 2),
        "full_interest": round(full_interest-future_interest,2)
    }

# -------------------------------
# Test Scenarios
# -------------------------------
def run_fd_tests():
    fd = {
        'balance': 100000,
        'rate': 6.75,
        'penalty_rate': 0.5,
        'start_date': date(2025, 1, 1),
        'maturity_date': date(2028, 1, 1)
    }

    # Scenario 1: Break before 1 year
    closure_1 = date(2025, 12, 29)
    result_1 = calculate_fd_premature(fd, closure_1)

    # Scenario 2: Break after 2 years but before maturity
    closure_2 = date(2027, 6, 25)
    result_2 = calculate_fd_premature(fd, closure_2)

    # Scenario 3: Break after maturity
    closure_3 = date(2028, 1, 5)
    result_3 = calculate_fd_premature(fd, closure_3)

    print("\n--- FD Premature Closure Test Results ---\n")
    print("Scenario 1: Before 1 year")
    print(result_1)
    print("\nScenario 2: After 2 years, before maturity")
    print(result_2)
    print("\nScenario 3: After maturity")
    print(result_3)

# -------------------------------
# Run tests
# -------------------------------
if __name__ == "__main__":
    run_fd_tests()
