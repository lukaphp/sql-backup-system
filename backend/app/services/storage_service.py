import os
import dropbox
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import Backup, BackupJob
from app.services.notification_service import NotificationService

class StorageService:
    def __init__(self, db: Session):
        self.db = db
        self.dropbox_client = dropbox.Dropbox(settings.DROPBOX_ACCESS_TOKEN)
        self.notification_service = NotificationService(db)

    async def upload_backup(self, backup: Backup, file_path: str) -> str:
        """
        Upload a backup file to cloud storage
        Returns the cloud storage path
        """
        try:
            # Create path structure: /database_name/YYYY-MM/backup_file.bak
            date_folder = datetime.utcnow().strftime("%Y-%m")
            cloud_path = f"/{backup.backup_job.database.name}/{date_folder}/{os.path.basename(file_path)}"

            # Upload file
            with open(file_path, 'rb') as f:
                self.dropbox_client.files_upload(f.read(), cloud_path)

            return cloud_path

        except Exception as e:
            print(f"Error uploading backup to cloud storage: {str(e)}")
            raise

    async def delete_backup(self, cloud_path: str) -> bool:
        """Delete a backup file from cloud storage"""
        try:
            self.dropbox_client.files_delete_v2(cloud_path)
            return True
        except Exception as e:
            print(f"Error deleting backup from cloud storage: {str(e)}")
            return False

    async def get_storage_usage(self) -> Dict:
        """Get current storage usage statistics"""
        try:
            space_usage = self.dropbox_client.users_get_space_usage()
            
            used = space_usage.used
            allocated = space_usage.allocation.get_individual().allocated
            
            usage_data = {
                "used_bytes": used,
                "total_bytes": allocated,
                "used_formatted": self._format_size(used),
                "total_formatted": self._format_size(allocated),
                "usage_percentage": (used / allocated) * 100 if allocated > 0 else 0
            }

            # Check if usage is above threshold (80%)
            if usage_data["usage_percentage"] > 80:
                await self._handle_storage_warning(usage_data["usage_percentage"])

            return usage_data

        except Exception as e:
            print(f"Error getting storage usage: {str(e)}")
            return {
                "used_bytes": 0,
                "total_bytes": 0,
                "used_formatted": "0 B",
                "total_formatted": "0 B",
                "usage_percentage": 0
            }

    async def list_backups(self, database_name: Optional[str] = None) -> List[Dict]:
        """List all backups in cloud storage"""
        try:
            path = f"/{database_name}" if database_name else ""
            result = []

            for entry in self.dropbox_client.files_list_folder(path, recursive=True).entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    result.append({
                        "path": entry.path_display,
                        "size": entry.size,
                        "size_formatted": self._format_size(entry.size),
                        "modified": entry.server_modified,
                        "name": entry.name
                    })

            return result

        except Exception as e:
            print(f"Error listing backups: {str(e)}")
            return []

    async def get_backup_link(self, cloud_path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate a temporary download link for a backup file
        expires_in: Link expiration time in seconds (default 1 hour)
        """
        try:
            link = self.dropbox_client.files_get_temporary_link(cloud_path)
            return link.link
        except Exception as e:
            print(f"Error generating backup download link: {str(e)}")
            return None

    async def cleanup_old_backups(self, backup_job: BackupJob) -> int:
        """
        Clean up old backups based on retention policy
        Returns the number of backups cleaned up
        """
        try:
            cleaned_count = 0
            backups = self.db.query(Backup).filter(
                Backup.backup_job_id == backup_job.id
            ).order_by(Backup.created_at.desc()).all()

            # Keep the latest backup regardless of age
            for backup in backups[1:]:  # Skip the most recent backup
                if (datetime.utcnow() - backup.created_at).days > backup_job.retention_days:
                    if backup.cloud_storage_path:
                        await self.delete_backup(backup.cloud_storage_path)
                    
                    if backup.file_path and os.path.exists(backup.file_path):
                        os.remove(backup.file_path)
                    
                    cleaned_count += 1

            return cleaned_count

        except Exception as e:
            print(f"Error cleaning up old backups: {str(e)}")
            return 0

    async def _handle_storage_warning(self, usage_percentage: float):
        """Handle high storage usage warning"""
        # Get all users with storage warning notifications enabled
        notification_settings = self.db.query(NotificationSettings).filter(
            NotificationSettings.storage_warning == True
        ).all()

        # Send notifications
        for settings in notification_settings:
            await self.notification_service.send_storage_warning(
                settings.user,
                usage_percentage
            )

    def _format_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.2f} TB"
