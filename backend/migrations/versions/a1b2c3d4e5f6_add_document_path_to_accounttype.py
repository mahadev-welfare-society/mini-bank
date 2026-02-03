"""Add document_path to AccountType"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'ca2e881dfd66'  # Update this to the latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Add document_path column to account_types table (Text type for JSON storage)
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.add_column(sa.Column('document_path', sa.Text(), nullable=True))


def downgrade():
    # Remove document_path column from account_types table
    with op.batch_alter_table('account_types', schema=None) as batch_op:
        batch_op.drop_column('document_path')

