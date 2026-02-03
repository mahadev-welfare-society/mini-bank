"""fix account type naming

Revision ID: 31753bbf7dfc
Revises: ca2e881dfd66
Create Date: 2025-12-26 17:22:02.720754

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '31753bbf7dfc'
down_revision = 'ca2e881dfd66'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('account_types_name_key', 'account_types', type_='unique')
    op.create_unique_constraint(
        'uq_account_types_display_name',
        'account_types',
        ['display_name']
    )

def downgrade():
    op.drop_constraint('uq_account_types_display_name', 'account_types', type_='unique')
    op.create_unique_constraint(
        'account_types_name_key',
        'account_types',
        ['name']
    )
