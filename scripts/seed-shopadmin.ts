import "dotenv/config"
import bcrypt from "bcrypt"
import prisma from "../lib/prisma"

async function seedShopAdmin() {
  const email = process.env.SHOPADMIN_EMAIL || "shopadmin@demo.com"
  const password = process.env.SHOPADMIN_PASSWORD || "ShopAdmin123!"
  const name = process.env.SHOPADMIN_NAME || "Demo Shop Admin"
  const shopSlug = process.env.SHOPADMIN_SHOP_SLUG // Optional: assign to specific shop

  console.log("🔧 Seeding Shop Admin user...")
  console.log(`   Email: ${email}`)
  console.log(`   Name: ${name}`)

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Upsert user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "SHOP_ADMIN",
    },
    create: {
      email,
      name,
      passwordHash,
      role: "SHOP_ADMIN",
    },
  })

  console.log(`✅ Shop Admin user created/updated: ${user.id}`)

  // If a shop slug is provided, create membership
  if (shopSlug) {
    const shop = await prisma.shop.findUnique({
      where: { shopSlug },
    })

    if (shop) {
      const membership = await prisma.shopMember.upsert({
        where: {
          userId_shopId: {
            userId: user.id,
            shopId: shop.id,
          },
        },
        update: {
          role: "SHOP_ADMIN",
          isActive: true,
        },
        create: {
          userId: user.id,
          shopId: shop.id,
          role: "SHOP_ADMIN",
          isActive: true,
        },
      })
      console.log(`✅ Membership created for shop "${shop.name}": ${membership.id}`)
    } else {
      console.log(`⚠️  Shop with slug "${shopSlug}" not found. Create the shop first.`)
    }
  } else {
    // Find any existing shop and create membership
    const shops = await prisma.shop.findMany({
      where: { isActive: true },
      take: 1,
    })

    if (shops.length > 0) {
      const shop = shops[0]
      const membership = await prisma.shopMember.upsert({
        where: {
          userId_shopId: {
            userId: user.id,
            shopId: shop.id,
          },
        },
        update: {
          role: "SHOP_ADMIN",
          isActive: true,
        },
        create: {
          userId: user.id,
          shopId: shop.id,
          role: "SHOP_ADMIN",
          isActive: true,
        },
      })
      console.log(`✅ Membership created for shop "${shop.name}": ${membership.id}`)
    } else {
      console.log("⚠️  No active shops found. Create a shop first via Super Admin.")
    }
  }

  console.log("")
  console.log("🎉 Shop Admin seeding complete!")
  console.log("")
  console.log("Login credentials:")
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
}

seedShopAdmin()
  .catch((e) => {
    console.error("❌ Error seeding shop admin:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
