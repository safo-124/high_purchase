import { SuperAdminShell } from "../super-admin-shell"
import { getAdminPermissions } from "../security-actions"
import prisma from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/auth"
import { PermissionsList } from "./permissions-client"

export default async function PermissionsPage() {
  await requireSuperAdmin()

  const [permissions, adminUsers] = await Promise.all([
    getAdminPermissions(),
    prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, name: true, email: true },
    }),
  ])

  return (
    <SuperAdminShell activeHref="/super-admin/permissions">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Admin Permissions</h2>
        <p className="text-slate-400">Manage granular access control for sub-admin users</p>
      </div>
      <PermissionsList permissions={permissions} adminUsers={adminUsers} />
    </SuperAdminShell>
  )
}
