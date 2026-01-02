import "dotenv/config"
import prisma from "../lib/prisma"

async function assign() {
  const user = await prisma.user.findUnique({ 
    where: { email: "shopadmin@demo.com" } 
  })
  
  const shop = await prisma.shop.findFirst({ 
    where: { isActive: true } 
  })
  
  if (!user) { 
    console.log("❌ Shop admin user not found. Run npm run seed:shopadmin first.")
    return 
  }
  
  if (!shop) { 
    console.log("❌ No active shops found.")
    console.log("   Create a shop first via Super Admin at http://localhost:3000/login")
    console.log("   Login: admin@highpurchase.com / SuperAdmin123!")
    return 
  }
  
  const membership = await prisma.shopMember.upsert({
    where: { 
      userId_shopId: { 
        userId: user.id, 
        shopId: shop.id 
      } 
    },
    update: { 
      role: "SHOP_ADMIN", 
      isActive: true 
    },
    create: { 
      userId: user.id, 
      shopId: shop.id, 
      role: "SHOP_ADMIN", 
      isActive: true 
    },
  })
  
  console.log("✅ Assigned", user.email, "to shop:", shop.name, `(${shop.shopSlug})`)
  console.log("")
  console.log("Now you can login as Shop Admin:")
  console.log("   URL: http://localhost:3000/login")
  console.log("   Email: shopadmin@demo.com")
  console.log("   Password: ShopAdmin123!")
}

assign()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
