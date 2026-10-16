import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const categories = new Hono()
const prisma = new PrismaClient()

// GET /api/categories (ajax list with location count)
categories.get('/', async (c) => {
  const data = await prisma.category.findMany({
    include: {
      _count: {
        select: { locations: true }
      }
    }
  })

  // Format to match old Laravel output if necessary, or just return as is
  const formatted = data.map((cat: any) => ({
    ...cat,
    locations_count: cat._count.locations
  }))

  return c.json({ data: formatted })
})

// GET /api/categories/stats (top 10 categories by location count)
categories.get('/stats', async (c) => {
  const data = await prisma.category.findMany({
    include: {
      _count: {
        select: { locations: true }
      }
    },
    orderBy: {
      locations: {
        _count: 'desc'
      }
    },
    take: 10
  })

  const formatted = data.map((cat: any) => ({
    ...cat,
    locations_count: cat._count.locations
  }))

  return c.json(formatted)
})

// GET /api/categories/:id
categories.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const category = await prisma.category.findUnique({ where: { id_category: id } })

  if (!category) {
    return c.json({ message: 'Category not found' }, 404)
  }
  return c.json(category)
})

// POST /api/categories
categories.post('/', async (c) => {
  const body = await c.req.json()
  // Basic validation (Laravel form request validation equivalent)
  if (!body.name_category) {
    return c.json({ message: 'name_category is required' }, 400)
  }

  try {
    const category = await prisma.category.create({
      data: {
        name_category: body.name_category
      }
    })
    return c.json({ message: 'Category created successfully.', data: category }, 201)
  } catch (error) {
    return c.json({ message: 'Error creating category', error }, 500)
  }
})

// PATCH /api/categories/:id
categories.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  try {
    const category = await prisma.category.update({
      where: { id_category: id },
      data: {
        name_category: body.name_category
      }
    })
    return c.json({ message: 'Category updated successfully.', data: category })
  } catch (error) {
    return c.json({ message: 'Error updating category', error }, 500)
  }
})

// DELETE /api/categories/:id
categories.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  try {
    await prisma.category.delete({
      where: { id_category: id }
    })
    return c.json({ message: 'Category deleted successfully.' })
  } catch (error) {
    return c.json({ message: 'Error deleting category', error }, 500)
  }
})

export default categories
