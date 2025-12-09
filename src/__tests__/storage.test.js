import { describe, it, expect, beforeEach } from 'vitest'
import { getProducts, saveProducts, addProduct, makeSale, getSales, getProductById, getProducts as getProductsFromStorage } from '../services/storage'

// Basic tests for storage.makeSale covering unit and weight scenarios

describe('storage.makeSale basic flows', () => {
  beforeEach(() => {
    // Reset localStorage keys used by storage.js
    localStorage.clear();
  })

  it('adds product and processes unit sale reducing stock', () => {
    const p = addProduct({ name: 'Test Unit', price: 10, stock: 5, saleType: 'unit' })
    const productsBefore = getProducts()
    expect(productsBefore.find(x => x.id === p.id)).toBeTruthy()

    const sale = makeSale({
      items: [{ productId: p.id, qty: 2, unitPrice: 10, subtotal: 20 }],
      total: 20,
      paymentMethod: 'dinheiro',
      transactionId: 't1'
    })

    const productsAfter = getProducts()
    const updated = productsAfter.find(x => x.id === p.id)
    expect(updated.stock).toBe(3)
    expect(sale.total).toBe(20)
  })

  it('processes weight sale reducing grams stock', () => {
    const p = addProduct({ name: 'Test Weight', saleType: 'weight', pricePerKilo: 20, stock: 5000 })
    // Sell 250g (0.25kg) once
    const unitPrice = (250/1000) * 20
    const sale = makeSale({
      items: [{ productId: p.id, qty: 1, weight: 250, unitPrice, subtotal: unitPrice }],
      total: unitPrice,
      paymentMethod: 'dinheiro',
      transactionId: 't2'
    })

    const productsAfter = getProducts()
    const updated = productsAfter.find(x => x.id === p.id)
    expect(updated.stock).toBe(4750)
    expect(sale.total).toBeCloseTo(unitPrice)
  })
})
