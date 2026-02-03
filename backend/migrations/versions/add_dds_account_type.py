"""Add DDS (Daily Deposit Scheme) account type

Revision ID: add_dds_account_type
Revises: add_old_amount_to_edit_requests
Create Date: 2025-01-27 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'add_dds_account_type'
down_revision = 'add_old_amount_to_edit_requests'
branch_labels = None
depends_on = None


def upgrade():
    # Check if DDS already exists to avoid duplicates
    conn = op.get_bind()
    existing_dds = conn.execute(
        sa.text("SELECT id FROM account_types WHERE name = 'DDS'")
    ).fetchone()
    
    if not existing_dds:
        # Insert DDS account type with default values
        # DDS is similar to RD but with daily contributions
        op.execute(text("""
            INSERT INTO account_types (
                name, 
                display_name,
                interest_rate, 
                term_in_days, 
                created_by, 
                is_active, 
                created_at, 
                updated_at,
                min_deposit,
                min_withdrawal,
                contribution_frequency,
                min_contribution_amount,
                early_withdrawal_penalty_rate,
                minimum_balance,
                low_balance_penalty,
                interest_calculation_method,
                version
            )
            VALUES (
                'DDS', 
                'DDS',
                6.8, 
                365, 
                1, 
                true, 
                NOW(), 
                NOW(),
                1000.0,
                0.0,
                'daily',
                100.0,
                2.5,
                0.0,
                0.0,
                'compound',
                1
            )
        """))
        
        # Get the DDS account type ID and update with additional fields if they exist
        dds_id = conn.execute(
            sa.text("SELECT id FROM account_types WHERE name = 'DDS'")
        ).fetchone()[0]
        
        # Update with additional fields that might exist in the schema
        # Check if columns exist before updating
        try:
            conn.execute(sa.text("""
                UPDATE account_types 
                SET 
                    deposit_limit_daily = NULL,
                    deposit_limit_monthly = NULL,
                    withdrawal_limit_daily = NULL,
                    withdrawal_limit_monthly = NULL,
                    atm_withdrawal_limit_daily = NULL,
                    interest_calculation_frequency = 'daily',
                    lock_in_period_days = 365
                WHERE id = :id
            """), {'id': dds_id})
        except Exception:
            # Some columns might not exist, that's okay
            pass


def downgrade():
    # Remove DDS account type
    op.execute(text("DELETE FROM account_types WHERE name = 'DDS'"))

