"""Add loan parameters to accounts

Revision ID: add_loan_params
Revises: fad2ee3bbc1f
Create Date: 2025-11-05 17:53:06.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_loan_params'
down_revision = 'fad2ee3bbc1f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('snapshot_loan_principal', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_emi_amount', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_loan_term_months', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('snapshot_repayment_frequency', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('snapshot_loan_penalty_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('last_payment_date', sa.Date(), nullable=True))


def downgrade():
    with op.batch_alter_table('accounts', schema=None) as batch_op:
        batch_op.drop_column('last_payment_date')
        batch_op.drop_column('snapshot_loan_penalty_rate')
        batch_op.drop_column('snapshot_repayment_frequency')
        batch_op.drop_column('snapshot_loan_term_months')
        batch_op.drop_column('snapshot_emi_amount')
        batch_op.drop_column('snapshot_loan_principal')

