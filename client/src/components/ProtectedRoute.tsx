import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
    children?: ReactNode
    allowedRoles: ('user' | 'seller' | 'admin')[]
    redirectTo?: string
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
    const { token, role } = useAuthStore()
    const location = useLocation()

    if (!token || !role || !allowedRoles.includes(role)) {
        const loginPath = redirectTo ?? (
            allowedRoles.includes('admin') ? '/admin/login'
                : allowedRoles.includes('seller') ? '/seller/login'
                    : '/login'
        )
        return <Navigate to={loginPath} state={{ from: location }} replace />
    }

    return children ? <>{children}</> : <Outlet />
}
