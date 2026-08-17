import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Staff", nullable=False)  # Admin, Staff, Office
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    ticks = relationship("ChecklistStatus", back_populates="user")


class Title(Base):
    __tablename__ = "titles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    questions = relationship("Question", back_populates="title", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    title_id = Column(Integer, ForeignKey("titles.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    data_from_units = Column(String(255), nullable=True)
    email_sent_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    title = relationship("Title", back_populates="questions")
    status = relationship("ChecklistStatus", back_populates="question", uselist=False, cascade="all, delete-orphan")


class ChecklistStatus(Base):
    __tablename__ = "checklist_statuses"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_checked = Column(Boolean, default=False, nullable=False)
    ticked_at = Column(DateTime, nullable=True)
    is_manual_time = Column(Boolean, default=False, nullable=False)
    updated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    question = relationship("Question", back_populates="status")
    user = relationship("User", back_populates="ticks")


class MailTracking(Base):
    __tablename__ = "mail_tracking"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255), nullable=False)
    sender_staff = Column(String(255), nullable=False)
    sent_at = Column(DateTime, nullable=False)
    is_answered = Column(Boolean, default=False, nullable=False)
    answered_at = Column(DateTime, nullable=True)
    is_manual_sent_time = Column(Boolean, default=False, nullable=False)
    is_manual_answered_time = Column(Boolean, default=False, nullable=False)
    attachment_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
