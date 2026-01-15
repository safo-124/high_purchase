import { requireBusinessAdmin } from "@/lib/auth"
import { getBusinessTaxes, getBusinessProducts, getBusinessCategories, getBusinessBrands, getBusinessShops } from "../../actions"
import { TaxesContent } from "./taxes-content"

interface TaxesPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function TaxesPage({ params }: TaxesPageProps) {
  const { businessSlug } = await params
  await requireBusinessAdmin(businessSlug)

  const [taxes, products, categories, brands, shops] = await Promise.all([
    getBusinessTaxes(businessSlug),
    getBusinessProducts(businessSlug),
    getBusinessCategories(businessSlug),
    getBusinessBrands(businessSlug),
    getBusinessShops(businessSlug),
  ])

  return (
    <div className="min-h-screen bg-mesh">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-[100px]" />
      </div>

      <main className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Tax Management</h1>
          <p className="text-slate-400">Create and manage taxes that can be assigned to products, categories, brands, or shops</p>
        </div>

        <TaxesContent
          businessSlug={businessSlug}
          taxes={taxes}
          products={products}
          categories={categories}
          brands={brands}
          shops={shops}
        />
      </main>
    </div>
  )
}
