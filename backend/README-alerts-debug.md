## How to debug missing email alerts

1) Confirm SMTP vars are set in the shell running `python app.py`:
```
echo $env:SMTP_HOST
echo $env:SMTP_USER
echo $env:SMTP_PASS  # should print something (obfuscated in your terminal history)
echo $env:EMAIL_FROM
```

2) Check backend logs when you trigger malware. You should see one of:
- `Email skipped: SMTP config missing...` → set SMTP_* vars and restart.
- `Email skipped: dest missing or opt-out for user ...` → ensure Firestore user doc has `email` and `emailOptIn: true`.
- `Email send failed: ...` → bad credentials / server rejected; fix based on message.

3) Verify Firestore user doc:
- Fields: `email` set, `emailOptIn` true.

4) Use this test trigger:
```
$body='{"url":"https://secure.eicar.org/eicar.com.txt","userId":"<UID>"}'
Invoke-RestMethod -Uri http://localhost:5000/scan-url -Method Post -ContentType "application/json" -Body $body
```

5) Common SMTP examples
- Gmail: host `smtp.gmail.com`, port `587`, TLS on, user = your Gmail, pass = 16-char app password (not your normal password).
- Outlook/Office365: host `smtp.office365.com`, port `587`, TLS on, user = your UPN, pass = app password or regular if allowed.
