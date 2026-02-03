"""Add display_name to AccountType"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ca2e881dfd66'
down_revision = '1d39430a4ced'  # replace with your last migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Add column only if it doesn't exist
    op.execute("""
    ALTER TABLE account_types
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(50) DEFAULT 'TEMP' NOT NULL;
    """)

    # Remove server default so future inserts must provide value
    with op.batch_alter_table('account_types') as batch_op:
        batch_op.alter_column('display_name', server_default=None)


def downgrade():
    with op.batch_alter_table('account_types') as batch_op:
        batch_op.drop_column('display_name')
