export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-dvh bg-slate-900 text-white flex flex-col justify-center px-6 py-12">
      <div className="max-w-md mx-auto w-full">
        <p className="text-sky-400 font-semibold tracking-wide text-sm uppercase">
          Bede · concept demo
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">
          One patient. One screen. The whole team.
        </h1>
        <p className="mt-4 text-slate-300 leading-relaxed">
          On most wards the note lives on paper, the conversation lives in
          personal phone messages, and the results live in three different
          portals. Handover stitches it together from memory.
        </p>
        <p className="mt-3 text-slate-300 leading-relaxed">
          Bede scopes everything to the patient: structured
          ISBAR notes and shift handover, a team message thread, and a live
          pathology and imaging feed, one surface, on the phone already in
          your pocket on the round.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-slate-200">
          <li className="flex gap-2">
            <span className="text-sky-400">•</span> Notes &amp; handover:
            ISBAR-structured, timestamped, rolled into a printable ward list
          </li>
          <li className="flex gap-2">
            <span className="text-sky-400">•</span> Messages: team chat that
            never loses which patient it&apos;s about
          </li>
          <li className="flex gap-2">
            <span className="text-sky-400">•</span> Results: pathology and
            imaging in one feed, lab-reported flags displayed
          </li>
        </ul>
        <button
          onClick={onEnter}
          className="mt-8 w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold rounded-xl py-3.5 text-lg"
        >
          Enter demo ward
        </button>
        <p className="mt-4 text-xs text-slate-500 leading-relaxed">
          Prototype on entirely synthetic data. No real patients, no real
          results, no connection to any clinical system. Built as a
          conversation starter for hospital IT and privacy governance, not
          for clinical use.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          An Acutis concept ·{' '}
          <a
            href="mailto:support@lucanmed.com?subject=Bede%20feedback"
            className="underline hover:text-slate-300"
          >
            Send feedback
          </a>
        </p>
      </div>
    </div>
  )
}
