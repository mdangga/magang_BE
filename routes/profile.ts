import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { unlink } from 'node:fs/promises'
import path from 'node:path'

const profile = new Hono()
const prisma = new PrismaClient()

// GET /api/profile
profile.get('/', async (c) => {
  const data = await prisma.profileWeb.findFirst()
  if (!data) {
    return c.json({ message: 'Profile not found' }, 404)
  }
  return c.json(data)
})

// PATCH /api/profile
profile.patch('/', async (c) => {
  try {
    const body = await c.req.parseBody()
    const currentProfile = await prisma.profileWeb.findFirst()
    
    if (!currentProfile) {
      return c.json({ message: 'Profile not found' }, 404)
    }

    const updateData: any = {}
    if (body['app_name']) updateData.app_name = body['app_name']
    if (body['description']) updateData.description = body['description']

    const logo = body['logo']
    if (logo instanceof File) {
      // delete old logo
      if (currentProfile.logo_path) {
        try {
          const oldPath = path.join(process.cwd(), 'public', currentProfile.logo_path)
          await unlink(oldPath)
        } catch (e) {
          // ignore
        }
      }

      const ext = logo.name.split('.').pop()
      const filename = `logos/logo-${Date.now()}.${ext}`
      const filepath = path.join(process.cwd(), 'public', filename)
      
      await Bun.write(filepath, logo)
      updateData.logo_path = filename
    }

    const updatedProfile = await prisma.profileWeb.update({
      where: { id: currentProfile.id },
      data: updateData
    })

    return c.json({ message: 'Profile updated successfully!', data: updatedProfile })
  } catch (error: any) {
    return c.json({ message: 'Error updating profile', error: error.message }, 500)
  }
})

export default profile
