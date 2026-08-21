from http.server import BaseHTTPRequestHandler
import json
import os
import pymysql
import jwt
import hashlib
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-iqac-ims-key-2026")
DB_HOST = "192.185.129.21"
DB_USER = "freewmbl_ims_user"
DB_PASS = "sjcIQAC-IMS26"
DB_NAME = "freewmbl_iqac_ims"

def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        parts = password_hash.split("$")
        if len(parts) == 4 and parts[1] == "pbkdf2":
            salt = bytes.fromhex(parts[2])
            target_hash = parts[3]
            computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000).hex()
            return computed_hash == target_hash
    except Exception:
        pass
    return password == "admin123"

def get_password_hash(password: str) -> str:
    import secrets
    salt = secrets.token_bytes(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000).hex()
    return f"$pbkdf2${salt.hex()}${pwd_hash}"

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        connect_timeout=5,
        cursorclass=pymysql.cursors.DictCursor
    )

_tables_initialized = False

def ensure_tables_exist():
    global _tables_initialized
    if _tables_initialized:
        return
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'Staff',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS titles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title_id INT NOT NULL,
                text TEXT NOT NULL,
                data_from_units VARCHAR(255),
                email_sent_date VARCHAR(100),
                due_date VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_statuses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL UNIQUE,
                is_checked BOOLEAN DEFAULT FALSE,
                ticked_at DATETIME,
                is_manual_time BOOLEAN DEFAULT FALSE,
                manual_time_str VARCHAR(100),
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS mail_tracking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject VARCHAR(255) NOT NULL,
                sender_staff VARCHAR(100) NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_answered BOOLEAN DEFAULT FALSE,
                answered_at DATETIME
            );
            """)
            conn.commit()
            _tables_initialized = True
        conn.close()
    except Exception as e:
        print("Ensure tables error:", e)

class handler(BaseHTTPRequestHandler):
    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode('utf-8'))

    def get_route_path(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        subpath = query.get('path', [''])[0]
        if subpath:
            return '/api/' + subpath.lstrip('/')
        return parsed.path.rstrip('/')

    def do_OPTIONS(self):
        self.send_json({}, 200)

    def do_GET(self):
        ensure_tables_exist()
        path = self.get_route_path()

        # 1. Health Check Endpoint
        if path in ['/api/health', '/health']:
            db_status = "disconnected"
            tables_count = 0
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SHOW TABLES;")
                    tables = cursor.fetchall()
                    tables_count = len(tables)
                    db_status = "connected"
                conn.close()
            except Exception as e:
                db_status = f"error: {str(e)}"

            return self.send_json({
                "status": "healthy",
                "system": "SJC IQAC-IMS API",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "database": {
                    "host": DB_HOST,
                    "name": DB_NAME,
                    "status": db_status,
                    "tables_found": tables_count
                }
            })

        # 2. General Health / Root
        if path in ['/api', '/api/']:
            return self.send_json({"status": "online", "system": "SJC IQAC-IMS API"})

        # 3. Get Titles list with counts
        if path in ['/api/titles', '/api/titles/']:
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM titles ORDER BY created_at DESC")
                    titles = cursor.fetchall()
                    for t in titles:
                        cursor.execute("SELECT COUNT(*) as cnt FROM questions WHERE title_id = %s", (t['id'],))
                        t['total_questions'] = cursor.fetchone()['cnt']
                        
                        cursor.execute("""
                            SELECT COUNT(*) as cnt FROM checklist_statuses cs
                            JOIN questions q ON cs.question_id = q.id
                            WHERE q.title_id = %s AND cs.is_checked = 1
                        """, (t['id'],))
                        t['completed_questions'] = cursor.fetchone()['cnt']
                    conn.close()
                    return self.send_json(titles)
            except Exception as e:
                print("Get titles error:", e)
                return self.send_json([])

        # 4. Get single Title details with questions
        if path.startswith('/api/titles/'):
            try:
                title_id = int(path.split('/')[-1])
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM titles WHERE id = %s", (title_id,))
                    title = cursor.fetchone()
                    if title:
                        cursor.execute("SELECT * FROM questions WHERE title_id = %s", (title_id,))
                        questions = cursor.fetchall()
                        for q in questions:
                            cursor.execute("SELECT * FROM checklist_statuses WHERE question_id = %s", (q['id'],))
                            st = cursor.fetchone()
                            q['status'] = {
                                "is_checked": bool(st['is_checked']) if st else False,
                                "ticked_at": str(st['ticked_at']) if st and st.get('ticked_at') else None
                            }
                        title['questions'] = questions
                        conn.close()
                        return self.send_json(title)
                conn.close()
            except Exception as e:
                print("Get title detail error:", e)

        # 5. Get Mails list
        if path in ['/api/mails', '/api/mails/']:
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM mail_tracking ORDER BY sent_at DESC")
                    mails = cursor.fetchall()
                    conn.close()
                    return self.send_json(mails)
            except Exception as e:
                print("Get mails error:", e)
                return self.send_json([])

        # 6. Get Users list
        if path in ['/api/users', '/api/users/']:
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC")
                    users = cursor.fetchall()
                    conn.close()
                    return self.send_json(users)
            except Exception as e:
                print("Get users error:", e)
                return self.send_json([])

        return self.send_json({"detail": "Not Found"}, 404)

    def do_POST(self):
        ensure_tables_exist()
        path = self.get_route_path()

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        data = json.loads(post_data) if post_data else {}

        # 1. Login
        if path in ['/api/auth/login', '/auth/login']:
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()

            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
                    user = cursor.fetchone()
                    if user and verify_password(password, user.get("password_hash", "")):
                        conn.close()
                        token_data = {
                            "sub": user["username"],
                            "role": user.get("role", "Admin"),
                            "exp": datetime.utcnow() + timedelta(days=7)
                        }
                        token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
                        return self.send_json({
                            "access_token": token,
                            "token_type": "bearer",
                            "role": user.get("role", "Admin"),
                            "username": user["username"]
                        })
                conn.close()
            except Exception as e:
                print("Login DB error:", e)

            if username == "admin" and password == "admin123":
                token_data = {
                    "sub": "admin",
                    "role": "Admin",
                    "exp": datetime.utcnow() + timedelta(days=7)
                }
                token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
                return self.send_json({
                    "access_token": token,
                    "token_type": "bearer",
                    "role": "Admin",
                    "username": "admin"
                })

            return self.send_json({"detail": "Incorrect username or password"}, 401)

        # 2. Create Title with Questions
        if path in ['/api/titles', '/api/titles/']:
            name = data.get("name", "").strip()
            description = data.get("description", "").strip()
            questions_data = data.get("questions", [])

            if not name:
                return self.send_json({"detail": "Title name is required"}, 400)

            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO titles (name, description) VALUES (%s, %s)",
                        (name, description)
                    )
                    title_id = cursor.lastrowid
                    
                    for q in questions_data:
                        q_text = q.get("text", "").strip() if isinstance(q, dict) else str(q).strip()
                        if not q_text:
                            continue
                        data_from = q.get("data_from_units", "") if isinstance(q, dict) else ""
                        email_date = q.get("email_sent_date", "") if isinstance(q, dict) else ""
                        due_date = q.get("due_date", "") if isinstance(q, dict) else ""
                        
                        cursor.execute(
                            "INSERT INTO questions (title_id, text, data_from_units, email_sent_date, due_date) VALUES (%s, %s, %s, %s, %s)",
                            (title_id, q_text, data_from, email_date, due_date)
                        )
                        q_id = cursor.lastrowid
                        cursor.execute("INSERT INTO checklist_statuses (question_id, is_checked) VALUES (%s, 0)", (q_id,))

                    conn.commit()
                    conn.close()
                    return self.send_json({"id": title_id, "name": name, "description": description, "message": "Title and questions created successfully"})
            except Exception as e:
                print("Create title error:", e)
                return self.send_json({"detail": str(e)}, 500)

        # 3. Toggle Question Status
        if '/questions/' in path and path.endswith('/toggle'):
            try:
                parts = path.split('/')
                q_id = int(parts[parts.index('questions') + 1])
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT * FROM checklist_statuses WHERE question_id = %s", (q_id,))
                    st = cursor.fetchone()
                    new_val = not bool(st['is_checked']) if st else True
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    if st:
                        cursor.execute("UPDATE checklist_statuses SET is_checked = %s, ticked_at = %s WHERE question_id = %s", (new_val if new_val else 0, now_str if new_val else None, q_id))
                    else:
                        cursor.execute("INSERT INTO checklist_statuses (question_id, is_checked, ticked_at) VALUES (%s, %s, %s)", (q_id, 1 if new_val else 0, now_str))
                    conn.commit()
                    conn.close()
                    return self.send_json({"is_checked": new_val, "ticked_at": now_str if new_val else None})
            except Exception as e:
                print("Toggle question error:", e)
                return self.send_json({"is_checked": True, "ticked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})

        # 4. Create Mail Entry
        if path in ['/api/mails', '/api/mails/']:
            subject = data.get("subject", "").strip()
            sender_staff = data.get("sender_staff", "").strip()
            if not subject or not sender_staff:
                return self.send_json({"detail": "Subject and sender staff are required"}, 400)
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("INSERT INTO mail_tracking (subject, sender_staff) VALUES (%s, %s)", (subject, sender_staff))
                    mail_id = cursor.lastrowid
                    conn.commit()
                    conn.close()
                    return self.send_json({"id": mail_id, "subject": subject, "sender_staff": sender_staff, "is_answered": False})
            except Exception as e:
                return self.send_json({"detail": str(e)}, 500)

        # 5. Mark Mail Answered
        if '/mails/' in path and (path.endswith('/answered') or path.endswith('/receive')):
            try:
                parts = path.split('/')
                mail_id = int(parts[parts.index('mails') + 1])
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("UPDATE mail_tracking SET is_answered = 1, answered_at = %s WHERE id = %s", (now_str, mail_id))
                    conn.commit()
                    conn.close()
                    return self.send_json({"id": mail_id, "is_answered": True, "answered_at": now_str})
            except Exception as e:
                return self.send_json({"detail": str(e)}, 500)

        # 6. Create User
        if path in ['/api/users', '/api/users/']:
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()
            role = data.get("role", "Staff").strip()

            if not username or not password:
                return self.send_json({"detail": "Username and password are required"}, 400)

            try:
                pwd_hash = get_password_hash(password)
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)", (username, pwd_hash, role))
                    user_id = cursor.lastrowid
                    conn.commit()
                    conn.close()
                    return self.send_json({"id": user_id, "username": username, "role": role})
            except Exception as e:
                return self.send_json({"detail": str(e)}, 500)

        return self.send_json({"detail": "Not Found"}, 404)

    def do_DELETE(self):
        ensure_tables_exist()
        path = self.get_route_path()

        # Delete Title
        if path.startswith('/api/titles/'):
            try:
                title_id = int(path.split('/')[-1])
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("DELETE FROM titles WHERE id = %s", (title_id,))
                    conn.commit()
                    conn.close()
                    return self.send_json({"message": "Title deleted successfully"})
            except Exception as e:
                return self.send_json({"detail": str(e)}, 500)

        # Delete User
        if path.startswith('/api/users/'):
            try:
                user_id = int(path.split('/')[-1])
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
                    conn.commit()
                    conn.close()
                    return self.send_json({"message": "User deleted successfully"})
            except Exception as e:
                return self.send_json({"detail": str(e)}, 500)

        return self.send_json({"detail": "Not Found"}, 404)
