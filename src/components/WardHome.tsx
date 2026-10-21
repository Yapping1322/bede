import SinceLastLook from './SinceLastLook'

// The desktop resting pane. It is the consultant's "before rounds" screen: what
// changed since the last look, without opening a single chart.
export default function WardHome() {
  return (
    <div className="hidden md:block h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-lg font-bold text-slate-900">Ward 5 — Medical Oncology</h1>
        <p className="pt-1 text-sm text-slate-500">
          Select a patient to read notes, messages, results or tasks.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-2">
          <SinceLastLook />
        </div>
      </div>
    </div>
  )
}
