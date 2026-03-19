"""Initial Alembic baseline.

This revision assumes the existing database schema created by FastAPI on
first run is the baseline. Future schema changes should use new Alembic
revisions generated with --autogenerate.
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision = "0001_initial_empty"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op: schema already created by SQLAlchemy Base.metadata.create_all.
    pass


def downgrade() -> None:
    # No-op: baseline revision.
    pass

