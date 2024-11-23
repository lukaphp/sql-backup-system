from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.services.storage_service import StorageService

router = APIRouter()

class StorageUsage(BaseModel):
    used_bytes: int
    total_bytes: int
    used_formatted: str
    total_formatted: str
    usage_percentage: float

class BackupFile(BaseModel):
    path: str
    size: int
    size_formatted: str
    modified: str
    name: str

class DownloadLink(BaseModel):
    url: str
    expires_in: int

@router.get("/usage", response_model=StorageUsage)
async def get_storage_usage(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Get current storage usage statistics"""
    storage_service = StorageService(db)
    try:
        usage = await storage_service.get_storage_usage()
        return usage
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting storage usage: {str(e)}"
        )

@router.get("/files", response_model=List[BackupFile])
async def list_backup_files(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    database_name: Optional[str] = None
):
    """List all backup files in cloud storage"""
    storage_service = StorageService(db)
    try:
        files = await storage_service.list_backups(database_name)
        return files
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing backup files: {str(e)}"
        )

@router.get("/files/{backup_id}/download", response_model=DownloadLink)
async def get_download_link(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    expires_in: int = 3600
):
    """Generate temporary download link for a backup file"""
    storage_service = StorageService(db)
    try:
        backup = await storage_service.get_backup(backup_id)
        if not backup or not backup.cloud_storage_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found"
            )

        download_url = await storage_service.get_backup_link(
            backup.cloud_storage_path,
            expires_in
        )
        
        if not download_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download link"
            )

        return {
            "url": download_url,
            "expires_in": expires_in
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating download link: {str(e)}"
        )

@router.delete("/files/{backup_id}")
async def delete_backup_file(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_superuser)
):
    """Delete a backup file from storage (superuser only)"""
    storage_service = StorageService(db)
    try:
        backup = await storage_service.get_backup(backup_id)
        if not backup or not backup.cloud_storage_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found"
            )

        success = await storage_service.delete_backup(backup.cloud_storage_path)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete backup file"
            )

        return {"msg": "Backup file deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting backup file: {str(e)}"
        )

@router.post("/cleanup/{job_id}")
async def cleanup_old_backups(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
):
    """Manually trigger cleanup of old backups for a job"""
    storage_service = StorageService(db)
    try:
        backup_job = await storage_service.get_backup_job(job_id)
        if not backup_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup job not found"
            )

        cleaned_count = await storage_service.cleanup_old_backups(backup_job)
        return {
            "msg": f"Cleanup completed successfully",
            "cleaned_count": cleaned_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during cleanup: {str(e)}"
        )

@router.get("/metrics", response_model=Dict)
async def get_storage_metrics(
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user),
    days: int = 30
):
    """Get storage usage metrics over time"""
    storage_service = StorageService(db)
    try:
        metrics = await storage_service.get_storage_metrics(days)
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting storage metrics: {str(e)}"
        )
