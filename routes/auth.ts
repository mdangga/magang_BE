import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { sign, verify } from 'hono/jwt'
import * as bcrypt from 'bcrypt'

const auth = new Hono()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ message: 'Username and password are required' }, 400)
  }

  const user = await prisma.user.findFirst({
    where: { username }
  })

  if (!user) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  // Laravel default bcrypt
  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    return c.json({ message: 'Invalid credentials' }, 401)
  }

  // Create JWT token
  const payload = {
    id: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  }

  const token = await sign(payload, JWT_SECRET)

  return c.json({
    message: 'Login successful',
    token,
    user: { id: user.id, username: user.username }
  })
})

// GET /api/auth/me (Get current user)
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = await verify(token as string, JWT_SECRET, 'HS256')
    const user = await prisma.user.findUnique({
      where: { id: payload.id as number }
    })

    if (!user) {
      return c.json({ message: 'User not found' }, 404)
    }

    return c.json({ id: user.id, username: user.username })
  } catch (error) {
    return c.json({ message: 'Invalid token' }, 401)
  }
})

// POST /api/auth/logout (Client side deletes the token)
auth.post('/logout', async (c) => {
  return c.json({ message: 'Logout successful' })
})

export default auth
