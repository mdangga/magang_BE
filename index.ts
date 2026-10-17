import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PrismaClient } from '@prisma/client'
import categories from './routes/categories'
import departments from './routes/departments'
import faculties from './routes/faculties'
import locations from './routes/locations'
import profile from './routes/profile'
import auth from './routes/auth'
import reports from './routes/reports'
import { serveStatic } from 'hono/bun'

const app = new Hono()
const prisma = new PrismaClient()

app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://nama-web-kamu.vercel.app'
  ],

  // Metode HTTP yang diizinkan
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  allowHeaders: ['Content-Type', 'Authorization'],

  credentials: true,
}))

// Serve static files for location images, logos, and reports uploads
app.use('/public/*', serveStatic({ root: './' }))
app.use('/location_images/*', serveStatic({ root: './public' }))
app.use('/logos/*', serveStatic({ root: './public' }))
app.use('/reports/*', serveStatic({ root: './public' }))
app.use('/storage/*', serveStatic({ root: './public' }))

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono Backend API' })
})

app.route('/api/auth', auth)
app.route('/api/categories', categories)
app.route('/api/departments', departments)
app.route('/api/faculties', faculties)
app.route('/api/locations', locations)
app.route('/api/profile', profile)
app.route('/api/reports', reports)

export { app }
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}