"""Add emi_due_day to accounts table

Revision ID: add_emi_due_day
Revises: add_loan_params
Create Date: 2025-01-27 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_emi_due_day'
down_revision = 'add_loan_params'
branch_labels = None
depends_on = None


def upgrade():
    # Add emi_due_day column to accounts table
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('emi_due_day', sa.Integer(), nullable=True))


def downgrade():
    # Remove emi_due_day column
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('emi_due_day')

