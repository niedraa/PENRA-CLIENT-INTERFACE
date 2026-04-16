// Auth
export interface User {
  id: string
  email: string
  name: string
  role: 'client' | 'admin'
  company?: string
  avatar?: string
  clientId?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// Client
export interface Client {
  id: string
  name: string
  email: string
  company: string
  phone?: string
  avatar?: string
  services: ServiceType[]
  status: 'active' | 'inactive' | 'pending'
  subscriptionPlan: string
  monthlyPrice: number
  nextRenewal: string
  createdAt: string
  notes?: string
}

export type ServiceType = 'instagram' | 'vocal' | 'website'

// Vocal Agent
export interface VocalAgent {
  id: string
  clientId: string
  clientName?: string
  name: string
  phoneNumber: string
  voice: string
  sector: string
  language: string
  status: 'active' | 'inactive' | 'configuring' | 'error'
  systemPrompt?: string
  callsThisMonth: number
  callsTotal: number
  lastActivity: string | null
}

export interface CallRecord {
  id: string
  date: string
  time: string
  duration: number
  summary: string
  status: 'handled' | 'callback_requested' | 'missed'
  audioUrl?: string
  transcription?: string
}

// Invoice
export interface Invoice {
  id: string
  clientId: string
  clientName: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  date: string
  dueDate: string
  pdfUrl?: string
}

// Commission
export interface Commission {
  id: string
  closerId: string
  closerName: string
  clientId: string
  clientName: string
  dealAmount: number
  rate: number
  commissionAmount: number
  status: 'pending' | 'paid'
  createdAt: string
}

// Instagram
export interface IGAutomation {
  id: string
  clientId: string
  postId: string
  type: 'comments' | 'dm'
  message: string
  count: number
  enabled: boolean
  status: 'active' | 'inactive' | 'processing'
  createdAt: string
  commentsSeen: number
  dmsSent: number
}

export interface ConnectedInstagramAccount {
  id: string
  clientId: string
  username: string
  avatar: string
  accessToken: string
  expiresAt: string
  isConnected: boolean
}

export interface InstagramPost {
  id: string
  clientId: string
  accountId: string
  caption: string
  media: string
  likes: number
  comments: number
  createdAt: string
}

// Settings
export interface AppSettings {
  webhookUrl: string
  apiKey: string
  emailSupport: string
  logoUrl?: string
}
