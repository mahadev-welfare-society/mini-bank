from app.services.daily_interest import calculate_dds_daily_interest
from app.services.fd_interest import calculate_fd_interest
from app.services.rd_interest import calculate_rd_monthly_interest

def midnight_interest_job():
    calculate_dds_daily_interest()
    calculate_fd_interest()

# MONTHLY dispatcher only
def monthly_interest_job():
    calculate_rd_monthly_interest()
