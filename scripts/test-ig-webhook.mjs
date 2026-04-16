import crypto from 'node:crypto';

const WEBHOOK_SECRET = 'penra_secret_verify_token_2024'; 
const WEBHOOK_URL = 'http://localhost:3000/api/instagram/webhook/comment';

async function sendTestWebhook(payload) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

  console.log(`\n--- Test pour: ${payload.entry[0].changes?.[0]?.field || 'messaging'} ---`);
  
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Penra-Signature': signature,
        'X-Hub-Signature-256': `sha256=${signature}`,
        'X-Event-Id': `test-${Date.now()}`
      },
      body
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      console.log('Réponse (JSON):', data);
    } catch (e) {
      console.log('Réponse (Texte):', text);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi:', error.message);
  }
}

async function runTests() {
  const commentPayload = {
    object: 'instagram',
    entry: [{
      id: 'entry-123',
      time: Math.floor(Date.now() / 1000),
      changes: [{
        field: 'comments',
        value: {
          id: 'comment-123',
          text: 'Hello PENRA!',
          from: { id: 'user-789', username: 'testuser' },
          media: { id: 'media-456' }
        }
      }]
    }]
  };

  const dmPayload = {
    object: 'instagram',
    entry: [{
      id: 'entry-123',
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender: { id: 'user-789' },
        recipient: { id: 'my-ig-id' },
        timestamp: Date.now(),
        message: {
          mid: 'mid-123',
          text: 'Salut, je voudrais des infos !'
        }
      }]
    }]
  };

  await sendTestWebhook(commentPayload);
  await sendTestWebhook(dmPayload);
}

runTests();
