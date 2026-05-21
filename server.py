import os
import sqlite3
import secrets
from datetime import datetime
from flask import (
    Flask, request, jsonify, session,
    send_from_directory, redirect, url_for
)
import bcrypt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "data", "portfolio.db")

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")

# Persist the secret key across restarts so sessions survive
_KEY_FILE = os.path.join(BASE_DIR, "data", ".secret_key")

def _load_secret_key():
    os.makedirs(os.path.dirname(_KEY_FILE), exist_ok=True)
    if os.path.exists(_KEY_FILE):
        with open(_KEY_FILE, "r") as f:
            key = f.read().strip()
            if key:
                return key
    key = secrets.token_hex(32)
    with open(_KEY_FILE, "w") as f:
        f.write(key)
    return key

app.secret_key = os.environ.get("SECRET_KEY") or _load_secret_key()


# ── Database ─────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS admin (
                id        INTEGER PRIMARY KEY,
                username  TEXT UNIQUE NOT NULL,
                password  TEXT NOT NULL,
                created   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                name      TEXT NOT NULL,
                email     TEXT NOT NULL,
                subject   TEXT NOT NULL,
                message   TEXT NOT NULL,
                is_read   INTEGER NOT NULL DEFAULT 0,
                received  TEXT NOT NULL
            );
        """)


# ── Auth helpers ──────────────────────────────────────────────────────────────

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_exists():
    with get_db() as conn:
        return conn.execute("SELECT 1 FROM admin LIMIT 1").fetchone() is not None


# ── Static pages ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/admin/")
@app.route("/admin")
def admin_root():
    if not admin_exists():
        return redirect("/admin/setup")
    return redirect("/admin/login")


@app.route("/admin/setup")
def admin_setup_page():
    if admin_exists():
        return redirect("/admin/login")
    return send_from_directory(os.path.join(BASE_DIR, "admin"), "setup.html")


@app.route("/admin/login")
def admin_login_page():
    if session.get("admin"):
        return redirect("/admin/dashboard")
    return send_from_directory(os.path.join(BASE_DIR, "admin"), "login.html")


@app.route("/admin/dashboard")
def admin_dashboard_page():
    if not session.get("admin"):
        return redirect("/admin/login")
    return send_from_directory(os.path.join(BASE_DIR, "admin"), "dashboard.html")


# ── API: setup & auth ─────────────────────────────────────────────────────────

@app.route("/api/admin/check-setup")
def api_check_setup():
    return jsonify({"setup": admin_exists()})


@app.route("/api/admin/setup", methods=["POST"])
def api_admin_setup():
    if admin_exists():
        return jsonify({"error": "Admin already created"}), 409
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO admin (username, password, created) VALUES (?, ?, ?)",
            (username, hashed, datetime.utcnow().isoformat())
        )
    return jsonify({"ok": True})


@app.route("/api/admin/login", methods=["POST"])
def api_admin_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM admin WHERE username = ?", (username,)
        ).fetchone()
    if not row or not bcrypt.checkpw(password.encode(), row["password"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401
    session["admin"] = row["username"]
    session.permanent = True
    return jsonify({"ok": True, "username": row["username"]})


@app.route("/api/admin/logout", methods=["POST"])
def api_admin_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/admin/me")
def api_admin_me():
    if session.get("admin"):
        return jsonify({"username": session["admin"]})
    return jsonify({"error": "Not logged in"}), 401


# ── API: contact messages ─────────────────────────────────────────────────────

@app.route("/api/contact", methods=["POST"])
def api_contact():
    data = request.get_json(silent=True) or {}
    name    = (data.get("name")    or "").strip()
    email   = (data.get("email")   or "").strip()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()
    if not all([name, email, subject, message]):
        return jsonify({"error": "All fields required"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Invalid email"}), 400
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (name, email, subject, message, received) VALUES (?,?,?,?,?)",
            (name, email, subject, message, datetime.utcnow().isoformat())
        )
    return jsonify({"ok": True})


@app.route("/api/admin/messages")
@admin_required
def api_get_messages():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM messages ORDER BY received DESC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/messages/<int:msg_id>/read", methods=["PATCH"])
@admin_required
def api_mark_read(msg_id):
    data = request.get_json(silent=True) or {}
    is_read = 1 if data.get("is_read", True) else 0
    with get_db() as conn:
        conn.execute("UPDATE messages SET is_read=? WHERE id=?", (is_read, msg_id))
    return jsonify({"ok": True})


@app.route("/api/admin/messages/<int:msg_id>", methods=["DELETE"])
@admin_required
def api_delete_message(msg_id):
    with get_db() as conn:
        conn.execute("DELETE FROM messages WHERE id=?", (msg_id,))
    return jsonify({"ok": True})


@app.route("/api/admin/stats")
@admin_required
def api_stats():
    with get_db() as conn:
        total  = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        unread = conn.execute("SELECT COUNT(*) FROM messages WHERE is_read=0").fetchone()[0]
    return jsonify({"total": total, "unread": unread})


# ── Catch-all for static files ────────────────────────────────────────────────

@app.route("/<path:path>")
def static_files(path):
    full = os.path.join(BASE_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(BASE_DIR, path)
    return "Not found", 404


if __name__ == "__main__":
    init_db()
    print("\n  Portfolio server running at http://localhost:5000")
    print("  Admin panel:  http://localhost:5000/admin\n")
    app.run(debug=True, port=5000)
