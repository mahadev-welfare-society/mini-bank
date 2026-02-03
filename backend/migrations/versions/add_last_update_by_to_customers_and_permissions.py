"""Add last_update_by to customers and user_permissions

Revision ID: add_last_update_by
Revises: 
Create Date: 2025-01-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_last_update_by'
down_revision = '201fb82ed493'  # After add_is_active_field_to_customer
branch_labels = None
depends_on = None


def upgrade():
    # Add last_update_by to customers table
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_update_by', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_customers_last_update_by',
            'users',
            ['last_update_by'],
            ['id']
        )
    
    # Add last_update_by to user_permissions table
    with op.batch_alter_table('user_permissions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_update_by', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_user_permissions_last_update_by',
            'users',
            ['last_update_by'],
            ['id']
        )


def downgrade():
    # Remove last_update_by from user_permissions table
    with op.batch_alter_table('user_permissions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_user_permissions_last_update_by', type_='foreignkey')
        batch_op.drop_column('last_update_by')
    
    # Remove last_update_by from customers table
    with op.batch_alter_table('customers', schema=None) as batch_op:
        batch_op.drop_constraint('fk_customers_last_update_by', type_='foreignkey')
        batch_op.drop_column('last_update_by')

