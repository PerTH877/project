import api from '@/lib/api'
import type { PendingSeller, TopCategory, TopSeller, TopProduct } from '@/types'

export const adminService = {
    getPendingSellers: async (): Promise<PendingSeller[]> => {
        const res = await api.get('/admin/sellers/pending')
        return res.data.sellers
    },

    verifySeller: async (seller_id: number) => {
        const res = await api.patch(`/admin/sellers/${seller_id}/verify`)
        return res.data
    },

    getTopCategories: async (): Promise<TopCategory[]> => {
        const res = await api.get('/admin/analytics/top-categories')
        return res.data.categories
    },

    getTopSellers: async (): Promise<TopSeller[]> => {
        const res = await api.get('/admin/analytics/top-sellers')
        return res.data.sellers
    },

    getTopProducts: async (): Promise<TopProduct[]> => {
        const res = await api.get('/admin/analytics/top-products')
        return res.data.products
    },
}
