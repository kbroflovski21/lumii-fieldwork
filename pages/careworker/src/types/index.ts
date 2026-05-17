export type TaskStatus = 'completed' | 'abnormal' | 'pending'

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
