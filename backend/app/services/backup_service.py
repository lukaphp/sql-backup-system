import os
import pyodbc
import dropbox
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Backup, BackupJob, BackupStatus, BackupType
from app.services.notification_service import NotificationService

class BackupService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.dropbox_client = dropbox.Dropbox(settings.DROPBOX_ACCESS_TOKEN)

    async def create_backup(self, backup_job_id: int) -> Backup:
        """Create a new backup for a given backup job"""
        backup_job = self.db.query(BackupJob).filter(BackupJob.id == backup_job_id).first()
        if not backup_job:
            raise ValueError(f"Backup job {backup_job_id} not found")

        backup = Backup(
            backup_job_id=backup_job_id,
            status=BackupStatus.PENDING,
            started_at=datetime.utcnow()
        )
        self.db.add(backup)
        self.db.commit()
        
        try:
            # Start backup process
            await self._perform_backup(backup)
            return backup
        except Exception as e:
            await self._handle_backup_error(backup, str(e))
            raise

    async def _perform_backup(self, backup: Backup):
        """Perform the actual backup operation"""
        backup.status = BackupStatus.IN_PROGRESS
        self.db.commit()

        try:
            # Connect to SQL Server
            conn = self._get_sql_connection(backup.backup_job.database)
            
            # Generate backup file path
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{backup.backup_job.database.name}_{timestamp}.bak"
            local_path = os.path.join(settings.BACKUP_STORAGE_PATH, filename)

            # Create backup command based on type
            backup_cmd = self._create_backup_command(
                backup.backup_job.database.name,
                local_path,
                backup.backup_job.backup_type
            )

            # Execute backup
            cursor = conn.cursor()
            cursor.execute(backup_cmd)
            
            # Upload to cloud storage
            cloud_path = f"/{backup.backup_job.database.name}/{filename}"
            with open(local_path, 'rb') as f:
                self.dropbox_client.files_upload(f.read(), cloud_path)

            # Update backup record
            backup.status = BackupStatus.COMPLETED
            backup.file_path = local_path
            backup.cloud_storage_path = cloud_path
            backup.file_size = os.path.getsize(local_path)
            backup.completed_at = datetime.utcnow()

            # Clean up old backups
            await self._cleanup_old_backups(backup.backup_job)

            # Send notification
            await self.notification_service.send_backup_success_notification(backup)

        except Exception as e:
            await self._handle_backup_error(backup, str(e))
            raise
        finally:
            self.db.commit()

    def _get_sql_connection(self, database):
        """Create SQL Server connection"""
        conn = pyodbc.connect(database.connection_string)
        return conn

    def _create_backup_command(self, database_name: str, backup_path: str, backup_type: BackupType) -> str:
        """Create SQL Server backup command"""
        if backup_type == BackupType.FULL:
            return f"""
            BACKUP DATABASE [{database_name}] 
            TO DISK = '{backup_path}'
            WITH COMPRESSION, INIT
            """
        else:
            return f"""
            BACKUP DATABASE [{database_name}] 
            TO DISK = '{backup_path}'
            WITH DIFFERENTIAL, COMPRESSION, INIT
            """

    async def _cleanup_old_backups(self, backup_job: BackupJob):
        """Remove backups older than retention period"""
        retention_date = datetime.utcnow() - timedelta(days=backup_job.retention_days)
        old_backups = self.db.query(Backup).filter(
            Backup.backup_job_id == backup_job.id,
            Backup.created_at < retention_date,
            Backup.status == BackupStatus.COMPLETED
        ).all()

        for old_backup in old_backups:
            try:
                # Delete from cloud storage
                if old_backup.cloud_storage_path:
                    self.dropbox_client.files_delete_v2(old_backup.cloud_storage_path)
                
                # Delete local file
                if old_backup.file_path and os.path.exists(old_backup.file_path):
                    os.remove(old_backup.file_path)

                # Update database record
                old_backup.status = BackupStatus.DELETED
                self.db.commit()

            except Exception as e:
                print(f"Error cleaning up backup {old_backup.id}: {str(e)}")

    async def _handle_backup_error(self, backup: Backup, error_message: str):
        """Handle backup operation errors"""
        backup.status = BackupStatus.FAILED
        backup.error_message = error_message
        backup.completed_at = datetime.utcnow()
        self.db.commit()

        await self.notification_service.send_backup_failure_notification(backup)

    async def get_backup_status(self, backup_id: int) -> Optional[Backup]:
        """Get the status of a specific backup"""
        return self.db.query(Backup).filter(Backup.id == backup_id).first()

    async def list_backups(self, database_id: Optional[int] = None) -> List[Backup]:
        """List all backups, optionally filtered by database"""
        query = self.db.query(Backup)
        if database_id:
            query = query.join(BackupJob).filter(BackupJob.database_id == database_id)
        return query.order_by(Backup.created_at.desc()).all()
