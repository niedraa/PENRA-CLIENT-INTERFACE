import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  company: z.string().min(1).optional(),
  role: z.enum(['admin', 'client']),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const settingsSchema = z.object({
  webhookUrl: z.string().url().or(z.literal('')).optional(),
  calendlyUrl: z.string().url().or(z.literal('')).optional(),
  twilioToken: z.string().optional(),
  elevenLabsKey: z.string().optional(),
  defaultSystemPrompt: z.string().optional(),
})

export const createClientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(2),
  phone: z.string().optional(),
  services: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  subscriptionPlan: z.string().optional(),
  monthlyPrice: z.number().nonnegative().optional(),
  nextRenewal: z.string().optional(),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial()

export const createAgentSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  phoneNumber: z.string().optional(),
  voice: z.string().optional(),
  sector: z.string().optional(),
  language: z.string().optional(),
  systemPrompt: z.string().optional(),
  tone: z.string().optional(),
})

export const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().optional(),
  voice: z.string().optional(),
  sector: z.string().optional(),
  language: z.string().optional(),
  status: z.enum(['active', 'inactive', 'configuring', 'error']).optional(),
  systemPrompt: z.string().optional(),
  clientName: z.string().optional(),
  tone: z.string().optional(),
})

export const connectInstagramSchema = z.object({
  code: z.string().min(1),
  clientId: z.string().optional(),
})

export const createAutomationSchema = z.object({
  clientId: z.string().min(1).optional(),
  postId: z.string().min(1),
  postUrl: z.string().url(),
  triggerKeyword: z.string().min(1),
  dmMessage: z.string().min(1),
  enabled: z.boolean(),
  webhookUrl: z.string().url().optional(),
})

export const updateAutomationSchema = z.object({
  postUrl: z.string().url().optional(),
  triggerKeyword: z.string().min(1).optional(),
  dmMessage: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  webhookUrl: z.string().url().optional(),
})

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
})

export const createCommissionSchema = z.object({
  closerId: z.string().min(1),
  clientId: z.string().min(1),
  dealAmount: z.number().positive(),
  commissionRate: z.number().positive(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
