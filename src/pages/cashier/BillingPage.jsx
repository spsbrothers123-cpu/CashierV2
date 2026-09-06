import { useEffect, useState, useCallback } from 'react';
import { SearchBar } from '@/components/pos/SearchBar';
import { CategoryFilter } from '@/components/pos/CategoryFilter';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { ProductEditModal } from '@/components/pos/ProductEditModal';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { Cart } from '@/components/pos/Cart';
import { CustomerSelector } from '@/components/pos/CustomerSelector';
import { HeldBills } from '@/components/pos/HeldBills';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { BillDetails } from '@/components/bills/BillDetails';
import { useDebounce } from '@/hooks/useDebounce';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ui/Toast';
import { searchProducts, getCategories } from '@/api/products';
import { getHeldBills, deleteHeldBill } from '@/api/bills';

export function BillingPage() {
  const cashier = useAuthStore((s) => s.cashier);
  const session = useSessionStore((s) => s.session);
  const refreshSessionSummary = useSessionStore((s) => s.refreshSummary);
  const catalogueView = useSettingsStore((s) => s.catalogueView);
  const { push } = useToast();

  // Payment / bill viewing
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [resumePaymentAfterCustomer, setResumePaymentAfterCustomer] = useState(false);
  const [viewingBill, setViewingBill] = useState(null);

  // Catalogue state
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [productStatus, setProductStatus] = useState('loading');
  const [products, setProducts] = useState([]);
  const [productError, setProductError] = useState(null);

  // Barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotFound, setScanNotFound] = useState(false);

  // Product selection -> edit quantity/price -> add to cart
  const [editingProduct, setEditingProduct] = useState(null);

  // Customer + held bills
  const [customerOpen, setCustomerOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [heldStatus, setHeldStatus] = useState('idle');
  const [heldBills, setHeldBills] = useState([]);
  const [heldError, setHeldError] = useState(null);
  const [holding, setHolding] = useState(false);

  const {
    items,
    customer,
    addProduct,
    upsertCartItem,
    updateQuantity,
    removeProduct,
    setCustomer,
    clearCart,
    totals,
    holdCurrentBill,
  } = useCartStore();

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadProducts = useCallback(() => {
    setProductStatus('loading');
    searchProducts({ query: debouncedQuery, category })
      .then((res) => {
        setProducts(res);
        setProductStatus('success');
      })
      .catch((err) => {
        setProductError(err);
        setProductStatus('error');
      });
  }, [debouncedQuery, category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function handleSelectProduct(product) {
    if (product.stock <= 0) return;
    setEditingProduct(product);
  }

  function handleConfirmEdit({ quantity, unitPrice }) {
    const wasAlreadyInCart = items.some((i) => i.product.id === editingProduct.id);
    upsertCartItem(editingProduct, { quantity, unitPrice });
    push(wasAlreadyInCart ? `Updated ${editingProduct.name}` : `Added ${editingProduct.name}`, 'success');
    setEditingProduct(null);
  }

  function handleCancelEdit() {
    setEditingProduct(null);
  }

  async function handleBarcodeLookup(barcode) {
    setScanning(true);
    setScanNotFound(false);
    try {
      const results = await searchProducts({ barcode });
      if (results.length === 0) {
        setScanNotFound(true);
      } else {
        addProduct(results[0]);
        push(`Added ${results[0].name}`, 'success');
        setScannerOpen(false);
      }
    } catch (err) {
      push(err.message || 'Could not look up barcode.', 'error');
    } finally {
      setScanning(false);
    }
  }

  function openHeldBills() {
    setHeldOpen(true);
    setHeldStatus('loading');
    getHeldBills(cashier?.shop?.id)
      .then((res) => {
        setHeldBills(res);
        setHeldStatus('success');
      })
      .catch((err) => {
        setHeldError(err);
        setHeldStatus('error');
      });
  }

  async function handleHoldBill() {
    setHolding(true);
    const result = await holdCurrentBill({ shopId: cashier?.shop?.id });
    setHolding(false);
    if (result.ok) {
      push('Bill held.', 'success');
    } else {
      push(result.error?.message || 'Could not hold bill.', 'error');
    }
  }

  function handleResumeHeldBill(bill) {
    // Restore items/customer from the held bill into the active cart,
    // preserving any bill-level price override each line had.
    clearCart();
    bill.items.forEach((i) => {
      upsertCartItem(i.product, { quantity: i.quantity, unitPrice: i.unitPrice ?? i.product.price });
    });
    if (bill.customer) setCustomer(bill.customer);
    setHeldOpen(false);
    deleteHeldBill(bill.id).then(() =>
      setHeldBills((prev) => prev.filter((b) => b.id !== bill.id))
    );
  }

  async function handleDeleteHeldBill(id) {
    try {
      await deleteHeldBill(id);
      setHeldBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      push(err.message || 'Could not delete held bill.', 'error');
    }
  }

  function handleCompletePayment(method) {
    setPaymentMethod(method);
    setPaymentOpen(true);
  }

  function handlePaymentSuccess() {
    // Cart is only ever cleared after a confirmed backend success.
    clearCart();
    if (cashier?.id) refreshSessionSummary(cashier.id);
    push('Payment recorded.', 'success');
  }

  function handleClosePayment() {
    setPaymentOpen(false);
  }

  const cartQuantities = Object.fromEntries(items.map((i) => [i.product.id, i.quantity]));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
        <h1 className="font-display text-xl font-bold text-charcoal-900 sm:text-2xl">Product Catalogue &amp; Billing</h1>

        <div className="sticky top-0 z-10 -mx-4 mt-4 space-y-3 bg-ivory-100 px-4 py-2 sm:mx-0 sm:px-0">
          <SearchBar value={query} onChange={setQuery} onScanClick={() => setScannerOpen(true)} />
          <CategoryFilter categories={categories} active={category} onChange={setCategory} />
        </div>

        <div className="mt-4">
          <ProductGrid
            status={productStatus}
            error={productError}
            products={products}
            cartQuantities={cartQuantities}
            onSelect={handleSelectProduct}
            onRetry={loadProducts}
            hasQuery={!!debouncedQuery || !!category}
            view={catalogueView}
          />
        </div>
      </div>

      <div className="h-[55vh] shrink-0 border-t border-charcoal-900/8 lg:h-auto lg:w-[380px] lg:border-l lg:border-t-0">
        <Cart
          items={items}
          customer={customer}
          totals={totals()}
          onUpdateQuantity={updateQuantity}
          onRemove={removeProduct}
          onEditItem={(item) => setEditingProduct(item.product)}
          onClearCart={clearCart}
          onOpenCustomer={() => setCustomerOpen(true)}
          onOpenHold={openHeldBills}
          onHoldBill={handleHoldBill}
          holding={holding}
          onCompletePayment={handleCompletePayment}
        />
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onLookup={handleBarcodeLookup}
        looking={scanning}
        notFound={scanNotFound}
      />

      <CustomerSelector
        open={customerOpen}
        onClose={() => {
          setCustomerOpen(false);
          if (resumePaymentAfterCustomer) {
            setResumePaymentAfterCustomer(false);
            setPaymentOpen(true);
          }
        }}
        onSelect={(c) => {
          setCustomer(c);
          setCustomerOpen(false);
          if (resumePaymentAfterCustomer) {
            setResumePaymentAfterCustomer(false);
            setPaymentOpen(true);
          }
        }}
        selectedCustomer={customer}
      />

      <HeldBills
        open={heldOpen}
        onClose={() => setHeldOpen(false)}
        status={heldStatus}
        error={heldError}
        bills={heldBills}
        onResume={handleResumeHeldBill}
        onDelete={handleDeleteHeldBill}
        onRetry={openHeldBills}
      />

      <PaymentModal
        open={paymentOpen}
        onClose={handleClosePayment}
        cashier={cashier}
        session={session}
        items={items}
        customer={customer}
        totals={totals()}
        initialMethod={paymentMethod}
        onSelectCustomer={() => {
          setPaymentOpen(false);
          setResumePaymentAfterCustomer(true);
          setCustomerOpen(true);
        }}
        onSuccess={handlePaymentSuccess}
        onViewBill={(bill) => {
          setPaymentOpen(false);
          setViewingBill(bill);
        }}
      />

      <BillDetails open={!!viewingBill} onClose={() => setViewingBill(null)} bill={viewingBill} />

      <ProductEditModal
        open={!!editingProduct}
        product={editingProduct}
        existingItem={editingProduct ? items.find((i) => i.product.id === editingProduct.id) : null}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
      />
    </div>
  );
}
