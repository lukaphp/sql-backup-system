from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.core.security import verify_password, get_password_hash
from app.models.models import User, NotificationSettings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user and return user object if valid"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    async def create_user(
        self,
        email: str,
        password: str,
        is_superuser: bool = False
    ) -> User:
        """Create a new user"""
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            is_superuser=is_superuser
        )
        self.db.add(user)
        
        # Create default notification settings
        notification_settings = NotificationSettings(
            user=user,
            email_notifications=True,
            backup_success=True,
            backup_failure=True,
            storage_warning=True
        )
        self.db.add(notification_settings)
        
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_access_token(self, user: User) -> dict:
        """Create access token for user"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Create access token
        access_token = self._create_token(
            data={"sub": user.email, "type": "access"},
            expires_delta=access_token_expires
        )
        
        # Create refresh token
        refresh_token = self._create_token(
            data={"sub": user.email, "type": "refresh"},
            expires_delta=timedelta(days=30)
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    def _create_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
        return encoded_jwt

    async def get_current_user(self, token: str = Depends(oauth2_scheme)) -> User:
        """Get current user from token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
            
            # Check token type
            token_type = payload.get("type")
            if token_type != "access":
                raise credentials_exception
                
        except JWTError:
            raise credentials_exception
            
        user = self.db.query(User).filter(User.email == email).first()
        if user is None:
            raise credentials_exception
            
        return user

    async def get_current_active_user(
        self,
        current_user: User = Depends(get_current_user)
    ) -> User:
        """Get current active user"""
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return current_user

    async def get_current_superuser(
        self,
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        """Get current superuser"""
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough privileges"
            )
        return current_user

    async def refresh_token(self, refresh_token: str) -> dict:
        """Create new access token using refresh token"""
        try:
            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )
            
            # Verify token type
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid refresh token"
                )
                
            email = payload.get("sub")
            user = self.db.query(User).filter(User.email == email).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
                
            return self.create_access_token(user)
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

    async def update_password(
        self,
        user: User,
        current_password: str,
        new_password: str
    ) -> bool:
        """Update user password"""
        if not verify_password(current_password, user.hashed_password):
            return False
            
        user.hashed_password = get_password_hash(new_password)
        self.db.commit()
        return True

    async def reset_password(self, email: str, new_password: str) -> bool:
        """Reset user password (admin only)"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return False
            
        user.hashed_password = get_password_hash(new_password)
        self.db.commit()
        return True
