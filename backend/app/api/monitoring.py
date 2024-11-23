from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_db, check_db_connection
from app.services.auth_service import AuthService
from app.models.models import BackupStatus
from app.services.backup_service import BackupService
from app.services.storage_service import StorageService

router = APIRouter()

class SystemStatus(BaseModel):
    database_connection: bool
    storage_connection: bool
    scheduler_status: str
    last_backup_status: Optional[str]
    storage_usage_percentage: float
    active_backup_jobs: int

class BackupMetrics(BaseModel):
    total_backups: int
    successful_backups: int
    failed_backups: int
    average_backup_size: float
    total_backup_size: float
    average_duration: float

class JobMetrics(BaseModel):
    job_id: int
    database_name: str
    success_rate: float
    average_size: float
    average_duration: float
    last_backup_status: str
    next_scheduled_backup: Optional[datetime]

@router.get("/status", response_model=SystemStatus)
async def get_system_status(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Get overall system status"""
    try:
        backup_service = BackupService(db)
        storage_service = StorageService(db)

        # Check database connection
        db_connected = check_db_connection()

        # Check storage connection
        storage_connected = False
        try:
            await storage_service.get_storage_usage()
            storage_connected = True
        except:
            pass

        # Get last backup status
        last_backup = await backup_service.get_latest_backup()
        last_backup_status = last_backup.status.value if last_backup else None

        # Get storage usage
        storage_usage = await storage_service.get_storage_usage()

        # Get active jobs count
        active_jobs = await backup_service.count_active_jobs()

        return {
            "database_connection": db_connected,
            "storage_connection": storage_connected,
            "scheduler_status": "running",  # This should be dynamic in production
            "last_backup_status": last_backup_status,
            "storage_usage_percentage": storage_usage["usage_percentage"],
            "active_backup_jobs": active_jobs
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting system status: {str(e)}"
        )

@router.get("/metrics/backups", response_model=BackupMetrics)
async def get_backup_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    days: int = 30
):
    """Get backup operation metrics"""
    try:
        backup_service = BackupService(db)
        since_date = datetime.utcnow() - timedelta(days=days)
        
        metrics = await backup_service.get_backup_metrics(since_date)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting backup metrics: {str(e)}"
        )

@router.get("/metrics/jobs", response_model=List[JobMetrics])
async def get_job_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    days: int = 30
):
    """Get metrics for each backup job"""
    try:
        backup_service = BackupService(db)
        since_date = datetime.utcnow() - timedelta(days=days)
        
        metrics = await backup_service.get_job_metrics(since_date)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting job metrics: {str(e)}"
        )

@router.get("/alerts", response_model=List[Dict])
async def get_recent_alerts(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    limit: int = 100
):
    """Get recent system alerts and warnings"""
    try:
        backup_service = BackupService(db)
        alerts = await backup_service.get_recent_alerts(limit)
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting alerts: {str(e)}"
        )

@router.get("/logs", response_model=List[Dict])
async def get_system_logs(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    limit: int = 100,
    level: Optional[str] = None
):
    """Get system logs with optional filtering"""
    try:
        backup_service = BackupService(db)
        logs = await backup_service.get_system_logs(limit, level)
        return logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting system logs: {str(e)}"
        )

@router.get("/performance", response_model=Dict)
async def get_performance_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    days: int = 7
):
    """Get system performance metrics"""
    try:
        backup_service = BackupService(db)
        metrics = await backup_service.get_performance_metrics(days)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting performance metrics: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow()
    }

@router.post("/test-notification")
async def test_notification(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Send a test notification to verify notification settings"""
    try:
        backup_service = BackupService(db)
        await backup_service.send_test_notification(current_user)
        return {"msg": "Test notification sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending test notification: {str(e)}"
        )
