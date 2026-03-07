import api from '@/lib/api'

export const authService = {
    userLogin: async (email: string, password: string) => {
        const res = await api.post('/users/login', { email, password })
        return res.data.token as string
    },

    userRegister: async (data: {
        full_name: string
        email: string
        password: string
        phone_number?: string
        nearby_warehouse_id?: number
    }) => {
        const res = await api.post('/users/register', data)
        return res.data
    },

    sellerLogin: async (email: string, password: string) => {
        const res = await api.post('/sellers/login', { email, password })
        return res.data.token as string
    },

    sellerRegister: async (data: {
        company_name: string
        contact_email: string
        password: string
        gst_number?: string
    }) => {
        const res = await api.post('/sellers/register', data)
        return res.data
    },

    adminLogin: async (email: string, password: string) => {
        const res = await api.post('/admin/login', { email, password })
        return res.data.token as string
    },
}
