import api from '@/lib/api'
import type { CartItem, Address } from '@/types'

export const cartService = {
    getItems: async (): Promise<CartItem[]> => {
        const res = await api.get('/cart')
        return res.data.items
    },

    getTotal: async (): Promise<number> => {
        const res = await api.get('/cart/total')
        return res.data.total
    },

    addItem: async (variant_id: number, quantity: number) => {
        const res = await api.post('/cart', { variant_id, quantity })
        return res.data
    },

    updateItem: async (cart_id: number, quantity: number) => {
        const res = await api.put(`/cart/${cart_id}`, { quantity })
        return res.data
    },

    removeItem: async (cart_id: number) => {
        const res = await api.delete(`/cart/${cart_id}`)
        return res.data
    },

    checkout: async (address_id: number) => {
        const res = await api.post('/cart/checkout', { address_id })
        return res.data
    },
}

export const addressesService = {
    list: async (): Promise<Address[]> => {
        const res = await api.get('/addresses')
        return res.data.addresses
    },

    create: async (payload: Omit<Address, 'address_id' | 'user_id' | 'is_active'>) => {
        const res = await api.post('/addresses', payload)
        return res.data.address
    },

    update: async (address_id: number, payload: Partial<Address>) => {
        const res = await api.put(`/addresses/${address_id}`, payload)
        return res.data.address
    },

    delete: async (address_id: number) => {
        const res = await api.delete(`/addresses/${address_id}`)
        return res.data
    },
}
