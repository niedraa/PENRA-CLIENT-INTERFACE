# PENRA Go-Live Checklist

## Security First
1. Rotate all leaked secrets now (Twilio Auth Token, Twilio API Key Secret, JWT secret).
2. Update production secrets in deployment environment variables.
3. Keep local .env out of version control (already ignored).

## Required Integrations
1. Twilio: set Voice URL to https://api.your-domain.com/api/twilio/voice.
2. Twilio: set Status Callback URL to https://api.your-domain.com/api/twilio/status.
3. Meta: configure OAuth redirect URI https://api.your-domain.com/api/instagram/oauth/callback.
4. ElevenLabs: set ELEVENLABS_API_KEY if voice list is required.

## Runtime Configuration
1. Use .env.production.example as template.
2. Set NODE_ENV=production.
3. Set PUBLIC_API_BASE_URL to your public API domain.
4. Set CORS_ORIGIN to your frontend domain only.

## Final Validation (10 minutes)
1. Open /api/health and confirm ok=true.
2. Log in as admin and open integration status endpoint.
3. Create one client and one agent.
4. Provision one Twilio number from admin workflow.
5. Place one live call to the provisioned number and confirm call appears in agent calls.
6. Test one Instagram automation trigger path.

## Rollback Plan
1. Keep previous release artifact available.
2. Keep database backup before go-live.
3. If incident: roll back app version, restore previous env vars, re-run health checks.
