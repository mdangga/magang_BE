import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const faculties = new Hono()
const prisma = new PrismaClient()

// GET /api/faculties (ajax list)
faculties.get('/', async (c) => {
  const data = await prisma.faculty.findMany({
    include: {
      departments: true,
      _count: {
        select: { departments: true }
      }
    }
  })

  const formatted = data.map((fac: any) => ({
    ...fac,
    departments_count: fac._count.departments
  }))

  return c.json({ data: formatted })
})

// GET /api/faculties/:id
faculties.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const faculty = await prisma.faculty.findUnique({ where: { id_faculty: id } })

  if (!faculty) {
    return c.json({ message: 'Faculty not found' }, 404)
  }
  return c.json(faculty)
})

// POST /api/faculties
faculties.post('/', async (c) => {
  const body = await c.req.json()

  try {
    const faculty = await prisma.faculty.create({
      data: {
        name_faculty: body.name_faculty
      }
    })
    return c.json({ message: 'Fakultas berhasil ditambahkan.', data: faculty }, 201)
  } catch (error) {
    return c.json({ message: 'Error creating faculty', error }, 500)
  }
})

// PATCH /api/faculties/:id
faculties.patch('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  try {
    const faculty = await prisma.faculty.update({
      where: { id_faculty: id },
      data: {
        name_faculty: body.name_faculty
      }
    })
    return c.json({ message: 'Fakultas berhasil diperbarui.', data: faculty })
  } catch (error) {
    return c.json({ message: 'Error updating faculty', error }, 500)
  }
})

// DELETE /api/faculties/:id
faculties.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))

  try {
    await prisma.faculty.delete({
      where: { id_faculty: id }
    })
    return c.json({ message: 'Fakultas berhasil dihapus.' })
  } catch (error) {
    return c.json({ message: 'Error deleting faculty', error }, 500)
  }
})

export default faculties
