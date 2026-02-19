import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { checkMustChangePassword } from "./actions"
import { ChangePasswordContent } from "./change-password-content"

export default async function ChangePasswordPage() {
  const user = await getSessionUser()
  
  if (!user) {
    redirect("/login")
  }

  const mustChange = await checkMustChangePassword()
  
  if (!mustChange) {
    // Already changed password, redirect to appropriate page
    switch (user.role) {
      case "BUSINESS_ADMIN":
        redirect("/business-admin/select-business")
      case "SHOP_ADMIN":
        redirect("/shop-admin/select-shop")
      case "SALES_STAFF":
        redirect("/sales-staff/select-shop")
      case "DEBT_COLLECTOR":
        redirect("/collector/select-shop")
      default:
        redirect("/login")
    }
  }

  // Determine where to send the user after password change
  let redirectAfterChange = "/login"
  switch (user.role) {
    case "BUSINESS_ADMIN":
      redirectAfterChange = "/business-admin/select-business"
      break
    case "SHOP_ADMIN":
      redirectAfterChange = "/shop-admin/select-shop"
      break
    case "SALES_STAFF":
      redirectAfterChange = "/sales-staff/select-shop"
      break
    case "DEBT_COLLECTOR":
      redirectAfterChange = "/collector/select-shop"
      break
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px]" />
      </div>

      <ChangePasswordContent redirectPath={redirectAfterChange} />
    </div>
  )
}
