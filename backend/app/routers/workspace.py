"""HTTP routes for /api/workspace (admin only): settings, join code, analytics."""

import datetime as dt

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.schemas import AnalyticsOut, ErrorOut, WorkspaceOut, WorkspaceUpdate
from app.services import analytics as analytics_service
from app.services import workspace as workspace_service

router = APIRouter(
    prefix="/api/workspace",
    tags=["workspace"],
    responses={403: {"model": ErrorOut}},
)


@router.get("", response_model=WorkspaceOut)
def get_workspace(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return workspace_service.describe(db, admin.organization)


@router.patch("", response_model=WorkspaceOut)
def rename_workspace(payload: WorkspaceUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    workspace_service.rename(db, admin.organization, payload.name)
    return workspace_service.describe(db, admin.organization)


@router.post("/join-code", response_model=WorkspaceOut, summary="Replace the join code")
def regenerate_join_code(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    workspace_service.regenerate_join_code(db, admin.organization)
    return workspace_service.describe(db, admin.organization)


@router.get("/analytics", response_model=AnalyticsOut, summary="Booking numbers for the last N days")
def analytics(
    days: int = Query(30, ge=1, le=365),
    end: dt.date | None = Query(None, description="Last day included; defaults to today"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return analytics_service.workspace_analytics(db, admin.org_id, end=end or dt.date.today(), days=days)
