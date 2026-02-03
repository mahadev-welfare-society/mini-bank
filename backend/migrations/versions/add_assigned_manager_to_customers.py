"""Add assigned_manager_id to customers table

Revision ID: add_assigned_manager
Revises: 590f2a661c94
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_assigned_manager'
down_revision = '590f2a661c94'
branch_labels = None
depends_on = None


def upgrade():
    # Add assigned_manager_id column
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('assigned_manager_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_customers_assigned_manager',
            'customers',
            ['assigned_manager_id'],
            ['id']
        )


def downgrade():
    # Remove assigned_manager_id column
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_constraint('fk_customers_assigned_manager', type_='foreignkey')
        batch_op.drop_column('assigned_manager_id')

