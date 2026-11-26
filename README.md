# ThreatShield-AI: Intelligent Malware Detection & Alert System

A full-stack web application that detects malicious files and URLs in real time, with secure file scanning, safe download handling and alert-driven threat monitoring.

**Published research:** This system is the subject of a co-authored paper in the *International Journal of Innovative Research in Engineering*, 2026.

## Screenshots

![Dashboard](screenshots/dashboard.png)
![Scanner](screenshots/scanner.png)
![Login] (screenshots/login.png)
![notification] (screenshots/notification.png)
![setting] (screenshots/setting.png)
![threats] (screenshots/threats.png)
![threatscanner] (screenshots/threatscanner.png)
![userlogin] (screenshots/userlogin.png)
![user] (screenshots/user.png)


## Features

- Real-time scanning of uploaded files and submitted URLs
- Secure file scanning and safe download handling
- Real-time alerts through push notifications, email and webhooks
- Dashboards to monitor threats and user activity
- Login and registration with Firebase authentication
- Pages for scanning, threats, reports, settings and user management, plus an admin dashboard
- REST API backend built with Flask

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask, REST APIs |
| Frontend | React (Vite), TypeScript |
| Database / Auth | Firebase |
| Alerts | Firebase push notifications, email (SendGrid or SMTP), webhooks |

## How Detection Works

[WRITE 3-5 SHORT LINES IN YOUR OWN WORDS: what a file goes through when it is scanned, what a URL goes through, and what decides that something is malicious. Name any library or API you use and say which parts you wrote yourself.]

## Project Structure

```
ThreatShield-AI/
  backend/
    app.py                     Flask API (scanning and alerts)
    requirements.txt           Python dependencies
    README-alerts-debug.md     Notes for debugging email and alerts
  frontend/
    public/
      firebase-messaging-sw.js Service worker for push notifications
    src/
      pages/                   Login, Register, Dashboard, Scanner,
                               Threats, Reports, Settings, Users,
                               Admin dashboard
      layouts/                 Admin layout
      hooks/                   Auth and user-role hooks
      utils/scan.ts            Scan helper calls to the API
      firebase.ts              Firebase setup
      messaging.ts             Push notification setup
  README.md
```

## Getting Started

### Prerequisites

- Python 3
- Node.js and npm
- A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/Shwetajadha07/threatshield-ai.git
cd threatshield-ai
```

### 2. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```

### 3. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

### 4. Environment variables

Create a `.env` file in the `backend` folder. This file is not uploaded to GitHub, so never commit it.

```
SENDGRID_API_KEY=your_sendgrid_key_here
EMAIL_FROM=your_sender_email_here
EMAIL_FROM_NAME=your_sender_name_here
```

If you do not use SendGrid, the backend can send email through SMTP instead. See `backend/README-alerts-debug.md` for the SMTP settings.

The frontend uses your own Firebase project settings in `frontend/src/firebase.ts`.

## Testing

Tested manually through functional testing of:

- File upload and URL scanning workflows
- Login, password handling and authentication
- User interactions across the dashboard pages
- Integration between the React frontend, Flask API and Firebase

Integration issues found during development and testing were identified and fixed.

## Research Paper

Co-authored paper on this system:

> [FULL PAPER TITLE]. *International Journal of Innovative Research in Engineering*, 2026. [LINK OR DOI]

**My contribution:** [ONE TRUE LINE, for example the parts you built]

## Safety Note

Test the scanner only with harmless samples such as the EICAR test file. Do not download or upload live malware.

## Author

**Shweta Jadhav**
B.Tech, Computer Science Engineering (AI & Data Science)
[LinkedIn](https://www.linkedin.com/in/shweta-jadhav-327449344/) | shwetajadhav7213@gmail.com
