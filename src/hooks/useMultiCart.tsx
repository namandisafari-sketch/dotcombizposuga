import { useState, useCallback, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "service" | "variant";
  productId?: string;
  variantId?: string;
  serviceId?: string;
  customerType?: "retail" | "wholesale";
  scentMixture?: string;
  bottleCost?: number;
  totalMl?: number;
  trackingType?: string;
  subtotal: number;
  selectedScents?: Array<{ scent: string; ml: number }>;
  pricePerMl?: number;
}

interface Cart {
  id: string;
  name: string;
  items: CartItem[];
  customerId: string | null;
  customerName: string;
  paymentMethod: string;
}

interface ParkedCart extends Cart {
  parkedAt: Date;
  reason?: string;
}

const STORAGE_KEY = "multi-cart-state";

export function useMultiCart() {
  const [carts, setCarts] = useState<Cart[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.carts || [createNewCart("Cart 1")];
      } catch {
        return [createNewCart("Cart 1")];
      }
    }
    return [createNewCart("Cart 1")];
  });

  const [activeCartId, setActiveCartId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.activeCartId || carts[0]?.id;
      } catch {
        return carts[0]?.id;
      }
    }
    return carts[0]?.id;
  });

  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.parkedCarts || [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ carts, activeCartId, parkedCarts })
    );
  }, [carts, activeCartId, parkedCarts]);

  function createNewCart(name: string): Cart {
    return {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      items: [],
      customerId: null,
      customerName: "Walk-in",
      paymentMethod: "cash",
    };
  }

  const activeCart = carts.find((c) => c.id === activeCartId) || carts[0];

  const cartItems = activeCart?.items || [];
  const customerName = activeCart?.customerName || "Walk-in";
  const customerId = activeCart?.customerId || null;
  const paymentMethod = activeCart?.paymentMethod || "cash";

  const setCartItems = useCallback(
    (items: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      setCarts((prev) =>
        prev.map((cart) =>
          cart.id === activeCartId
            ? {
                ...cart,
                items: typeof items === "function" ? items(cart.items) : items,
              }
            : cart
        )
      );
    },
    [activeCartId]
  );

  const setCartCustomer = useCallback(
    (customerId: string | null, customerName: string) => {
      setCarts((prev) =>
        prev.map((cart) =>
          cart.id === activeCartId
            ? { ...cart, customerId, customerName }
            : cart
        )
      );
    },
    [activeCartId]
  );

  const setCartPaymentMethod = useCallback(
    (method: string) => {
      setCarts((prev) =>
        prev.map((cart) =>
          cart.id === activeCartId ? { ...cart, paymentMethod: method } : cart
        )
      );
    },
    [activeCartId]
  );

  const cartTabs = carts.map((c) => ({
    id: c.id,
    name: c.name,
    itemCount: c.items.length,
  }));

  const switchCart = useCallback((cartId: string) => {
    setActiveCartId(cartId);
  }, []);

  const createNewCartTab = useCallback(() => {
    const newCart = createNewCart(`Cart ${carts.length + 1}`);
    setCarts((prev) => [...prev, newCart]);
    setActiveCartId(newCart.id);
    return newCart.id;
  }, [carts.length]);

  const closeCartTab = useCallback(
    (cartId: string) => {
      if (carts.length <= 1) return;
      setCarts((prev) => prev.filter((c) => c.id !== cartId));
      if (activeCartId === cartId) {
        const remaining = carts.filter((c) => c.id !== cartId);
        setActiveCartId(remaining[0]?.id);
      }
    },
    [carts, activeCartId]
  );

  const parkCurrentCart = useCallback(
    (reason?: string) => {
      if (!activeCart || activeCart.items.length === 0) return;
      
      const parkedCart: ParkedCart = {
        ...activeCart,
        parkedAt: new Date(),
        reason,
      };
      
      setParkedCarts((prev) => [...prev, parkedCart]);
      
      // Clear the current cart
      setCarts((prev) =>
        prev.map((cart) =>
          cart.id === activeCartId
            ? { ...cart, items: [], customerId: null, customerName: "Walk-in" }
            : cart
        )
      );
    },
    [activeCart, activeCartId]
  );

  const resumeParkedCart = useCallback(
    (parkedCartId: string) => {
      const parked = parkedCarts.find((p) => p.id === parkedCartId);
      if (!parked) return;

      // Replace current cart items with parked cart items
      setCarts((prev) =>
        prev.map((cart) =>
          cart.id === activeCartId
            ? {
                ...cart,
                items: parked.items,
                customerId: parked.customerId,
                customerName: parked.customerName,
                paymentMethod: parked.paymentMethod,
              }
            : cart
        )
      );

      // Remove from parked carts
      setParkedCarts((prev) => prev.filter((p) => p.id !== parkedCartId));
    },
    [parkedCarts, activeCartId]
  );

  const deleteParkedCart = useCallback((parkedCartId: string) => {
    setParkedCarts((prev) => prev.filter((p) => p.id !== parkedCartId));
  }, []);

  const removeParkedCartSilently = useCallback((parkedCartId: string) => {
    setParkedCarts((prev) => prev.filter((p) => p.id !== parkedCartId));
  }, []);

  const clearActiveCart = useCallback(() => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id === activeCartId
          ? { ...cart, items: [], customerId: null, customerName: "Walk-in" }
          : cart
      )
    );
  }, [activeCartId]);

  const clearCartById = useCallback((cartId: string) => {
    setCarts((prev) =>
      prev.map((cart) =>
        cart.id === cartId
          ? { ...cart, items: [], customerId: null, customerName: "Walk-in" }
          : cart
      )
    );
  }, []);

  const getCartsWithItems = useCallback(() => {
    return carts.filter((c) => c.items.length > 0);
  }, [carts]);

  return {
    cartItems,
    setCartItems,
    customerName,
    customerId,
    paymentMethod,
    setCartCustomer,
    setCartPaymentMethod,
    cartTabs,
    carts,
    activeCartId,
    switchCart,
    createNewCartTab,
    closeCartTab,
    parkedCarts,
    parkCurrentCart,
    resumeParkedCart,
    deleteParkedCart,
    clearActiveCart,
    removeParkedCartSilently,
    getCartsWithItems,
    clearCartById,
  };
}
