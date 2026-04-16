# 💻 EXEMPLES DE CODE - FRONTEND REBUILD

## 1. STRUCTURE BASIQUE DES FICHIERS

### main.tsx
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

### router.tsx
```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ClientLayout } from '@/components/layout/client-layout'
import { AdminLayout } from '@/components/layout/admin-layout'
import { LoginPage } from '@/features/auth/login-page'
import { ClientDashboardPage } from '@/features/client/dashboard/client-dashboard-page'
// ... autres imports

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/client',
    element: <ClientLayout />,
    children: [
      { index: true, element: <ClientDashboardPage /> },
      { path: 'instagram', element: <InstagramPage /> },
      { path: 'vocal-agent', element: <VocalAgentPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'clients', element: <ClientsPage /> },
      // ... autres routes
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])
```

---

## 2. SERVICES

### api.ts
```typescript
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor requête - Ajoute token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Interceptor réponse - Gère 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export interface ApiError {
  message: string
  code: string
  details?: Record<string, string>
}

export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message,
      code: String(error.response?.status || 'UNKNOWN_ERROR'),
      details: error.response?.data?.details,
    }
  }
  return {
    message: 'Une erreur est survenue',
    code: 'UNKNOWN_ERROR',
  }
}
```

### auth.service.ts
```typescript
import { apiClient, handleApiError } from './api'
import type { User } from '@/types'

class AuthService {
  async login(data: { email: string; password: string }): Promise<{
    user: User
    token: string
  }> {
    try {
      const response = await apiClient.post('/auth/login', data)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async register(data: {
    email: string
    password: string
    name: string
  }): Promise<{ user: User; token: string }> {
    try {
      const response = await apiClient.post('/auth/register', data)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await apiClient.post('/auth/refresh')
      return response.data.token
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export const authService = new AuthService()
```

### client.service.ts
```typescript
import { apiClient, handleApiError } from './api'
import type { Client } from '@/types'

class ClientService {
  async getAll(): Promise<Client[]> {
    try {
      const response = await apiClient.get('/clients')
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async getById(id: string): Promise<Client> {
    try {
      const response = await apiClient.get(`/clients/${id}`)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async create(data: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    try {
      const response = await apiClient.post('/clients', data)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async update(
    id: string,
    data: Partial<Client>,
  ): Promise<void> {
    try {
      await apiClient.patch(`/clients/${id}`, data)
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/clients/${id}`)
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export const clientService = new ClientService()
```

---

## 3. STORES (ZUSTAND)

### auth.store.ts
```typescript
import { create } from 'zustand'
import type { User } from '@/types'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: JSON.parse(localStorage.getItem('penra_user') || 'null'),
  token: localStorage.getItem('penra_token'),
  isAuthenticated: !!localStorage.getItem('penra_token'),

  login: (user, token) => {
    localStorage.setItem('penra_user', JSON.stringify(user))
    localStorage.setItem('penra_token', token)
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('penra_user')
    localStorage.removeItem('penra_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (partial) =>
    set((state) => {
      const updated = { ...state.user!, ...partial }
      localStorage.setItem('penra_user', JSON.stringify(updated))
      return { user: updated }
    }),
}))
```

### ui.store.ts
```typescript
import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  modals: Record<string, boolean>
  openModal: (name: string) => void
  closeModal: (name: string) => void
  closeAllModals: () => void

  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  modals: {},
  openModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: true } })),
  closeModal: (name) => set((s) => ({ modals: { ...s.modals, [name]: false } })),
  closeAllModals: () => set({ modals: {} }),

  notifications: [],
  addNotification: (notification) =>
    set((s) => ({
      notifications: [
        ...s.notifications,
        { ...notification, id: Date.now().toString() },
      ],
    })),
  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}))
```

---

## 4. HOOKS PERSONNALISÉS

### useAuth.ts
```typescript
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, updateUser } =
    useAuthStore()

  return {
    user,
    token,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isClient: user?.role === 'client',
    login,
    logout,
    updateUser,
  }
}
```

### useFetch.ts
```typescript
import { useQuery, useMutation, type UseQueryResult } from '@tanstack/react-query'
import { apiClient, handleApiError } from '@/services/api'
import { useUIStore } from '@/stores/ui.store'

export function useFetch<T>(
  url: string,
  options?: any,
): UseQueryResult<T> {
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const response = await apiClient.get<T>(url)
      return response.data
    },
    ...options,
  })
}

export function useAsyncFn<T, E = ApiError>(
  fn: () => Promise<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: E) => void,
) {
  const addNotification = useUIStore((s) => s.addNotification)

  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        message: 'Opération réussie',
      })
      onSuccess?.(data)
    },
    onError: (error) => {
      const err = handleApiError(error) as any
      addNotification({
        type: 'error',
        message: err.message || 'Erreur lors de l\'opération',
      })
      onError?.(error)
    },
  })
}
```

### useClients.ts
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientService } from '@/services/client.service'
import { useUIStore } from '@/stores/ui.store'
import type { Client } from '@/types'

export function useClients() {
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getAll(),
  })

  const queryClient = useQueryClient()
  const addNotification = useUIStore((s) => s.addNotification)

  const createMutation = useMutation({
    mutationFn: (data: Omit<Client, 'id' | 'createdAt'>) =>
      clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      addNotification({ type: 'success', message: 'Client créé' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Client>
    }) => clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      addNotification({ type: 'success', message: 'Client mis à jour' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      addNotification({ type: 'success', message: 'Client supprimé' })
    },
  })

  return {
    clients,
    isLoading,
    error,
    createClient: (data: Omit<Client, 'id' | 'createdAt'>) =>
      createMutation.mutateAsync(data),
    updateClient: (id: string, data: Partial<Client>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteClient: (id: string) => deleteMutation.mutateAsync(id),
  }
}
```

---

## 5. COMPOSANTS UI

### Button.tsx
```typescript
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-accent/90',
        secondary: 'bg-bg-secondary text-text-primary hover:bg-bg-secondary/80',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'hover:bg-bg-secondary text-text-primary',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export function Button({
  className,
  variant,
  size,
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
```

### Input.tsx
```typescript
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  },
)
```

### Card.tsx
```typescript
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-bg-secondary p-6',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold text-text-primary', className)} {...props} />
  )
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('mt-4', className)} {...props} />
}
```

---

## 6. PAGES

### LoginPage.tsx
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Au moins 6 caractères'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const addNotification = useUIStore((s) => s.addNotification)

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await authService.login(data)
      login(response.user, response.token)
      navigate(response.user.role === 'admin' ? '/admin' : '/client')
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.message || 'Erreur de connexion',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4 py-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <Logo className="scale-95" />
        </div>

        <div className="rounded-2xl border border-border bg-bg-secondary px-6 py-8">
          <h1 className="text-2xl font-bold text-center mb-2">Connexion</h1>
          <p className="text-sm text-text-secondary text-center mb-6">
            Accédez à votre espace PENRA
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Input
              label="Email"
              placeholder="votre@email.fr"
              icon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" isLoading={isLoading}>
              Se connecter
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
```

### ClientsPage.tsx
```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table } from '@/components/ui/table'
import { ClientFormModal } from './components/client-form-modal'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'

export function ClientsPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient } =
    useClients()
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDelete = async () => {
    if (deleteId) {
      await deleteClient(deleteId)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button
          onClick={() => {
            setSelectedClient(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Nouveau client
        </Button>
      </div>

      <Card>
        <CardContent className="pt-0">
          <div className="mb-4">
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table
            columns={[
              { key: 'name', label: 'Nom' },
              { key: 'email', label: 'Email' },
              { key: 'company', label: 'Entreprise' },
              { key: 'status', label: 'Statut' },
            ]}
            data={filteredClients}
            loading={isLoading}
            onEdit={(client) => {
              setSelectedClient(client)
              setIsFormOpen(true)
            }}
            onDelete={(client) => setDeleteId(client.id)}
          />
        </CardContent>
      </Card>

      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        client={selectedClient}
        onSubmit={selectedClient ? updateClient : createClient}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteId}
        title="Supprimer le client"
        description="Êtes-vous sûr ? Cette action ne peut pas être annulée."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
```

---

## 7. VALIDATION ZOD

```typescript
import z from 'zod'

export const clientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  company: z.string().min(1, 'L\'entreprise est requise'),
  phone: z.string().optional(),
  services: z.array(z.enum(['instagram', 'vocal', 'website'])),
  subscriptionPlan: z.string().min(1, 'Le plan est requis'),
  monthlyPrice: z.number().min(0, 'Le prix doit être positif'),
})

export const agentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  voice: z.string().min(1, 'La voix est requise'),
  language: z.string().min(1, 'La langue est requise'),
  sector: z.string().min(1, 'Le secteur est requis'),
  systemPrompt: z.string().optional(),
})

export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Le client est requis'),
  amount: z.number().min(0.01, 'Le montant doit être positif'),
  status: z.enum(['paid', 'pending', 'overdue']),
  dueDate: z.string().min(1, 'La date d\'échéance est requise'),
})
```

---

## 8. LAYOUTS

### ClientLayout.tsx
```typescript
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { ClientSidebar } from './client-sidebar'
import { Topbar } from './topbar'

export function ClientLayout() {
  const { isAuthenticated, isClient } = useAuth()

  if (!isAuthenticated || !isClient) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-bg-primary lg:flex">
      <ClientSidebar />
      <main className="min-h-screen min-w-0 flex-1">
        <Topbar />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

### AdminLayout.tsx
```typescript
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { AdminSidebar } from './admin-sidebar'
import { Topbar } from './topbar'

export function AdminLayout() {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-bg-primary lg:flex">
      <AdminSidebar />
      <main className="min-h-screen min-w-0 flex-1">
        <Topbar />
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

---

Ces exemples fournissent une base solide pour reconstruire le frontend de zéro !
