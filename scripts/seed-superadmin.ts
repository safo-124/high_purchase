import "dotenv/config"
import bcrypt from "bcrypt"
import prisma from "../lib/prisma"

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL
  const password = process.env.SUPERADMIN_PASSWORD
  const name = process.env.SUPERADMIN_NAME || "Super Admin"

  if (!email || !password) {
    console.error("❌ Missing required environment variables:")
    console.error("   SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set")
    console.error("")
    console.error("   Add to your .env file:")
    console.error('   SUPERADMIN_EMAIL="admin@highpurchase.com"')
    console.error('   SUPERADMIN_PASSWORD="your-secure-password"')
    console.error('   SUPERADMIN_NAME="Super Admin"')
    process.exit(1)
  }

  console.log("🔍 Checking for existing super admin...")

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log(`✅ Super admin already exists: ${email}`)
    console.log("   No changes made.")
    process.exit(0)
  }

  console.log("📝 Creating super admin account...")

  const passwordHash = await bcrypt.hash(password, 12)

  const superAdmin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  })

  console.log("✅ Super admin created successfully!")
  console.log(`   Email: ${superAdmin.email}`)
  console.log(`   Name: ${superAdmin.name}`)
  console.log(`   Role: ${superAdmin.role}`)
  console.log("")
  console.log("🎉 You can now login at /login")
}

seedSuperAdmin()
  .catch((error) => {
    console.error("❌ Error seeding super admin:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
