'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    maxStock?: number; // max available from inventory
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    refreshStock: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(() => {
        // Lazy initializer: runs only on first render, safe in Next.js since this is a client component
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem('@tcghub:cart');
            return stored ? (JSON.parse(stored) as CartItem[]) : [];
        } catch {
            return [];
        }
    });
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('@tcghub:cart', JSON.stringify(items));
    }, [items]);

    // Refresh stock from API and update maxStock on cart items
    const refreshStock = useCallback(async () => {
        if (items.length === 0) return;
        try {
            const ids = items.map(i => i.id);
            const params = new URLSearchParams();
            ids.forEach(id => params.append('ids[]', id));
            const res = await fetch(`/api/estoque?${params.toString()}`);
            if (!res.ok) return;
            const stockMap: Record<string, number> = await res.json();
            setItems(prev => prev.map(item => ({
                ...item,
                maxStock: stockMap[item.id] ?? item.maxStock,
                // If cart qty exceeds available stock, cap it
                quantity: Math.min(item.quantity, stockMap[item.id] ?? item.quantity)
            })));
        } catch (e) {
            console.error('Erro ao atualizar estoque:', e);
        }
    }, [items]);

    const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
        setItems(prev => {
            const existing = prev.find(item => item.id === newItem.id);
            if (existing) {
                const max = existing.maxStock ?? Infinity;
                if (existing.quantity >= max) return prev; // Blocked by stock
                return prev.map(item => item.id === newItem.id
                    ? { ...item, quantity: Math.min(item.quantity + 1, max) }
                    : item
                );
            }
            return [...prev, { ...newItem, quantity: 1, maxStock: newItem.maxStock }];
        });
        setIsOpen(true);
    };

    const updateQuantity = (id: string, quantity: number) => {
        setItems(prev => {
            if (quantity <= 0) return prev.filter(item => item.id !== id);
            return prev.map(item => {
                if (item.id !== id) return item;
                const max = item.maxStock ?? Infinity;
                return { ...item, quantity: Math.min(quantity, max) };
            });
        });
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, isOpen, setIsOpen, refreshStock }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
}
