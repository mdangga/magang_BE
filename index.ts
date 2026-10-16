import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { PrismaClient } from '@prisma/client'
import categories from './routes/categories'
import departments from './routes/departments'
import faculties from './routes/faculties'
import locations from './routes/locations'
import profile from './routes/profile'
import auth from './routes/auth'
import { serveStatic } from 'hono/bun'

const app = new Hono()
const prisma = new PrismaClient()

app.use('*', cors())

// Serve static files for location images and uploads
app.use('/public/*', serveStatic({ root: './' }))
app.use('/location_images/*', serveStatic({ root: './public' }))
app.use('/logos/*', serveStatic({ root: './public' }))
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

export { app }
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}