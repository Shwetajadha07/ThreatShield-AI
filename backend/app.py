from flask import Flask, request, jsonify, send_file  # type: ignore
from flask_cors import CORS  # type: ignore
import hashlib
import os
import tempfile
from datetime import datetime, timezone
import requests # type: ignore
from io import BytesIO
from urllib.parse import urlparse
import os.path as op
# Firebase admin (for Firestore + FCM)
import firebase_admin # type: ignore
from firebase_admin import credentials, firestore, messaging  # type: ignore

# Email (optional)
import smtplib
from email.message import EmailMessage
import ssl

app = Flask(__name__)
CORS(app)

# --- Firebase Admin bootstrap ---
def init_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
    elif sa_json:
        cred = credentials.Certificate(sa_json)  # expects JSON string
    else:
        raise RuntimeError("Service account not set. Define GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.")
    return firebase_admin.initialize_app(cred)


def firestore_client():
    init_firebase()
    return firestore.client()


# --- Detection helper (placeholder — swap with ClamAV) ---
def detect_malware(content: bytes) -> bool:
    """
    Lightweight placeholder detector.
    - Matches EICAR test string (standard AV test pattern)
    - Flags obvious keywords "virus" or "malware"
    Replace this with a real AV engine (e.g., ClamAV) for production.
    """
    eicar = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    lowered = content.lower()
    return eicar in content or b"virus" in lowered or b"malware" in lowered


# --- Notification helpers ---
def send_push(user_id: str, title: str, body: str):
    try:
        db = firestore_client()
        tokens_ref = db.collection("users").document(user_id).collection("tokens")
        tokens = [t.get("token") for t in tokens_ref.stream() if t.get("token")]
        if not tokens:
            return
        # Fallback for very old firebase_admin: send one-by-one.
        for tkn in tokens:
            msg = messaging.Message(
                token=tkn,
                notification=messaging.Notification(title=title, body=body),
                data={"userId": user_id},
            )
            messaging.send(msg)
    except Exception as exc:  # pragma: no cover
        app.logger.warning("Push send failed: %s", exc)


def send_email(user_id: str, subject: str, body: str):
    """
    Send an email alert if the user has email + emailOptIn set.
    Priority: SendGrid HTTP if SENDGRID_API_KEY is set; otherwise SMTP.
    SMTP envs:
      SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, EMAIL_FROM (or uses SMTP_USER)
      SMTP_USE_TLS=true|false (default true)
    SendGrid envs:
      SENDGRID_API_KEY, EMAIL_FROM (or default), optional EMAIL_FROM_NAME
    """
    sg_key = os.getenv("SENDGRID_API_KEY")
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    pwd = os.getenv("SMTP_PASS")
    from_addr = os.getenv("EMAIL_FROM") or user or os.getenv("EMAIL_FROM_NAME")
    from_name = os.getenv("EMAIL_FROM_NAME", "ThreatShield")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
    try:
        db = firestore_client()
        user_doc = db.collection("users").document(user_id).get()
        dest_email = user_doc.get("email")
        email_opt_in = user_doc.get("emailOptIn")
        if not (dest_email and email_opt_in):
            app.logger.info("Email skipped: dest missing or opt-out for user %s", user_id)
            return
        # Send via SendGrid if key present
        if sg_key:
            headers = {
                "Authorization": f"Bearer {sg_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "personalizations": [{"to": [{"email": dest_email}]}],
                "from": {"email": from_addr or "alerts@threatshield.local", "name": from_name},
                "subject": subject,
                "content": [{"type": "text/plain", "value": body}],
            }
            resp = requests.post("https://api.sendgrid.com/v3/mail/send", headers=headers, json=payload, timeout=10)
            if resp.status_code >= 300:
                app.logger.warning("Email send failed (SendGrid): %s %s", resp.status_code, resp.text)
            return

        # Fallback to SMTP
        if not all([host, port, user, pwd, from_addr]):
            app.logger.warning("Email skipped: SMTP config missing (HOST/USER/PASS/FROM)")
            return
        msg = EmailMessage()
        msg["From"] = from_addr
        msg["To"] = dest_email
        msg["Subject"] = subject
        msg.set_content(body)
        if use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls(context=context)
                server.login(user, pwd)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.login(user, pwd)
                server.send_message(msg)
    except Exception as exc:  # pragma: no cover
        app.logger.warning("Email send failed: %s", exc)


def email_enabled() -> bool:
    return True

def send_webhook(user_id: str, text: str):
    """
    Optional: send alert to a single webhook URL (Slack/Discord/Teams-style).
    Env: ALERT_WEBHOOK_URL
    """
    url = os.getenv("ALERT_WEBHOOK_URL")
    if not url:
        return
    try:
        # Try generic JSON payload that works for Slack/Discord (Discord expects "content")
        payload = {"text": text, "content": text, "username": "ThreatShield"}
        resp = requests.post(url, json=payload, timeout=8)
        if resp.status_code >= 300:
            app.logger.warning("Webhook send failed: %s %s", resp.status_code, resp.text)
    except Exception as exc:  # pragma: no cover
        app.logger.warning("Webhook send failed: %s", exc)


def record_threat(db, *, user_id: str, indicator: str, status: str, file_hash: str):
    now_iso = datetime.now(timezone.utc).isoformat()
    db.collection("threats").add(
        {
            "userId": user_id,
            "indicator": indicator,
            "status": status,
            "hash": file_hash,
            "date": now_iso,
        }
    )


@app.route("/")
def home():
    return {"message": "ThreatShield AI Backend Running 🚀"}


@app.route("/scan", methods=["POST"])
def scan_file():
    file = request.files["file"]
    content = file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    malicious = detect_malware(content)
    result = "⚠️ Malware Detected!" if malicious else "✅ File is Safe"

    # Optional: accept userId to send notifications and record threat
    user_id = request.form.get("userId") or request.args.get("userId")
    if malicious and user_id:
        try:
            db = firestore_client()
            record_threat(db, user_id=user_id, indicator=file.filename or "uploaded-file", status="active", file_hash=file_hash)
            alert_body = f"Malware detected in uploaded file: {file.filename or 'file'}"
            send_push(user_id, "ThreatShield Alert", alert_body)
            if email_enabled():
                send_email(user_id, "ThreatShield Alert", alert_body)
            send_webhook(user_id, alert_body)
        except Exception as exc:  # pragma: no cover
            app.logger.warning("Persistence/notify failed (scan file): %s", exc)

    return jsonify({"result": result, "hash": file_hash})


@app.route("/scan-upload-download", methods=["POST"])
def scan_upload_download():
    """Scan an uploaded file and stream it back only if clean; block otherwise."""
    if "file" not in request.files:
        return {"error": "file is required"}, 400
    file = request.files["file"]
    content = file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    malicious = detect_malware(content)
    user_id = request.form.get("userId") or request.args.get("userId")

    if malicious:
        if user_id:
            try:
                db = firestore_client()
                record_threat(db, user_id=user_id, indicator=file.filename or "uploaded-file", status="active", file_hash=file_hash)
                alert_body = f"Malware detected in uploaded file: {file.filename or 'file'}"
                send_push(user_id, "ThreatShield Alert", alert_body)
                if email_enabled():
                    send_email(user_id, "ThreatShield Alert", alert_body)
                send_webhook(user_id, alert_body)
            except Exception as exc:  # pragma: no cover
                app.logger.warning("Persistence/notify failed (scan-upload-download): %s", exc)
        return {"error": "Malware detected", "hash": file_hash}, 403

    mimetype = file.mimetype or "application/octet-stream"
    download_name = file.filename or "clean-file.bin"
    return send_file(BytesIO(content), mimetype=mimetype, as_attachment=True, download_name=download_name)


@app.route("/scan-url", methods=["POST"])
def scan_url():
    data = request.get_json(force=True)
    url = data.get("url")
    user_id = data.get("userId")
    if not url or not user_id:
        return {"error": "url and userId are required"}, 400

    try:
        with tempfile.NamedTemporaryFile(delete=True) as tmp:
            with requests.get(url, stream=True, timeout=20) as resp:
                resp.raise_for_status()
                for chunk in resp.iter_content(chunk_size=8192):
                    tmp.write(chunk)
            tmp.seek(0)
            content = tmp.read()
    except Exception as exc:
        return {"error": f"download failed: {exc}"}, 502

    file_hash = hashlib.sha256(content).hexdigest()
    malicious = detect_malware(content)
    status = "active" if malicious else "clean"
    verdict = "⚠️ Malware detected" if malicious else "✅ File is clean"

    # Persist + notify
    try:
        db = firestore_client()
        record_threat(db, user_id=user_id, indicator=url, status=status, file_hash=file_hash)
        if malicious:
            alert_body = f"Malware detected in {url}"
            send_push(user_id, "ThreatShield Alert", alert_body)
            if email_enabled():
                send_email(user_id, "ThreatShield Alert", alert_body)
            send_webhook(user_id, alert_body)
    except Exception as exc:  # pragma: no cover
        app.logger.warning("Persistence/notify failed: %s", exc)

    return jsonify({"result": verdict, "hash": file_hash, "status": status})


@app.route("/fetch-download", methods=["POST"])
def fetch_download():
    data = request.get_json(force=True)
    url = data.get("url")
    user_id = data.get("userId")
    if not url:
        return {"error": "url is required"}, 400
    try:
        resp = requests.get(url, timeout=25)
        resp.raise_for_status()
        content = resp.content
    except Exception as exc:
        return {"error": f"download failed: {exc}"}, 502

    file_hash = hashlib.sha256(content).hexdigest()
    malicious = detect_malware(content)
    status = "active" if malicious else "clean"
    indicator = url

    if user_id:
        try:
            db = firestore_client()
            record_threat(db, user_id=user_id, indicator=indicator, status=status, file_hash=file_hash)
            if malicious:
                alert_body = f"Malware detected in {url}"
                send_push(user_id, "ThreatShield Alert", alert_body)
                if email_enabled():
                    send_email(user_id, "ThreatShield Alert", alert_body)
                send_webhook(user_id, alert_body)
        except Exception as exc:  # pragma: no cover
            app.logger.warning("Persistence/notify failed (fetch-download): %s", exc)

    if malicious:
        return {"error": "Malware detected"}, 403

    # derive filename
    parsed = urlparse(url)
    filename = op.basename(parsed.path) or "download.bin"
    mimetype = resp.headers.get("content-type", "application/octet-stream")
    return send_file(BytesIO(content), mimetype=mimetype, as_attachment=True, download_name=filename)


if __name__ == "__main__":
    app.run(debug=True)
