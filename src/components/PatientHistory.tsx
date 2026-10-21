import { staff } from '../data/mockStores'
import { scheduleStore } from '../data/scheduleStore'
import { median } from '../lib/consultDuration'
import { formatDate, useStore } from '../lib/utils'

// A patient's measured consultation history. This is the evidence the duration
// predictor works from, shown in the same units it uses — minutes actually
// spent — so a clinician can see why a booking came out at 25 minutes.
export default function PatientHistory({ clinicPatientId }: { clinicPatientId: string }) {
  useStore(scheduleStore)
  const patient = scheduleStore.patient(clinicPatientId)
  const history = scheduleStore.historyFor(clinicPatientId)
  const typical = median(history.map((h) => h.actualMinutes))

  if (!patient) return null

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
        <p className="text-xs text-slate-500">
          {history.length} consultation{history.length === 1 ? '' : 's'} on record
          {typical !== undefined && ` · median ${Math.round(typical)} min`}
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-slate-500">
          No measured consultations yet. The first booking uses the practice default.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {history.map((entry) => (
            <li key={`${entry.at}-${entry.clinicianId}`} className="px-3 py-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-700">{formatDate(entry.at)}</span>
                <span className="tabular-nums font-medium text-slate-900">
                  {entry.actualMinutes} min
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {staff.find((s) => s.id === entry.clinicianId)?.name ?? entry.clinicianId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
