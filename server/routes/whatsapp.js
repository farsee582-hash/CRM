const express = require('express')
const router = express.Router()
const axios = require('axios')
const { run, get, all } = require('../db')

const BASE = 'https://graph.facebook.com/v19.0'
const token = () => process.env.WHATSAPP_ACCESS_TOKEN
const phoneId = () => process.env.WHATSAPP_PHONE_NUMBER_ID

router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': verify, 'hub.challenge': challenge } = req.query
  if (mode === 'subscribe' && verify === process.env.WHATSAPP_VERIFY_TOKEN) return res.send(challenge)
  res.sendStatus(403)
})

router.post('/webhook', (req, res) => {
  if (req.body.object === 'whatsapp_business_account') {
    for (const entry of (req.body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field === 'messages') processIncoming(change.value).catch(console.error)
      }
    }
  }
  res.sendStatus(200)
})

async function processIncoming(value) {
  for (const msg of (value.messages || [])) {
    const waId = msg.from
    const text = msg.text?.body || msg.caption || '[media]'
    let contact = await get('SELECT id FROM contacts WHERE whatsapp_id=$1', [waId])
    if (!contact) {
      const phone = waId.startsWith('+') ? waId : `+${waId}`
      contact = await get('SELECT id FROM contacts WHERE phone=$1', [phone])
    }
    let contact_id = contact?.id
    if (!contact_id) {
      const profile = value.contacts?.find(c => c.wa_id === waId)
      const name = profile?.profile?.name || waId
      const r = await run(`INSERT INTO contacts (first_name,phone,whatsapp_id,source,status) VALUES ($1,$2,$2,'whatsapp','lead') RETURNING id`, [name, waId])
      contact_id = r.rows[0].id
    } else {
      await run('UPDATE contacts SET whatsapp_id=$1 WHERE id=$2', [waId, contact_id])
    }
    await run(`INSERT INTO whatsapp_messages (message_id,contact_id,direction,type,body,status,timestamp) VALUES ($1,$2,'inbound',$3,$4,'received',NOW()) ON CONFLICT (message_id) DO NOTHING`,
      [msg.id, contact_id, msg.type||'text', text])
    await run(`INSERT INTO notes (contact_id,type,body,direction) VALUES ($1,'whatsapp',$2,'inbound')`, [contact_id, text])
  }
  for (const status of (value.statuses || [])) {
    await run('UPDATE whatsapp_messages SET status=$1 WHERE message_id=$2', [status.status, status.id])
  }
}

router.post('/send', async (req, res) => {
  const { contact_id, to, message, template_name, template_language, template_components } = req.body
  let recipient = to
  let cid = contact_id
  if (contact_id && !to) {
    const c = await get('SELECT whatsapp_id, phone FROM contacts WHERE id=$1', [contact_id])
    if (!c) return res.status(404).json({ error: 'Contact not found' })
    recipient = c.whatsapp_id || c.phone?.replace(/[^0-9]/g, '')
  }
  if (!recipient) return res.status(400).json({ error: 'recipient required' })

  const payload = template_name
    ? { messaging_product:'whatsapp', to: recipient, type:'template', template: { name: template_name, language: { code: template_language||'en_US' }, components: template_components||[] } }
    : { messaging_product:'whatsapp', to: recipient, type:'text', text: { body: message } }

  try {
    const { data } = await axios.post(`${BASE}/${phoneId()}/messages`, payload, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }
    })
    const msgId = data.messages?.[0]?.id
    if (msgId && cid) {
      await run(`INSERT INTO whatsapp_messages (message_id,contact_id,direction,type,body,status) VALUES ($1,$2,'outbound','text',$3,'sent') ON CONFLICT (message_id) DO NOTHING`,
        [msgId, cid, message||`[template:${template_name}]`])
      await run(`INSERT INTO notes (contact_id,type,body,direction) VALUES ($1,'whatsapp',$2,'outbound')`, [cid, message||`[template:${template_name}]`])
    }
    res.json({ message_id: msgId, status: 'sent' })
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

router.get('/conversations', async (req, res) => {
  const rows = await all(`
    SELECT c.id, c.first_name, c.last_name, c.whatsapp_id, c.phone,
      (SELECT body FROM whatsapp_messages WHERE contact_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT timestamp FROM whatsapp_messages WHERE contact_id=c.id ORDER BY timestamp DESC LIMIT 1) as last_at
    FROM contacts c
    WHERE c.whatsapp_id IS NOT NULL OR EXISTS(SELECT 1 FROM whatsapp_messages WHERE contact_id=c.id)
    ORDER BY last_at DESC NULLS LAST
  `)
  res.json(rows)
})

router.get('/messages/:contact_id', async (req, res) => {
  const msgs = await all('SELECT * FROM whatsapp_messages WHERE contact_id=$1 ORDER BY timestamp ASC', [req.params.contact_id])
  res.json(msgs)
})

router.get('/templates', async (req, res) => {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  if (!wabaId) return res.status(400).json({ error: 'WHATSAPP_BUSINESS_ACCOUNT_ID not configured' })
  try {
    const { data } = await axios.get(`${BASE}/${wabaId}/message_templates`, {
      params: { access_token: token(), fields: 'name,status,language,category,components', limit: 100 }
    })
    res.json(data.data || [])
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

module.exports = router
