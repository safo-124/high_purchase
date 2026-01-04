import { redirect } from "next/navigation"
import { checkCustomerSession } from "@/app/customer/actions"
import { CustomerLoginForm } from "./login-form"

interface CustomerLoginPageProps {
  params: Promise<{ shopSlug: string }>
}

export default async function CustomerLoginPage({ params }: CustomerLoginPageProps) {
  const { shopSlug } = await params
  
  // If already logged in, redirect to dashboard
  const session = await checkCustomerSession()
  if (session) {
    redirect(`/customer/${shopSlug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <CustomerLoginForm shopSlug={shopSlug} />
      </div>
    </div>
  )
}
