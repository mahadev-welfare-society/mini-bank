"""Add enhanced parameters to AccountType

Revision ID: 8e70dfb4b5f3
Revises: 616b6c68c8db
Create Date: 2025-10-25 12:00:52.353123

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8e70dfb4b5f3'
down_revision = '616b6c68c8db'
branch_labels = None
depends_on = None


def upgrade():
    # Check if columns already exist before adding them
    conn = op.get_bind()
    
    # Get existing columns
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'account_types' 
        AND table_schema = 'public'
    """)).fetchall()
    
    existing_columns = [row[0] for row in result]
    
    # Only add columns that don't exist
    columns_to_add = []
    if 'min_deposit' not in existing_columns:
        columns_to_add.append(sa.Column('min_deposit', sa.Float(), nullable=True))
    if 'max_deposit' not in existing_columns:
        columns_to_add.append(sa.Column('max_deposit', sa.Float(), nullable=True))
    if 'min_withdrawal' not in existing_columns:
        columns_to_add.append(sa.Column('min_withdrawal', sa.Float(), nullable=True))
    if 'max_withdrawal' not in existing_columns:
        columns_to_add.append(sa.Column('max_withdrawal', sa.Float(), nullable=True))
    if 'withdrawal_limit_daily' not in existing_columns:
        columns_to_add.append(sa.Column('withdrawal_limit_daily', sa.Float(), nullable=True))
    if 'withdrawal_limit_monthly' not in existing_columns:
        columns_to_add.append(sa.Column('withdrawal_limit_monthly', sa.Float(), nullable=True))
    if 'contribution_frequency' not in existing_columns:
        columns_to_add.append(sa.Column('contribution_frequency', sa.String(length=20), nullable=True))
    if 'min_contribution_amount' not in existing_columns:
        columns_to_add.append(sa.Column('min_contribution_amount', sa.Float(), nullable=True))
    if 'lock_in_period_days' not in existing_columns:
        columns_to_add.append(sa.Column('lock_in_period_days', sa.Integer(), nullable=True))
    if 'early_withdrawal_penalty_rate' not in existing_columns:
        columns_to_add.append(sa.Column('early_withdrawal_penalty_rate', sa.Float(), nullable=True))
    if 'loan_parameters' not in existing_columns:
        columns_to_add.append(sa.Column('loan_parameters', sa.Text(), nullable=True))
    if 'is_template' not in existing_columns:
        columns_to_add.append(sa.Column('is_template', sa.Boolean(), nullable=True))
    if 'version' not in existing_columns:
        columns_to_add.append(sa.Column('version', sa.Integer(), nullable=True))
    
    # Add columns only if they don't exist
    if columns_to_add:
        with op.batch_alter_table('account_types', schema=None) as batch_op:
            for column in columns_to_add:
                batch_op.add_column(column)

    # Update existing records with default values
    conn = op.get_bind()
    
    # Get existing account types
    results = conn.execute(sa.text("SELECT id, name FROM account_types")).fetchall()
    
    for acc_type_id, acc_type_name in results:
        if acc_type_name.lower() == 'savings':
            conn.execute(sa.text("""
                UPDATE account_types 
                SET min_deposit = 100.0,
                    min_withdrawal = 10.0,
                    withdrawal_limit_daily = 10000.0,
                    withdrawal_limit_monthly = 100000.0,
                    early_withdrawal_penalty_rate = 0.0,
                    is_template = false,
                    version = 1
                WHERE id = :id
            """), {'id': acc_type_id})
        elif acc_type_name.lower() == 'rd':
            conn.execute(sa.text("""
                UPDATE account_types 
                SET min_deposit = 1000.0,
                    min_withdrawal = 0.0,
                    contribution_frequency = 'monthly',
                    min_contribution_amount = 500.0,
                    early_withdrawal_penalty_rate = 2.0,
                    is_template = false,
                    version = 1
                WHERE id = :id
            """), {'id': acc_type_id})
        elif acc_type_name.lower() == 'fd':
            conn.execute(sa.text("""
                UPDATE account_types 
                SET min_deposit = 10000.0,
                    min_withdrawal = 0.0,
                    lock_in_period_days = 365,
                    early_withdrawal_penalty_rate = 3.0,
                    is_template = false,
                    version = 1
                WHERE id = :id
            """), {'id': acc_type_id})
        elif acc_type_name.lower() == 'loan':
            conn.execute(sa.text("""
                UPDATE account_types 
                SET min_deposit = 0.0,
                    min_withdrawal = 0.0,
                    early_withdrawal_penalty_rate = 0.0,
                    loan_parameters = '{"max_loan_amount": 1000000, "min_loan_amount": 10000, "repayment_frequency": "monthly", "penalty_rate": 5.0}',
                    is_template = false,
                    version = 1
                WHERE id = :id
            """), {'id': acc_type_id})
        else:
            # Default values for any other account types
            conn.execute(sa.text("""
                UPDATE account_types 
                SET min_deposit = 0.0,
                    min_withdrawal = 0.0,
                    early_withdrawal_penalty_rate = 0.0,
                    is_template = false,
                    version = 1
                WHERE id = :id
            """), {'id': acc_type_id})

    # Now make the required columns NOT NULL (only if they exist)
    required_columns = ['min_deposit', 'min_withdrawal', 'early_withdrawal_penalty_rate', 'is_template', 'version']
    existing_required_columns = [col for col in required_columns if col in existing_columns]
    
    if existing_required_columns:
        with op.batch_alter_table('account_types', schema=None) as batch_op:
            if 'min_deposit' in existing_required_columns:
                batch_op.alter_column('min_deposit', existing_type=sa.Float(), nullable=False)
            if 'min_withdrawal' in existing_required_columns:
                batch_op.alter_column('min_withdrawal', existing_type=sa.Float(), nullable=False)
            if 'early_withdrawal_penalty_rate' in existing_required_columns:
                batch_op.alter_column('early_withdrawal_penalty_rate', existing_type=sa.Float(), nullable=False)
            if 'is_template' in existing_required_columns:
                batch_op.alter_column('is_template', existing_type=sa.Boolean(), nullable=False)
            if 'version' in existing_required_columns:
                batch_op.alter_column('version', existing_type=sa.Integer(), nullable=False)


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.drop_column('version')
        batch_op.drop_column('is_template')
        batch_op.drop_column('loan_parameters')
        batch_op.drop_column('early_withdrawal_penalty_rate')
        batch_op.drop_column('lock_in_period_days')
        batch_op.drop_column('min_contribution_amount')
        batch_op.drop_column('contribution_frequency')
        batch_op.drop_column('withdrawal_limit_monthly')
        batch_op.drop_column('withdrawal_limit_daily')
        batch_op.drop_column('max_withdrawal')
        batch_op.drop_column('min_withdrawal')
        batch_op.drop_column('max_deposit')
        batch_op.drop_column('min_deposit')

    # ### end Alembic commands ###
