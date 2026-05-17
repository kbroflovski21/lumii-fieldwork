export type TaskStatus = 'completed' | 'abnormal' | 'pending'

export interface ServiceReport {
  summary: string
  sopCheck: { step: string; passed: boolean }[]
  concerns: string[]
  mood: string
  healthObservations: string[]
  satisfaction: string
}

export interface ServiceTask {
  id: string
  serviceType: string
  recipientName: string
  workerName: string
  date: string
  dayOfWeek: string
  startTime: string
  endTime: string
  location: string
  locationShort: string
  status: TaskStatus
  source: string
  notes: string
  report?: ServiceReport
}

export interface SopFolder {
  id: string
  name: string
  type: 'general' | 'service'
  version: number
  updatedAt: string
  content: string
}

export interface DemoUser {
  name: string
  region: string
  role: string
}
