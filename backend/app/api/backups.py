from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.services.backup_service import BackupService
from app.services.scheduler_service import scheduler
from app.models.models import BackupType, ScheduleFrequency, BackupStatus

router = APIRouter()

class BackupJobCreate(BaseModel):
    database_id: int
    backup_type: BackupType
    frequency: ScheduleFrequency
    retention_days: int = 30

class BackupJobUpdate(BaseModel):
    backup_type: Optional[BackupType]
    frequency: Optional[ScheduleFrequency]
    retention_days: Optional[int]
    is_active: Optional[bool]

class BackupJobResponse(BaseModel):
    id: int
    database_id: int
    backup_type: BackupType
    frequency: ScheduleFrequency
    retention_days: int
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True

class BackupResponse(BaseModel):
    id: int
    backup_job_id: int
    status: BackupStatus
    file_path: Optional[str]
    file_size: Optional[int]
    cloud_storage_path: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]

    class Config:
        from_attributes = True

@router.post("/jobs", response_model=BackupJobResponse)
async def create_backup_job(
    job_data: BackupJobCreate,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Create a new backup job"""
    backup_service = BackupService(db)
    try:
        backup_job = await backup_service.create_backup_job(
            database_id=job_data.database_id,
            user_id=current_user.id,
            backup_type=job_data.backup_type,
            frequency=job_data.frequency,
            retention_days=job_data.retention_days
        )
        
        # Schedule the new job
        await scheduler.reschedule_job(backup_job.id)
        
        return backup_job
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/jobs", response_model=List[BackupJobResponse])
async def list_backup_jobs(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    database_id: Optional[int] = None
):
    """List all backup jobs"""
    backup_service = BackupService(db)
    return await backup_service.list_backup_jobs(database_id)

@router.get("/jobs/{job_id}", response_model=BackupJobResponse)
async def get_backup_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Get specific backup job details"""
    backup_service = BackupService(db)
    job = await backup_service.get_backup_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup job not found"
        )
    return job

@router.put("/jobs/{job_id}", response_model=BackupJobResponse)
async def update_backup_job(
    job_id: int,
    job_data: BackupJobUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Update backup job settings"""
    backup_service = BackupService(db)
    try:
        job = await backup_service.update_backup_job(job_id, job_data.dict(exclude_unset=True))
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup job not found"
            )
        
        # Reschedule if active status or frequency changed
        if job_data.is_active is not None or job_data.frequency is not None:
            await scheduler.reschedule_job(job_id)
            
        return job
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/jobs/{job_id}")
async def delete_backup_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Delete a backup job"""
    backup_service = BackupService(db)
    if not await backup_service.delete_backup_job(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup job not found"
        )
    
    # Remove from scheduler
    await scheduler.pause_job(job_id)
    
    return {"msg": "Backup job deleted successfully"}

@router.post("/jobs/{job_id}/run", response_model=BackupResponse)
async def run_backup_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Manually trigger a backup job"""
    backup_service = BackupService(db)
    try:
        backup = await backup_service.create_backup(job_id)
        background_tasks.add_task(backup_service.execute_backup, backup.id)
        return backup
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/history", response_model=List[BackupResponse])
async def get_backup_history(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    job_id: Optional[int] = None,
    limit: int = 100
):
    """Get backup execution history"""
    backup_service = BackupService(db)
    return await backup_service.get_backup_history(job_id, limit)

@router.get("/status/{backup_id}", response_model=BackupResponse)
async def get_backup_status(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Get status of a specific backup"""
    backup_service = BackupService(db)
    backup = await backup_service.get_backup_status(backup_id)
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )
    return backup

@router.post("/jobs/{job_id}/pause")
async def pause_backup_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Pause a backup job"""
    backup_service = BackupService(db)
    if not await backup_service.pause_backup_job(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup job not found"
        )
    
    await scheduler.pause_job(job_id)
    return {"msg": "Backup job paused successfully"}

@router.post("/jobs/{job_id}/resume")
async def resume_backup_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Resume a paused backup job"""
    backup_service = BackupService(db)
    if not await backup_service.resume_backup_job(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup job not found"
        )
    
    await scheduler.resume_job(job_id)
    return {"msg": "Backup job resumed successfully"}
