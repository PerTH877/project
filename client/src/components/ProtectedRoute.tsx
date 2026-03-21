import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { authService } from '@/services/auth'

interface ProtectedRouteProps {
    children?: ReactNode
    allowedRoles: ('user' | 'seller' | 'admin')[]
    redirectTo?: string
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
    const { token, role, logout } = useAuthStore()
    const location = useLocation()
    const [isChecking, setIsChecking] = useState(true)
    const isRoleAllowed = Boolean(token && role && allowedRoles.includes(role))

    useEffect(() => {
        let cancelled = false

        if (!token || !role || !allowedRoles.includes(role)) {
            setIsChecking(false)
            return () => {
                cancelled = true
            }
        }

        setIsChecking(true)
        authService.validateSession(role)
            .catch(() => {
                if (!cancelled) {
                    logout()
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsChecking(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [allowedRoles, location.pathname, logout, role, token])

    if (!isRoleAllowed) {
        const loginPath = redirectTo ?? (
            allowedRoles.includes('admin') ? '/admin/login'
                : allowedRoles.includes('seller') ? '/seller/login'
                    : '/login'
        )
        return <Navigate to={loginPath} state={{ from: location }} replace />
    }

    if (isChecking) {
        return (
            <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-6 text-sm text-slate-500">
                Verifying your session...
            </div>
        )
    }

    return children ? <>{children}</> : <Outlet />
}
