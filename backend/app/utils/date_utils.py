# app/utils/date_utils.py

def months_between(start_date, end_date):
    """
    Calculate number of whole months between two dates.
    """
    if start_date > end_date:
        return 0

    return (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
