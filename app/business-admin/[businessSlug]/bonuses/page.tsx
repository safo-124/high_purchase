import { getBonusRules, getBonusSummary, getBonusRecords } from "../../bonus-actions"
import { getBusinessShops } from "../../actions"
import { BonusesContent } from "./bonuses-content"

interface Props {
  params: Promise<{ businessSlug: string }>
}

export default async function BonusesPage({ params }: Props) {
  const { businessSlug } = await params
  const [rules, summary, records, shops] = await Promise.all([
    getBonusRules(businessSlug),
    getBonusSummary(businessSlug),
    getBonusRecords(businessSlug),
    getBusinessShops(businessSlug),
  ])

  return (
    <BonusesContent
      businessSlug={businessSlug}
      rules={rules}
      summary={summary}
      records={records}
      shops={shops.map((s) => ({ id: s.id, name: s.name }))}
    />
  )
}
