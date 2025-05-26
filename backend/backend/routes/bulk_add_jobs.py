import enum
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db import database

router = APIRouter(
    prefix="/bulk_add_jobs",
    tags=["bulk_add_jobs"],
)

class JobStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class BulkAddJob(BaseModel):
    id: int
    status: str
    added: int
    total: int

@router.get("", response_model=list[BulkAddJob])
def get_all_bulk_add_jobs(
    db: Session = Depends(database.get_db),
):
    jobs = db.query(database.BulkAddJob).all()

    return [
        BulkAddJob(
            id=job.id,
            status=job.status,
            added=job.added,
            total=job.total
        )
        for job in jobs
    ]

@router.get("/{job_id}", response_model=BulkAddJob)
def get_bulk_add_job_by_id(
    job_id: int,
    db: Session = Depends(database.get_db),
):
    job = db.query(database.BulkAddJob).filter(database.BulkAddJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return BulkAddJob(
        id=job.id,
        status=job.status,
        added=job.added,
        total=job.total
    )

@router.put("/{job_id}/cancel", response_model=BulkAddJob)
def cancel_job(
    job_id: int,
    db: Session = Depends(database.get_db),
):
    job = db.get(database.BulkAddJob, job_id)

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status != JobStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job cannot be cancelled")

    job.status = JobStatus.CANCELLED
    db.add(job)
    db.commit()

    return BulkAddJob(
        id=job.id,
        status=job.status,
        added=job.added,
        total=job.total
    )