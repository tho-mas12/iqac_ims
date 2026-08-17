from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    role: str = "Staff"  # Admin, Staff, Office

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Checklist Status Schemas ---
class ChecklistStatusBase(BaseModel):
    is_checked: bool
    ticked_at: Optional[datetime] = None
    is_manual_time: bool = False

class ChecklistStatusUpdate(BaseModel):
    is_checked: bool
    ticked_at: Optional[datetime] = None
    is_manual_time: bool = False

class ChecklistStatusOut(ChecklistStatusBase):
    id: int
    question_id: int
    updated_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- Question Schemas ---
class QuestionBase(BaseModel):
    text: str
    data_from_units: Optional[str] = None
    email_sent_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class QuestionCreate(QuestionBase):
    pass

class QuestionOut(QuestionBase):
    id: int
    title_id: int
    created_at: datetime
    status: Optional[ChecklistStatusOut] = None

    class Config:
        from_attributes = True

# --- Title Schemas ---
class TitleBase(BaseModel):
    name: str
    description: Optional[str] = None

class TitleCreate(TitleBase):
    questions: Optional[List[str]] = []

class TitleUpdate(TitleBase):
    pass

class TitleOut(TitleBase):
    id: int
    created_at: datetime
    questions: List[QuestionOut] = []
    
    # Custom fields for convenience
    total_questions: int = 0
    completed_questions: int = 0

    class Config:
        from_attributes = True

# --- Mail Tracking Schemas ---
class MailTrackingBase(BaseModel):
    subject: str
    sender_staff: str
    sent_at: datetime
    is_answered: bool = False
    answered_at: Optional[datetime] = None
    is_manual_sent_time: bool = False
    is_manual_answered_time: bool = False

class MailTrackingCreate(BaseModel):
    subject: str
    sender_staff: str
    sent_at: datetime
    is_manual_sent_time: bool = False

class MailTrackingUpdate(BaseModel):
    subject: Optional[str] = None
    sender_staff: Optional[str] = None
    sent_at: Optional[datetime] = None
    is_answered: Optional[bool] = None
    answered_at: Optional[datetime] = None
    is_manual_sent_time: Optional[bool] = None
    is_manual_answered_time: Optional[bool] = None

class MailTrackingOut(MailTrackingBase):
    id: int
    attachment_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
