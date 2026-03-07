import api from '@/lib/api'
import type { Product, ProductVariant, Category, Warehouse, CreateProductPayload } from '@/types'

export const productsService = {
    list: async (): Promise<Product[]> => {
        const res = await api.get('/products')
        return res.data.products
    },

    get: async (productId: number): Promise<{ product: Product; variants: ProductVariant[] }> => {
        const res = await api.get(`/products/${productId}`)
        return res.data
    },

    create: async (payload: CreateProductPayload) => {
        const res = await api.post('/products', payload)
        return res.data
    },
}

export const categoriesService = {
    list: async (): Promise<Category[]> => {
        const res = await api.get('/categories')
        return res.data.categories
    },
}

export const warehousesService = {
    list: async (): Promise<Warehouse[]> => {
        const res = await api.get('/warehouses')
        return res.data.warehouses
    },
}
