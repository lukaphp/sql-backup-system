from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.core.security import get_password_hash

router = APIRouter()

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: str = None
    exp: int = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    email: EmailStr
    is_active: bool = True

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class RefreshToken(BaseModel):
    refresh_token: str

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return auth_service.create_access_token(user)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: RefreshToken,
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token
    """
    auth_service = AuthService(db)
    return await auth_service.refresh_token(refresh_token.refresh_token)

@router.post("/register", response_model=Token)
async def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register new user
    """
    auth_service = AuthService(db)
    user = await auth_service.create_user(
        email=user_in.email,
        password=user_in.password
    )
    return auth_service.create_access_token(user)

@router.post("/password/change")
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_active_user)
) -> Any:
    """
    Change current user password
    """
    auth_service = AuthService(db)
    if not await auth_service.update_password(
        current_user,
        password_data.current_password,
        password_data.new_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    return {"msg": "Password updated successfully"}

@router.post("/password/reset")
async def reset_password(
    email: EmailStr,
    new_password: str,
    db: Session = Depends(get_db),
    current_user = Depends(AuthService.get_current_superuser)
) -> Any:
    """
    Reset user password (superuser only)
    """
    auth_service = AuthService(db)
    if not await auth_service.reset_password(email, new_password):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"msg": "Password reset successfully"}

@router.get("/me")
async def read_current_user(
    current_user = Depends(AuthService.get_current_active_user)
) -> Any:
    """
    Get current user information
    """
    return {
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser
    }

@router.post("/verify")
async def verify_token(
    current_user = Depends(AuthService.get_current_active_user)
) -> Any:
    """
    Verify current token is valid
    """
    return {"msg": "Token is valid"}
