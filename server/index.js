require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { init } = require('./db')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '..', 'public')))

app.use('/api/dashboard', require('./routes/dashboard'))
app.use('/api/contacts', require('./routes/contacts'))
app.use('/api/companies', require('./routes/companies'))
app.use('/api/deals', require('./routes/deals'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/notes', require('./routes/notes'))
app.use('/api/meta', require('./routes/meta'))
app.use('/api/whatsapp', require('./routes/whatsapp'))

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  }
})

const PORT = process.env.PORT || 3000

init()
  .then(() => app.listen(PORT, () => console.log(`CRM running on http://localhost:${PORT}`)))
  .catch(err => { console.error('DB init failed:', err.message); process.exit(1) })
