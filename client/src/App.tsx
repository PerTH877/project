import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from './app/Router'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import api from './lib/api'

// Initialize react-query client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes cache
        },
    },
})

function App() {
    const token = useAuthStore(s => s.token)

    // Keep Axios auth header in sync with Zustand token
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } else {
            delete api.defaults.headers.common['Authorization']
        }
    }, [token])

    return (
        <QueryClientProvider client={queryClient}>
            <AppRouter />
            <Toaster position="bottom-right" richColors theme="system" />
        </QueryClientProvider>
    )
}

export default App
