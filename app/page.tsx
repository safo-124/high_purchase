import { redirect } from "next/navigation"
import { getSessionUser } from "../lib/auth"

export default async function Home() {
  const user = await getSessionUser()

  if (user && user.role === "SUPER_ADMIN") {
    redirect("/super-admin")
  }

  redirect("/login")
}
