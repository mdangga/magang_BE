import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { unlink } from 'node:fs/promises'
import path from 'node:path'

const locations = new Hono()
const prisma = new PrismaClient()

// GET /api/locations (Admin: list all locations)
locations.get('/', async (c) => {
  const data = await prisma.location.findMany({
    include: {
      category: { select: { id_category: true, name_category: true } },
      department: { 
        select: { id_department: true, name_department: true, degree_level: true, id_faculty: true, faculty: { select: { id_faculty: true, name_faculty: true } } }
      },
      images: { select: { id_image: true, id_location: true, image_path: true, alt_text: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return c.json({ data })
})

// GET /api/locations/approved (Public: get approved locations)
locations.get('/approved', async (c) => {
  try {
    const data = await prisma.location.findMany({
      select: {
        id_location: true,
        id_category: true,
        name_location: true,
        description: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        category: { select: { id_category: true, name_category: true } },
        images: { select: { id_location: true, image_path: true } }
      },
      where: {
        approved_at: { not: null }
      }
    })

    const formatted = data.map((loc: any) => ({
      ...loc,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude)
    }))

    return c.json(formatted)
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// GET /api/locations/:id
locations.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)

  try {
    const location = await prisma.location.findUnique({
      where: { id_location: id },
      select: {
        id_location: true, id_category: true, id_department: true, student_name: true, nim: true,
        name_location: true, description: true, contact: true, longitude: true, latitude: true,
        createdAt: true, approved_at: true,
        category: { select: { id_category: true, name_category: true } },
        department: { 
          select: { id_department: true, name_department: true, degree_level: true, id_faculty: true, faculty: { select: { id_faculty: true, name_faculty: true } } }
        },
        images: { select: { id_image: true, id_location: true, image_path: true, alt_text: true } }
      }
    })

    if (!location) return c.json({ message: 'Location not found' }, 404)

    return c.json({
      ...location,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude)
    })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

// POST /api/locations (Store location and images)
locations.post('/', async (c) => {
  try {
    const body = await c.req.parseBody()
    
    // Convert necessary fields
    const student_name = body['student_name'] as string
    const nim = body['nim'] as string
    const name_location = body['name_location'] as string
    const description = body['description'] as string
    const contact = body['contact'] as string
    const latitude = parseFloat(body['latitude'] as string)
    const longitude = parseFloat(body['longitude'] as string)
    const id_category = parseInt(body['id_category'] as string)
    const id_department = parseInt(body['id_department'] as string)

    const location = await prisma.location.create({
      data: {
        student_name, nim, name_location, description, contact, latitude, longitude, id_category, id_department
      }
    })

    // Handle multiple file uploads
    const images = body['images[]'] || body['images']
    const imageFiles = Array.isArray(images) ? images : (images ? [images] : [])
    
    for (const file of imageFiles) {
      if (file instanceof File) {
        const ext = file.name.split('.').pop()
        const filename = `location_images/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        const filepath = path.join(process.cwd(), 'public', filename)
        
        await Bun.write(filepath, file)

        await prisma.image.create({
          data: {
            id_location: location.id_location,
            image_path: filename,
            alt_text: name_location
          }
        })
      }
    }

    return c.json({ message: 'Location request submitted successfully.', data: location }, 201)
  } catch (error: any) {
    return c.json({ message: 'Error creating location', error: error.message }, 500)
  }
})

// PATCH /api/locations/:id/approve
locations.patch('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'))
  
  try {
    const location = await prisma.location.update({
      where: { id_location: id },
      data: { approved_at: new Date() }
    })
    return c.json({ message: 'Location approved successfully.', data: location })
  } catch (error: any) {
    return c.json({ message: 'Error approving location', error: error.message }, 500)
  }
})

// DELETE /api/locations/:id
locations.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  try {
    const location = await prisma.location.findUnique({
      where: { id_location: id },
      include: { images: true }
    })

    if (!location) return c.json({ message: 'Location not found' }, 404)

    // Delete image files
    for (const image of location.images) {
      try {
        const filepath = path.join(process.cwd(), 'public', image.image_path)
        await unlink(filepath)
      } catch (e) {
        // Ignore file not found
      }
    }

    await prisma.location.delete({
      where: { id_location: id }
    })

    return c.json({ message: 'Location deleted successfully.' })
  } catch (error: any) {
    return c.json({ message: 'Error deleting location', error: error.message }, 500)
  }
})

// POST /api/locations/generate-link
locations.post('/generate-link', async (c) => {
  // In a real scenario, use JWT or store a token in DB. 
  // For simplicity, we just generate a timestamp-based token.
  const token = Buffer.from(Date.now().toString()).toString('base64')
  
  // Assuming frontend is running on localhost:5173 for development
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const link = `${baseUrl}/locations/create?token=${token}`

  return c.json({ link })
})

export default locations
