import { describe, expect, it, mock } from 'bun:test'

// Mocking Prisma so tests don't hit the actual database
mock.module('@prisma/client', () => {
  return {
    PrismaClient: class {
      category = {
        findMany: mock(async () => [{ id_category: 1, name_category: 'Test Category', _count: { locations: 0 } }]),
        findUnique: mock(async () => ({ id_category: 1, name_category: 'Test Category' }))
      }
      department = {
        findMany: mock(async () => [{ id_department: 1, name_department: 'Test Dept', _count: { locations: 0 } }]),
        findUnique: mock(async () => ({ id_department: 1, name_department: 'Test Dept' }))
      }
      faculty = {
        findMany: mock(async () => [{ id_faculty: 1, name_faculty: 'Test Faculty', _count: { departments: 0 } }]),
        findUnique: mock(async () => ({ id_faculty: 1, name_faculty: 'Test Faculty' }))
      }
      location = {
        findMany: mock(async () => [{ id_location: 1, name_location: 'Test Location', latitude: 0, longitude: 0 }]),
        findUnique: mock(async () => ({ id_location: 1, name_location: 'Test Location' }))
      }
      user = {
        findUnique: mock(async () => null)
      }
    }
  }
})

const { app } = await import('../index')

describe('API Routes Unit Tests', () => {
  describe('GET /', () => {
    it('should return 200 and hello message', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.message).toBe('Hello from Hono Backend API')
    })
  })

  describe('Categories API', () => {
    it('GET /api/categories should return an array of categories', async () => {
      const res = await app.request('/api/categories')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
    })

    it('GET /api/categories/:id should return a specific category', async () => {
      const res = await app.request('/api/categories/1')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body).toHaveProperty('id_category', 1)
    })
  })

  describe('Departments API', () => {
    it('GET /api/departments should return an array of departments', async () => {
      const res = await app.request('/api/departments')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
    })
  })

  describe('Faculties API', () => {
    it('GET /api/faculties should return an array of faculties', async () => {
      const res = await app.request('/api/faculties')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
    })
  })

  describe('Locations API', () => {
    it('GET /api/locations should return an array of locations', async () => {
      const res = await app.request('/api/locations')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(body.data).toBeDefined()
      expect(Array.isArray(body.data)).toBe(true)
    })
    
    it('GET /api/locations/approved should return approved locations', async () => {
      const res = await app.request('/api/locations/approved')
      expect(res.status).toBe(200)
      const body = (await res.json()) as any
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('Auth API (Validation checks)', () => {
    it('POST /api/auth/login with no body should return 400', async () => {
      const res = await app.request('/api/auth/login', { method: 'POST' })
      // Assuming it handles bad JSON with a standard Hono error or custom validation error
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
