import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes      from './routes/auth.js'
import profileRoutes   from './routes/profile.js'
import priceListRoutes from './routes/price-list.js'
import messagesRoutes  from './routes/messages.js'
import { isDevMode } from './utils/twilio.js'

const app = express()

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json({ limit: '64kb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, devMode: isDevMode })
})

app.use('/api/auth',       authRoutes)
app.use('/api/profile',   profileRoutes)
app.use('/api/price-list', priceListRoutes)
app.use('/api/messages',  messagesRoutes)

app.use((_req, res) => res.status(404).json({ error: 'not_found' }))

const PORT = Number(process.env.PORT) || 3001

if (!process.env.JWT_SECRET) {
  console.error(
    '\nFATAL: JWT_SECRET is not set. Copy server/.env.example to server/.env first.\n',
  )
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`OtaExpress API listening on http://localhost:${PORT}`)
  if (isDevMode) {
    console.log(
      '⚠️  Running in DEV MODE — no Twilio credentials detected. ' +
        'Use code "123456" to verify any phone number.',
    )
  } else {
    console.log('✓ Twilio Verify enabled.')
  }
})
