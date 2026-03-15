import { useStore } from '../store'

export function Footer() {
  const tasks = useStore((s) => s.tasks)
  const objectives = useStore((s) => s.objectives)

  const activeTasks = tasks.filter((t) => t.status === 'in_progress').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const totalTasks = tasks.length

  const avgProgress =
    objectives.length > 0
      ? Math.round(objectives.reduce((acc, o) => acc + o.progress, 0) / objectives.length)
      : 0

  return (
    <footer className="flex h-9 shrink-0 items-center gap-6 border-t border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-sm">
      <div className="flex flex-1 items-center gap-5 overflow-x-auto scrollbar-none">
        <Indicator
          label="Tâches actives"
          value={activeTasks}
          total={totalTasks}
          accent="text-teal-400"
        />
        <Separator />
        <Indicator
          label="Complétées"
          value={doneTasks}
          total={totalTasks}
          accent="text-green-400"
        />
        <Separator />
        <Indicator
          label="Objectifs"
          value={objectives.length}
          accent="text-indigo-400"
        />
        {objectives.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-600 whitespace-nowrap">Progression moy.</span>
              <div className="h-1 w-16 rounded-full bg-zinc-800">
                <div
                  className="h-1 rounded-full bg-teal-500 transition-all duration-500"
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500">{avgProgress}%</span>
            </div>
          </>
        )}
      </div>

      <span className="shrink-0 text-[10px] text-zinc-700 select-none">
        Aetheris
      </span>
    </footer>
  )
}

function Indicator({
  label,
  value,
  total,
  accent,
}: {
  label: string
  value: number
  total?: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`text-xs font-semibold tabular-nums ${accent}`}>{value}</span>
      {total !== undefined && total > 0 && (
        <span className="text-[10px] text-zinc-700">/ {total}</span>
      )}
      <span className="text-[10px] text-zinc-600">{label}</span>
    </div>
  )
}

function Separator() {
  return <div className="h-3 w-px shrink-0 bg-zinc-800" />
}
