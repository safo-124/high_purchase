import "dotenv/config"
import prisma from "../lib/prisma"

async function testDatabase() {
  console.log("🔍 Testing Prisma Postgres connection...\n")

  try {
    // Test 1: Check connection by counting shops
    const shopCount = await prisma.shop.count()
    console.log("✅ Connected to database!")
    console.log("   Current shop count: " + shopCount + "\n")

    // Test 2: Fetch all users
    console.log("📋 Fetching all users...")
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    })
    console.log("✅ Found " + allUsers.length + " user(s):")
    allUsers.forEach((user) => {
      console.log("   - " + user.name + " (" + user.email + ") [" + user.role + "]")
    })

    console.log("\n🎉 All tests passed! Your database is working perfectly.\n")
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

testDatabase()
