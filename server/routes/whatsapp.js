const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const BASE = 'https://graph.facebook.com/v19.0';

function token() { return process.env.WHATSAPP_ACCESS_TOKEN; }
function phoneNumberId() { return process.env.WHATSAPP_PHONE_NUMBER_ID; }

// ── Webhook verification ────────────────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': verify, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && verify === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.send(challenge);
  }
  res.sendStatus(403);
});

// ── Incoming messages ───────────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field === 'messages') {
          processIncoming(change.value).catch(console.error);
        }
      }
    }
  }
  res.sendStatus(200);
});

async function processIncoming(value) {
  for (const msg of (value.messages || [])) {
    const waId = msg.from;
    const text = msg.text?.body || msg.caption || '[media]';

    // Find or create contact by WhatsApp ID
    let contact = db.prepare('SELECT id FROM contacts WHERE whatsapp_id = ?').get(waId);
    if (!contact) {
      // Try matching by phone number (strip leading + or country code)
      const phone = waId.replace(/^(\d{1,3})/, '+$1');
      contact = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone);
    }

    let contact_id = contact?.id;
    if (!contact_id) {
      const profile = value.contacts?.find(c => c.wa_id === waId);
      const name = profile?.profile?.name || waId;
      const r = db.prepare(`
        INSERT INTO contacts (first_name, phone, whatsapp_id, source, status)
        VALUES (?, ?, ?, 'whatsapp', 'lead')
      `).run(name, waId, waId);
      contact_id = r.lastInsertRowid;
    } else {
      db.prepare("UPDATE contacts SET whatsapp_id=? WHERE id=?").run(waId, contact_id);
    }

    // Store message
    db.prepare(`
      INSERT OR IGNORE INTO whatsapp_messages (message_id, contact_id, direction, type, body, status, timestamp)
      VALUES (?, ?, 'inbound', ?, ?, 'received', datetime('now'))
    `).run(msg.id, contact_id, msg.type || 'text', text);

    // Mirror into notes
    db.prepare(`
      INSERT INTO notes (contact_id, type, body, direction) VALUES (?, 'whatsapp', ?, 'inbound')
    `).run(contact_id, text);
  }

  // Handle status updates
  for (const status of (value.statuses || [])) {
    db.prepare("UPDATE whatsapp_messages SET status=? WHERE message_id=?").run(status.status, status.id);
  }
}

// ── Send text message ───────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  const { contact_id, to, message, template_name, template_language, template_components } = req.body;

  let recipient = to;
  let cid = contact_id;

  if (contact_id && !to) {
    const c = db.prepare('SELECT whatsapp_id, phone FROM contacts WHERE id = ?').get(contact_id);
    if (!c) return res.status(404).json({ error: 'Contact not found' });
    recipient = c.whatsapp_id || c.phone?.replace(/[^0-9]/g, '');
  }

  if (!recipient) return res.status(400).json({ error: 'recipient required' });

  try {
    let payload;
    if (template_name) {
      payload = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: template_name,
          language: { code: template_language || 'en_US' },
          components: template_components || []
        }
      };
    } else {
      if (!message) return res.status(400).json({ error: 'message required' });
      payload = {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: message }
      };
    }

    const { data } = await axios.post(`${BASE}/${phoneNumberId()}/messages`, payload, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }
    });

    const msgId = data.messages?.[0]?.id;
    if (msgId && cid) {
      db.prepare(`
        INSERT OR IGNORE INTO whatsapp_messages (message_id, contact_id, direction, type, body, status)
        VALUES (?, ?, 'outbound', 'text', ?, 'sent')
      `).run(msgId, cid, message || `[template:${template_name}]`);

      db.prepare(`INSERT INTO notes (contact_id, type, body, direction) VALUES (?, 'whatsapp', ?, 'outbound')`).run(cid, message || `[template:${template_name}]`);
    }

    res.json({ message_id: msgId, status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ── List conversations ──────────────────────────────────────────────────────
router.get('/conversations', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.first_name, c.last_name, c.whatsapp_id, c.phone,
      (SELECT body FROM whatsapp_messages WHERE contact_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM whatsapp_messages WHERE contact_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_at,
      (SELECT COUNT(*) FROM whatsapp_messages WHERE contact_id=c.id AND direction='inbound' AND status='received') as unread
    FROM contacts c
    WHERE c.whatsapp_id IS NOT NULL OR EXISTS(SELECT 1 FROM whatsapp_messages WHERE contact_id=c.id)
    ORDER BY last_at DESC
  `).all();
  res.json(rows);
});

// ── Message thread for a contact ────────────────────────────────────────────
router.get('/messages/:contact_id', (req, res) => {
  const msgs = db.prepare(`
    SELECT * FROM whatsapp_messages WHERE contact_id=? ORDER BY timestamp ASC
  `).all(req.params.contact_id);
  res.json(msgs);
});

// ── Templates list ──────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!wabaId) return res.status(400).json({ error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' });
  try {
    const { data } = await axios.get(`${BASE}/${wabaId}/message_templates`, {
      params: { access_token: token(), fields: 'name,status,language,category,components', limit: 100 }
    });
    res.json(data.data || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
