import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const departments = new Hono()
const prisma = new PrismaClient()

// GET /api/departments (ajax list)
departments.get('/', async (c) => {
  const data = await prisma.department.findMany({
    include: {
      faculty: {
        select: { id_faculty: true, name_faculty: true }
      },
      _count: {
        select: { locations: true }
      }
    }
  })

  const formatted = data.map((dep: any) => ({
    ...dep,
    locations_count: dep._count.locations
  }))

  return c.json({ data: formatted })
})

// GET /api/departments/:id
departments.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const department = await prisma.department.findUnique({
    where: { id_department: id },
    include: { faculty: true }
  })

  if (!department) {
    return c.json({ message: 'Department not found' }, 404)
  }
  return c.json(department)
})

// POST /api/departments
departments.post('/', async (c) => {
  const body = await c.req.json()

  try {
    const department = await prisma.department.create({
      data: {
        name_department: body.name_department,
        degree_level: body.degree_level,
        id_faculty: body.id_faculty
      }
    })
    return c.json({ message: 'Department created successfully.', data: department }, 201)
  } catch (error) {
    return c.json({ message: 'Error creating department', error }, 500)
  }
})

// PATCH /api/departments/:id
departments.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  try {
    const department = await prisma.department.update({
      where: { id_department: id },
      data: {
        name_department: body.name_department,
        degree_level: body.degree_level,
        id_faculty: body.id_faculty
      }
    })
    return c.json({ message: 'Department updated successfully.', data: department })
  } catch (error) {
    return c.json({ message: 'Error updating department', error }, 500)
  }
})

// DELETE /api/departments/:id
departments.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  try {
    await prisma.department.delete({
      where: { id_department: id }
    })
    return c.json({ message: 'Department deleted successfully.' })
  } catch (error) {
    return c.json({ message: 'Error deleting department', error }, 500)
  }
})

export default departments
