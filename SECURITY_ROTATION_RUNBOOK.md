# Security Rotation Runbook (Twilio + App Secrets)

## 1. Rotate Twilio Secrets (Console)
1. Go to Twilio Console > Account > API keys & tokens.
2. Create a new API Key (Standard) and save SID + Secret.
3. Rotate Auth Token in the main account settings.
4. Keep Account SID (starts with AC...) unchanged.

## 2. Update Runtime Env
1. Set TWILIO_ACCOUNT_SID to your AC... SID.
2. Set TWILIO_AUTH_TOKEN to the new token.
3. Set TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET to the new key pair.
4. Keep webhook URLs:
- TWILIO_VOICE_WEBHOOK_URL=https://api.your-domain.com/api/twilio/voice
- TWILIO_STATUS_CALLBACK_URL=https://api.your-domain.com/api/twilio/status

## 3. Restart Services
1. Restart backend process.
2. Restart frontend process if needed.

## 4. Validate in 60 seconds
1. Run: node scripts/check-twilio-credentials.mjs
2. Call /api/health and confirm ok=true.
3. Call /api/integrations/status from an admin token and confirm twilio.connected=true.

## 5. Emergency Rollback
1. Revert to previous known-working env values.
2. Restart backend.
3. Re-run validation script and /api/integrations/status.
