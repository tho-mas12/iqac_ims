import os
import shutil
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas, auth, reports

router = APIRouter(prefix="/api")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper function to get completion counts for a title
def get_title_stats(db: Session, title_id: int):
    total = db.query(models.Question).filter(models.Question.title_id == title_id).count()
    completed = db.query(models.ChecklistStatus).join(models.Question).filter(
        models.Question.title_id == title_id,
        models.ChecklistStatus.is_checked == True
    ).count()
    return total, completed

# --- AUTH ENDPOINTS ---

@router.post("/auth/login", response_model=schemas.Token)
def login(form_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username, "role": user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role,
        "username": user.username
    }


# --- USER ACCESS / MANAGEMENT ENDPOINTS (Admin Only) ---

@router.get("/users", response_model=List[schemas.UserOut])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    return db.query(models.User).all()

@router.post("/users", response_model=schemas.UserOut)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    existing_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        password_hash=hashed_pwd,
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, user_in: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.username == "admin" and user_in.role and user_in.role != "Admin":
        raise HTTPException(status_code=400, detail="Cannot demote the default admin account")
        
    if user_in.role:
        db_user.role = user_in.role
    if user_in.password:
        db_user.password_hash = auth.get_password_hash(user_in.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.username == "admin" or db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete default admin or current login account")
        
    db.delete(db_user)
    db.commit()
    return {"detail": "User deleted successfully"}


# --- TITLE & QUESTION CRUD ENDPOINTS ---

@router.get("/titles", response_model=List[schemas.TitleOut])
def get_titles(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    titles = db.query(models.Title).all()
    out_list = []
    for t in titles:
        total, completed = get_title_stats(db, t.id)
        # Convert model to schema and attach dynamic fields
        t_out = schemas.TitleOut.from_orm(t)
        t_out.total_questions = total
        t_out.completed_questions = completed
        out_list.append(t_out)
    return out_list

@router.post("/titles", response_model=schemas.TitleOut)
def create_title(title_in: schemas.TitleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_title = models.Title(name=title_in.name, description=title_in.description)
    db.add(db_title)
    db.commit()
    db.refresh(db_title)
    
    # Handle pre-defined questions
    if title_in.questions:
        for q_text in title_in.questions:
            if q_text.strip():
                db_q = models.Question(title_id=db_title.id, text=q_text.strip())
                db.add(db_q)
                db.commit()
                db.refresh(db_q)
                
                # Seed checklist status
                db_status = models.ChecklistStatus(question_id=db_q.id, is_checked=False)
                db.add(db_status)
                
        db.commit()
        db.refresh(db_title)
        
    total, completed = get_title_stats(db, db_title.id)
    t_out = schemas.TitleOut.from_orm(db_title)
    t_out.total_questions = total
    t_out.completed_questions = completed
    return t_out

@router.get("/titles/{title_id}", response_model=schemas.TitleOut)
def get_title(title_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    t = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Title not found")
    total, completed = get_title_stats(db, t.id)
    t_out = schemas.TitleOut.from_orm(t)
    t_out.total_questions = total
    t_out.completed_questions = completed
    return t_out

@router.put("/titles/{title_id}", response_model=schemas.TitleOut)
def update_title(title_id: int, title_in: schemas.TitleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    t = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Title not found")
    t.name = title_in.name
    t.description = title_in.description
    db.commit()
    db.refresh(t)
    total, completed = get_title_stats(db, t.id)
    t_out = schemas.TitleOut.from_orm(t)
    t_out.total_questions = total
    t_out.completed_questions = completed
    return t_out

@router.delete("/titles/{title_id}")
def delete_title(title_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    t = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Title not found")
    db.delete(t)
    db.commit()
    return {"detail": "Title deleted successfully"}


# --- QUESTION SPECIFIC CRUD ENDPOINTS ---

@router.post("/titles/{title_id}/questions", response_model=schemas.QuestionOut)
def create_question(title_id: int, q_in: schemas.QuestionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    t = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Title not found")
    db_q = models.Question(
        title_id=title_id, 
        text=q_in.text,
        data_from_units=q_in.data_from_units,
        email_sent_date=q_in.email_sent_date,
        due_date=q_in.due_date
    )
    db.add(db_q)
    db.commit()
    db.refresh(db_q)
    
    # Initialize status
    db_status = models.ChecklistStatus(question_id=db_q.id, is_checked=False)
    db.add(db_status)
    db.commit()
    db.refresh(db_q)
    
    return db_q

@router.put("/questions/{question_id}", response_model=schemas.QuestionOut)
def update_question(question_id: int, q_in: schemas.QuestionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")
    db_q.text = q_in.text
    db_q.data_from_units = q_in.data_from_units
    db_q.email_sent_date = q_in.email_sent_date
    db_q.due_date = q_in.due_date
    db.commit()
    db.refresh(db_q)
    return db_q

@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_q = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not db_q:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(db_q)
    db.commit()
    return {"detail": "Question deleted successfully"}


# --- CHECKLIST ENDPOINTS (Ticking box with Manual vs Automatic Datetime) ---

@router.put("/questions/{question_id}/toggle", response_model=schemas.ChecklistStatusOut)
def toggle_question_status(
    question_id: int, 
    status_in: schemas.ChecklistStatusUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    status_record = db.query(models.ChecklistStatus).filter(models.ChecklistStatus.question_id == question_id).first()
    if not status_record:
        # Create it if it doesn't exist for some reason
        status_record = models.ChecklistStatus(question_id=question_id)
        db.add(status_record)
        
    status_record.is_checked = status_in.is_checked
    status_record.is_manual_time = status_in.is_manual_time
    
    if status_in.is_checked:
        if status_in.ticked_at:
            status_record.ticked_at = status_in.ticked_at
        else:
            status_record.ticked_at = datetime.datetime.utcnow()
        status_record.updated_by_user_id = current_user.id
    else:
        status_record.ticked_at = None
        status_record.updated_by_user_id = None
        
    db.commit()
    db.refresh(status_record)
    return status_record


# --- MAIL TRACKING ENDPOINTS ---

@router.get("/mails", response_model=List[schemas.MailTrackingOut])
def get_mails(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.MailTracking).order_by(models.MailTracking.created_at.desc()).all()

@router.post("/mails", response_model=schemas.MailTrackingOut)
def create_mail(
    subject: str = Form(...),
    sender_staff: str = Form(...),
    sent_at: str = Form(...), # ISO-8601 string
    is_manual_sent_time: bool = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    attachment_path = None
    if file and file.filename:
        filename = f"{int(datetime.datetime.utcnow().timestamp())}_{file.filename}"
        dest_path = os.path.join(UPLOAD_DIR, filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        attachment_path = f"uploads/{filename}"

    # Parse sent_at datetime
    try:
        sent_dt = datetime.datetime.fromisoformat(sent_at.replace("Z", "+00:00"))
    except ValueError:
        sent_dt = datetime.datetime.utcnow()
        
    db_mail = models.MailTracking(
        subject=subject,
        sender_staff=sender_staff,
        sent_at=sent_dt.replace(tzinfo=None),
        is_manual_sent_time=is_manual_sent_time,
        attachment_path=attachment_path
    )
    db.add(db_mail)
    db.commit()
    db.refresh(db_mail)
    return db_mail

@router.put("/mails/{mail_id}/toggle", response_model=schemas.MailTrackingOut)
def toggle_mail_answered(
    mail_id: int,
    is_answered: bool = Form(...),
    answered_at: Optional[str] = Form(None), # ISO-8601 string
    is_manual_answered_time: bool = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_mail = db.query(models.MailTracking).filter(models.MailTracking.id == mail_id).first()
    if not db_mail:
        raise HTTPException(status_code=404, detail="Mail record not found")
        
    db_mail.is_answered = is_answered
    db_mail.is_manual_answered_time = is_manual_answered_time
    
    if is_answered:
        if answered_at:
            try:
                ans_dt = datetime.datetime.fromisoformat(answered_at.replace("Z", "+00:00"))
                db_mail.answered_at = ans_dt.replace(tzinfo=None)
            except ValueError:
                db_mail.answered_at = datetime.datetime.utcnow()
        else:
            db_mail.answered_at = datetime.datetime.utcnow()
    else:
        db_mail.answered_at = None
        db_mail.is_manual_answered_time = False
        
    db.commit()
    db.refresh(db_mail)
    return db_mail

@router.delete("/mails/{mail_id}")
def delete_mail(mail_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_mail = db.query(models.MailTracking).filter(models.MailTracking.id == mail_id).first()
    if not db_mail:
        raise HTTPException(status_code=404, detail="Mail record not found")
        
    # Delete uploaded attachment if it exists
    if db_mail.attachment_path:
        full_filepath = os.path.join(os.path.dirname(os.path.dirname(__file__)), db_mail.attachment_path)
        if os.path.exists(full_filepath):
            try:
                os.remove(full_filepath)
            except Exception:
                pass
                
    db.delete(db_mail)
    db.commit()
    return {"detail": "Mail query record deleted"}


# --- REPORT GENERATION DOWNLOAD ENDPOINTS ---

@router.get("/reports/title/{title_id}/pdf")
def download_title_pdf(title_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    title = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not title:
        raise HTTPException(status_code=404, detail="Title not found")
    questions = db.query(models.Question).filter(models.Question.title_id == title_id).all()
    
    pdf_buffer = reports.generate_title_pdf(title, questions, db)
    filename = f"checklist_report_{title_id}_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/reports/title/{title_id}/excel")
def download_title_excel(title_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    title = db.query(models.Title).filter(models.Title.id == title_id).first()
    if not title:
        raise HTTPException(status_code=404, detail="Title not found")
    questions = db.query(models.Question).filter(models.Question.title_id == title_id).all()
    
    excel_buffer = reports.generate_title_excel(title, questions, db)
    filename = f"checklist_report_{title_id}_{datetime.datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/reports/mails/pdf")
def download_mails_pdf(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mails = db.query(models.MailTracking).order_by(models.MailTracking.created_at.desc()).all()
    pdf_buffer = reports.generate_mails_pdf(mails)
    filename = f"mail_tracking_report_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/reports/mails/excel")
def download_mails_excel(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    mails = db.query(models.MailTracking).order_by(models.MailTracking.created_at.desc()).all()
    excel_buffer = reports.generate_mails_excel(mails)
    filename = f"mail_tracking_report_{datetime.datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
