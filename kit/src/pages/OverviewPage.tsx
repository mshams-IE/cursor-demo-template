import { OverviewView } from '../components/DemoApp'
import { ReportView } from '../components/ReportView'
import { useDemo } from '../store'

export function OverviewPage() {
  const mode = useDemo((s) => s.mode)
  return <div className="p-6">{mode === 'report' ? <ReportView /> : <OverviewView />}</div>
}
