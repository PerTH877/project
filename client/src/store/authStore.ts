import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState } from '@/types'

interface AuthStore extends AuthState {
    login: (token: string) => void
    logout: () => void
}

function decodeToken(token: string): Omit<AuthState, 'token'> | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return {
            role: payload.role ?? null,
            user_id: payload.user_id,
            seller_id: payload.seller_id,
            email: payload.email,
        }
    } catch {
        return null
    }
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            token: null,
            role: null,
            user_id: undefined,
            seller_id: undefined,
            email: undefined,

            login: (token: string) => {
                const decoded = decodeToken(token)
                if (!decoded) return
                set({ token, ...decoded })
            },

            logout: () => {
                set({ token: null, role: null, user_id: undefined, seller_id: undefined, email: undefined })
            },
        }),
        {
            name: 'nexus-auth',
        }
    )
)
