"""Add AccountType model and update Account model

Revision ID: 616b6c68c8db
Revises: 38a7b3618525
Create Date: 2025-10-24 19:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '616b6c68c8db'
down_revision = '38a7b3618525'
branch_labels = None
depends_on = None


def upgrade():
    # Create account_types table first
    op.create_table('account_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('display_name', sa.String(length=50), nullable=False, unique=True),  # ADD THIS
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('interest_rate', sa.Float(), nullable=False),
        sa.Column('term_in_days', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create default admin user if it doesn't exist
    op.execute(text("""
        INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
        VALUES (1, 'Admin User', 'admin@minibank.com', 'admin', 'scrypt:32768:8:1$PTqaPtStPjfar3Wc$75b81f79eae5e42fadcac3bde73e107061c0f3905ee052999be452e2f408704edb3e915871060255c75c573adcba4c59617699fbd9976e6d4b4c0de37392412c', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    """))
    
    # Insert default account types
    op.execute(text("""
        INSERT INTO account_types (name, display_name, interest_rate, term_in_days, created_by, is_active, created_at, updated_at)
        VALUES 
        ('Savings','Savings', 4.0, NULL, 1, true, NOW(), NOW()),
        ('RD','RD', 6.5, 365, 1, true, NOW(), NOW()),
        ('FD','FD', 7.0, 365, 1, true, NOW(), NOW()),
        ('DDS','DDS', 6.5, 365, 1, true, NOW(), NOW()),
        ('Loan','Loan', 12.0, NULL, 1, true, NOW(), NOW())
    """))
    
    # Add new columns to accounts table (nullable first)
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('account_type_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('balance', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('start_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('maturity_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('created_by', sa.Integer(), nullable=True))
    
    # Update existing accounts with default values
    op.execute(text("""
        UPDATE accounts 
        SET 
            account_type_id = (SELECT id FROM account_types WHERE name = 'Savings' LIMIT 1),
            balance = 0.0,
            start_date = CURRENT_DATE,
            status = 'active',
            created_by = 1
    """))
    
    # Now make columns NOT NULL
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.alter_column('account_type_id', nullable=False)
        batch_op.alter_column('balance', nullable=False)
        batch_op.alter_column('start_date', nullable=False)
        batch_op.alter_column('status', nullable=False)
        batch_op.alter_column('created_by', nullable=False)
    
    # Add foreign key constraints
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_accounts_account_type', 'account_types', ['account_type_id'], ['id'])
        batch_op.create_foreign_key('fk_accounts_created_by', 'users', ['created_by'], ['id'])
    
    # Remove old columns
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('account_type')
        batch_op.drop_column('is_active')


def downgrade():
    # Add back old columns
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('account_type', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=True))
    
    # Update accounts with old format
    op.execute(text("""
        UPDATE accounts 
        SET 
            account_type = (SELECT name FROM account_types WHERE id = accounts.account_type_id),
            is_active = (status = 'active')
    """))
    
    # Make columns NOT NULL
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.alter_column('account_type', nullable=False)
        batch_op.alter_column('is_active', nullable=False)
    
    # Drop foreign key constraints
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_constraint('fk_accounts_account_type', type_='foreignkey')
        batch_op.drop_constraint('fk_accounts_created_by', type_='foreignkey')
    
    # Drop new columns
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('account_type_id')
        batch_op.drop_column('balance')
        batch_op.drop_column('start_date')
        batch_op.drop_column('maturity_date')
        batch_op.drop_column('status')
        batch_op.drop_column('created_by')
    
    # Drop account_types table
    op.drop_table('account_types')
