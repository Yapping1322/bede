import { scheduleStore } from '../data/scheduleStore'
import { useStore } from '../lib/utils'
import { Card } from './ui'

// The close-of-day count. Numbers only, and deliberately no money: no fee
// figures exist anywhere in this build, so there is nothing here that could be
// read as a billing total. The item counts are the clinician's own confirmed
// decisions, restated.
export default function ClinicDaySummary({
  clinicianId,
  day,
}: {
  clinicianId: string
  day: string
}) {
  useStore(scheduleStore)
  const book = scheduleStore.forClinician(clinicianId, day)

  const complete = book.filter((a) => a.status === 'complete')
  const seen = new Set(
    complete.flatMap((a) =>
      a.participants.filter((p) => p.actualMinutes !== undefined).map((p) => p.clinicPatientId),
    ),
  ).size
  const billing = complete.flatMap((a) => a.billing ?? [])
  const accepted = billing.filter((b) => b.status === 'accepted').length
  const awaiting = billing.filter((b) => b.status === 'proposed' && b.suggestedItem).length
  const noItem = billing.filter((b) => b.status === 'proposed' && !b.suggestedItem).length
  const dna = book.filter((a) => a.status === 'dna').length
  const cancelled = book.filter((a) => a.status === 'cancelled').length
  const outstanding = book.filter((a) =>
    ['requested', 'confirmed', 'arrived', 'in-progress'].includes(a.status),
  ).length

  const stats: { label: string; value: number }[] = [
    { label: 'Booked', value: book.length },
    { label: 'Appointments completed', value: complete.length },
    { label: 'Patients seen', value: seen },
    { label: 'Did not attend', value: dna },
    { label: 'Cancelled', value: cancelled },
    { label: 'Still outstanding', value: outstanding },
    { label: 'Items confirmed', value: accepted },
    { label: 'Items awaiting your confirmation', value: awaiting },
    { label: 'Under six minutes (no tiered item)', value: noItem },
  ]

  return (
    <Card className="p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">End of day</h2>
        <span className="text-xs text-slate-400">counts, not billing totals</span>
      </div>
      <dl className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-slate-500">{s.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="pt-2 text-xs text-slate-400">
        The build stores no fees, so this is the whole day's arithmetic.
      </p>
    </Card>
  )
}
