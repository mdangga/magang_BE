import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { verify } from 'hono/jwt'
import { unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'

const reports = new Hono()
const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

// Helper to authenticate request
const getAuthUser = async (c: any) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = await verify(token as string, JWT_SECRET, 'HS256')
    const user = await prisma.user.findUnique({
      where: { id: payload.id as number }
    })
    return user
  } catch (e) {
    return null
  }
}

// GET /api/reports (List reports)
// If admin: all reports (with optional status/location filter)
// If user: user's own reports
reports.get('/', async (c) => {
  const user = await getAuthUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const status = c.req.query('status')
  const locationId = c.req.query('location_id')
  const search = c.req.query('search')

  const whereClause: any = {}

  if (user.role !== 'admin') {
    whereClause.id_user = user.id
  }

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    whereClause.status = status
  }

  if (locationId) {
    const parsedLoc = parseInt(locationId)
    if (!isNaN(parsedLoc)) {
      whereClause.id_location = parsedLoc
    }
  }

  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { students: { contains: search } },
      { location: { name_location: { contains: search } } }
    ]
  }

  try {
    const data = await prisma.report.findMany({
      where: whereClause,
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true,
            student_name: true,
            nim: true,
            category: { select: { id_category: true, name_category: true } },
            department: { select: { id_department: true, name_department: true } }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return c.json({ data })
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil data laporan', error: error.message }, 500)
  }
})

// GET /api/reports/approved (Publik / Mahasiswa: Melihat laporan yang disetujui sebagai pedoman/referensi adik tingkat)
reports.get('/approved', async (c) => {
  const locationId = c.req.query('location_id')
  const search = c.req.query('search')

  const whereClause: any = {
    status: 'approved'
  }

  if (locationId) {
    const parsedLoc = parseInt(locationId)
    if (!isNaN(parsedLoc)) {
      whereClause.id_location = parsedLoc
    }
  }

  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { students: { contains: search } },
      { description: { contains: search } },
      { location: { name_location: { contains: search } } }
    ]
  }

  try {
    const data = await prisma.report.findMany({
      where: whereClause,
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true,
            category: { select: { id_category: true, name_category: true } },
            department: { select: { id_department: true, name_department: true } }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: { verified_at: 'desc' }
    })

    return c.json({ data })
  } catch (error: any) {
    return c.json({ message: 'Gagal memuat katalog laporan referensi', error: error.message }, 500)
  }
})

// GET /api/reports/:id
reports.get('/:id', async (c) => {
  const user = await getAuthUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)

  try {
    const report = await prisma.report.findUnique({
      where: { id_report: id },
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true,
            student_name: true,
            nim: true,
            category: { select: { id_category: true, name_category: true } },
            department: { select: { id_department: true, name_department: true } }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true
          }
        }
      }
    })

    if (!report) {
      return c.json({ message: 'Laporan tidak ditemukan' }, 404)
    }

    // Hanya admin atau pemilik yang boleh melihat
    if (user.role !== 'admin' && report.id_user !== user.id) {
      return c.json({ message: 'Forbidden' }, 403)
    }

    return c.json({ data: report })
  } catch (error: any) {
    return c.json({ message: 'Gagal mengambil detail laporan', error: error.message }, 500)
  }
})

// POST /api/reports (Upload laporan baru)
reports.post('/', async (c) => {
  const user = await getAuthUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  // Aturan: 1 user hanya memiliki 1 laporan magang
  if (user.role !== 'admin') {
    const existingUserReport = await prisma.report.findFirst({
      where: { id_user: user.id }
    })
    if (existingUserReport) {
      return c.json({
        message: 'Anda sudah mengunggah laporan magang. Silakan gunakan fitur perbarui / revisi laporan untuk mengubah berkas laporan Anda.'
      }, 400)
    }
  }

  try {
    const body = await c.req.parseBody()
    const id_location_raw = body['id_location'] as string
    const title = (body['title'] as string || '').trim()
    const description = (body['description'] as string || '').trim()
    const students = (body['students'] as string || '').trim()
    const file = body['file']

    if (!id_location_raw || !title || !students) {
      return c.json({ message: 'Lokasi magang, judul laporan, dan daftar mahasiswa (Nama & NIM) wajib diisi' }, 400)
    }

    const id_location = parseInt(id_location_raw)
    if (isNaN(id_location)) {
      return c.json({ message: 'Lokasi magang tidak valid' }, 400)
    }

    const location = await prisma.location.findUnique({
      where: { id_location }
    })
    if (!location) {
      return c.json({ message: 'Lokasi magang tidak ditemukan' }, 404)
    }

    if (!file || !(file instanceof File)) {
      return c.json({ message: 'File laporan magang (PDF) wajib diunggah' }, 400)
    }

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    if (!isPdf) {
      return c.json({ message: 'Format berkas harus berupa dokumen PDF (.pdf)' }, 400)
    }

    // Maximum file size 25MB
    if (file.size > 25 * 1024 * 1024) {
      return c.json({ message: 'Ukuran file melebihi batas maksimal 25 MB' }, 400)
    }

    // Ensure directory exists
    const reportsDir = path.join(process.cwd(), 'public', 'reports')
    await mkdir(reportsDir, { recursive: true })

    const safeExt = 'pdf'
    const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${safeExt}`
    const relativePath = `reports/${fileName}`
    const fullFilePath = path.join(process.cwd(), 'public', relativePath)

    await Bun.write(fullFilePath, file)

    const newReport = await prisma.report.create({
      data: {
        title,
        description: description || null,
        students,
        file_path: relativePath,
        file_name: file.name,
        file_size: file.size,
        status: 'pending',
        id_location,
        id_user: user.id
      },
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true
          }
        }
      }
    })

    return c.json({
      message: 'Laporan magang berhasil diunggah dan sedang menunggu verifikasi admin',
      data: newReport
    }, 201)
  } catch (error: any) {
    return c.json({ message: 'Terjadi kesalahan saat mengunggah laporan', error: error.message }, 500)
  }
})

// PUT /api/reports/:id atau POST /api/reports/:id/update (Update / Revisi laporan magang)
const handleUpdateReport = async (c: any) => {
  const user = await getAuthUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)

  try {
    const existingReport = await prisma.report.findUnique({
      where: { id_report: id }
    })

    if (!existingReport) {
      return c.json({ message: 'Laporan tidak ditemukan' }, 404)
    }

    // Hanya pemilik laporan atau admin yang boleh mengupdate
    if (user.role !== 'admin' && existingReport.id_user !== user.id) {
      return c.json({ message: 'Forbidden' }, 403)
    }

    // Jika sudah disetujui, user biasa tidak boleh mengubah
    if (user.role !== 'admin' && existingReport.status === 'approved') {
      return c.json({ message: 'Laporan yang telah disetujui tidak dapat diubah lagi.' }, 400)
    }

    const body = await c.req.parseBody()
    const id_location_raw = body['id_location'] as string
    const title = (body['title'] as string || '').trim()
    const description = (body['description'] as string || '').trim()
    const students = (body['students'] as string || '').trim()
    const file = body['file']

    const updateData: any = {}

    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (students) updateData.students = students

    if (id_location_raw) {
      const id_location = parseInt(id_location_raw)
      if (!isNaN(id_location)) {
        const location = await prisma.location.findUnique({ where: { id_location } })
        if (location) updateData.id_location = id_location
      }
    }

    // Ganti file jika berkas PDF baru disertakan
    if (file && file instanceof File && file.size > 0) {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
      if (!isPdf) {
        return c.json({ message: 'Format berkas harus berupa dokumen PDF (.pdf)' }, 400)
      }
      if (file.size > 25 * 1024 * 1024) {
        return c.json({ message: 'Ukuran file melebihi batas maksimal 25 MB' }, 400)
      }

      // Hapus file lama jika ada
      if (existingReport.file_path) {
        try {
          const oldPath = path.join(process.cwd(), 'public', existingReport.file_path)
          await unlink(oldPath)
        } catch (e) {
          // ignore
        }
      }

      const reportsDir = path.join(process.cwd(), 'public', 'reports')
      await mkdir(reportsDir, { recursive: true })

      const safeExt = 'pdf'
      const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${safeExt}`
      const relativePath = `reports/${fileName}`
      const fullFilePath = path.join(process.cwd(), 'public', relativePath)

      await Bun.write(fullFilePath, file)

      updateData.file_path = relativePath
      updateData.file_name = file.name
      updateData.file_size = file.size
    }

    // Bila direvisi oleh user, status dikembalikan ke 'pending' untuk diverifikasi ulang oleh admin
    if (user.role !== 'admin') {
      updateData.status = 'pending'
      updateData.verified_at = null
    }

    const updated = await prisma.report.update({
      where: { id_report: id },
      data: updateData,
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true
          }
        }
      }
    })

    return c.json({
      message: 'Laporan magang berhasil diperbarui dan diajukan ulang untuk verifikasi admin.',
      data: updated
    })
  } catch (error: any) {
    return c.json({ message: 'Terjadi kesalahan saat memperbarui laporan', error: error.message }, 500)
  }
}

reports.put('/:id', handleUpdateReport)
reports.post('/:id/update', handleUpdateReport)

// PATCH /api/reports/:id/verify (Admin: Approve or Reject report)
reports.patch('/:id/verify', async (c) => {
  const user = await getAuthUser(c)
  if (!user || user.role !== 'admin') {
    return c.json({ message: 'Hanya administrator yang dapat memverifikasi laporan' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)

  try {
    const body = await c.req.json()
    const { status, feedback } = body

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return c.json({ message: 'Status tidak valid. Harus approved, rejected, atau pending' }, 400)
    }

    const report = await prisma.report.findUnique({
      where: { id_report: id }
    })

    if (!report) {
      return c.json({ message: 'Laporan tidak ditemukan' }, 404)
    }

    const updated = await prisma.report.update({
      where: { id_report: id },
      data: {
        status,
        feedback: feedback !== undefined ? feedback : report.feedback,
        verified_at: status === 'pending' ? null : new Date()
      },
      include: {
        location: {
          select: {
            id_location: true,
            name_location: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    })

    return c.json({
      message: `Status laporan berhasil diperbarui menjadi ${status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Menunggu'}`,
      data: updated
    })
  } catch (error: any) {
    return c.json({ message: 'Gagal memperbarui status laporan', error: error.message }, 500)
  }
})

// DELETE /api/reports/:id
reports.delete('/:id', async (c) => {
  const user = await getAuthUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ message: 'Invalid ID' }, 400)

  try {
    const report = await prisma.report.findUnique({
      where: { id_report: id }
    })

    if (!report) {
      return c.json({ message: 'Laporan tidak ditemukan' }, 404)
    }

    // User can only delete their own report if it is still pending; admin can delete any
    if (user.role !== 'admin') {
      if (report.id_user !== user.id) {
        return c.json({ message: 'Forbidden' }, 403)
      }
      if (report.status === 'approved') {
        return c.json({ message: 'Laporan yang sudah disetujui tidak dapat dihapus' }, 400)
      }
    }

    // Try deleting the physical file
    if (report.file_path) {
      try {
        const fullPath = path.join(process.cwd(), 'public', report.file_path)
        await unlink(fullPath)
      } catch (e) {
        // file missing is ok
      }
    }

    await prisma.report.delete({
      where: { id_report: id }
    })

    return c.json({ message: 'Laporan berhasil dihapus' })
  } catch (error: any) {
    return c.json({ message: 'Gagal menghapus laporan', error: error.message }, 500)
  }
})

export default reports
