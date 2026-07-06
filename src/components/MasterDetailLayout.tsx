import { Outlet, useMatch } from 'react-router-dom'
import WardList from './WardList'

// Master–detail: on mobile the ward list IS the home page and the detail
// replaces it; on md+ the list becomes a persistent left rail and the detail
// fills the right pane. Same components either way (Handoff 02 §2).
export default function MasterDetailLayout() {
  const atWardHome = useMatch({ path: '/', end: true }) !== null

  return (
    <div className="h-full flex print-expand">
      <aside
        className={`${
          atWardHome ? 'block w-full' : 'hidden'
        } md:block md:w-96 md:shrink-0 md:border-r md:border-slate-200 overflow-y-auto no-print`}
      >
        <WardList />
      </aside>
      <section
        className={`${atWardHome ? 'hidden md:block' : 'block'} flex-1 min-w-0 overflow-y-auto print-expand`}
      >
        <Outlet />
      </section>
    </div>
  )
}
