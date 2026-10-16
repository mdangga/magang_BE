import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  const hashedPassword = await bcrypt.hash(password, 10)

  // Cek apakah user admin sudah ada
  const existingUser = await prisma.user.findFirst({
    where: { username }
  })

  let user
  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        role: 'admin',
        updatedAt: new Date()
      }
    })
    console.log(`✅ Admin '${username}' sudah ada. Password dan role berhasil diperbarui.`)
  } else {
    user = await prisma.user.create({
      data: {
        username,
        name: 'Administrator',
        password: hashedPassword,
        role: 'admin'
      }
    })
    console.log(`✅ Admin '${username}' berhasil dibuat!`)
  }

  // Cek apakah sample user biasa ada
  const sampleUsername = 'mahasiswa'
  const samplePassword = await bcrypt.hash('mahasiswa123', 10)
  const existingSample = await prisma.user.findFirst({
    where: { username: sampleUsername }
  })
  if (!existingSample) {
    await prisma.user.create({
      data: {
        username: sampleUsername,
        name: 'Mahasiswa Magang',
        password: samplePassword,
        role: 'user'
      }
    })
    console.log(`✅ Sample Mahasiswa '${sampleUsername}' (password: mahasiswa123) berhasil dibuat!`)
  }

  // Cek apakah profil website default sudah ada (agar halaman tidak 404)
  const existingProfile = await prisma.profileWeb.findFirst()
  if (!existingProfile) {
    await prisma.profileWeb.create({
      data: {
        app_name: 'Peta Magang',
        description: 'Sistem Informasi Pemetaan Titik Lokasi Magang Mahasiswa',
        logo_path: ''
      }
    })
    console.log('✅ Profil website default berhasil dibuat.')
  }

  console.log('----------------------------------------')
  console.log('🎉 Seeding selesai!')
  console.log(`   Username : ${username}`)
  console.log(`   Password : ${password}`)
  console.log('----------------------------------------')
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
