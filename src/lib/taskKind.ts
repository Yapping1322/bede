import type { Task, TaskKind } from '../types'

// Task kinds are chosen by whoever writes the task. The system does not infer
// one from the text: "chase the MRI" might be a referral, a paperwork chase or
// a transport booking, and guessing would quietly mislabel the one category
// people search for later.

export const taskKindLabels: Record<TaskKind, string> = {
  referral: 'Referral',
  transport: 'Transport',
  paperwork: 'Paperwork',
  'follow-up': 'Follow-up',
  other: 'Other',
}

export const TASK_KINDS: TaskKind[] = ['referral', 'transport', 'paperwork', 'follow-up', 'other']

/** Seed tasks predate the field; absent means the catch-all. */
export const taskKindOf = (task: Task): TaskKind => task.kind ?? 'other'
