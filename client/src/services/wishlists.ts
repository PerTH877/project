import api from '@/lib/api'
import type { Wishlist } from '@/types'

export const wishlistsService = {
    list: async (): Promise<Wishlist[]> => {
        const res = await api.get('/wishlists')
        return res.data.wishlists
    },

    create: async (name: string, is_public = false) => {
        const res = await api.post('/wishlists', { name, is_public })
        return res.data.wishlist
    },

    addItem: async (wishlist_id: number, variant_id: number) => {
        const res = await api.post(`/wishlists/${wishlist_id}/items`, { variant_id })
        return res.data
    },

    removeItem: async (wishlist_id: number, variant_id: number) => {
        const res = await api.delete(`/wishlists/${wishlist_id}/items/${variant_id}`)
        return res.data
    },
}
