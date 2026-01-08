import { getBusinessShops } from "../../actions"
import { NewSaleContent } from "./new-sale-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessNewSalePage({ params }: Props) {
  const { businessSlug } = await params
  const shops = await getBusinessShops(businessSlug)

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">New Sale</h1>
          <p className="text-slate-400">Create a new hire purchase sale for a customer</p>
        </div>

        <NewSaleContent 
          businessSlug={businessSlug}
          shops={shops.map(s => ({ id: s.id, name: s.name, shopSlug: s.shopSlug }))}
        />
      </div>
    </div>
  )
}
