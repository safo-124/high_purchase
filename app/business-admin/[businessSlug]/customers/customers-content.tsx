"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { recordPaymentAsBusinessAdmin, getBusinessCustomerPurchases, createBusinessCustomer, updateBusinessCustomer, deleteBusinessCustomer, updateBusinessPurchaseItems, getBusinessShopProducts, getBusinessPurchaseDetails, BusinessShopProduct, BusinessPurchaseDetails } from "../../actions"

interface Customer {
  id: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  email: string | null
  idType: string | null
  idNumber: string | null
  address: string | null
  city: string | null
  region: string | null
  notes: string | null
  isActive: boolean
  assignedCollectorId: string | null
  assignedCollectorName: string | null
  createdAt: Date
  shopName: string
  shopSlug: string
  totalPurchases: number
  activePurchases: number
  totalPurchased: number
  totalPaid: number
  outstanding: number
  productNames: string[]
  hasAccount: boolean
  accountEmail: string | null
}

interface Shop {
  name: string
  shopSlug: string
}

interface Collector {
  id: string
  name: string
  shopSlug: string
  shopName: string
}

interface Purchase {
  id: string
  purchaseNumber: string
  totalAmount: number
  amountPaid: number
  outstandingBalance: number
  status: string
  items: { productName: string; quantity: number }[]
}

interface CustomersContentProps {
  customers: Customer[]
  shops: Shop[]
  collectors: Collector[]
  businessSlug: string
}

export function CustomersContent({ customers, shops, collectors, businessSlug }: CustomersContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [shopFilter, setShopFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cleared">("all")
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "recent">("name")
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean
    customer: Customer | null
    purchases: Purchase[]
    loading: boolean
  }>({ open: false, customer: null, purchases: [], loading: false })
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD">("CASH")
  const [paymentReference, setPaymentReference] = useState("")

  // New customer modal state
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    shopSlug: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    idType: "",
    idNumber: "",
    address: "",
    city: "",
    region: "",
    notes: "",
    assignedCollectorId: "",
    // Account creation fields
    createAccount: false,
    accountEmail: "",
    accountPassword: "",
    confirmPassword: "",
  })

  // Edit purchase modal state
  interface EditCartItem {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }
  
  const [editPurchaseModal, setEditPurchaseModal] = useState<{
    open: boolean
    customer: Customer | null
    purchase: BusinessPurchaseDetails | null
    products: BusinessShopProduct[]
    loading: boolean
  }>({ open: false, customer: null, purchase: null, products: [], loading: false })
  const [editCart, setEditCart] = useState<EditCartItem[]>([])
  const [editSelectedProductId, setEditSelectedProductId] = useState("")
  const [editQuantity, setEditQuantity] = useState(1)
  const [isUpdatingPurchase, setIsUpdatingPurchase] = useState(false)

  const openEditPurchaseModal = async (customer: Customer, purchaseId: string) => {
    setEditPurchaseModal({ open: true, customer, purchase: null, products: [], loading: true })
    setEditCart([])
    setEditSelectedProductId("")
    setEditQuantity(1)
    
    // Fetch purchase details and products in parallel
    const [purchaseResult, productsResult] = await Promise.all([
      getBusinessPurchaseDetails(businessSlug, purchaseId),
      getBusinessShopProducts(businessSlug, customer.shopSlug),
    ])

    if (purchaseResult.success && purchaseResult.data && productsResult.success && productsResult.data) {
      const purchaseData = purchaseResult.data as BusinessPurchaseDetails
      setEditPurchaseModal(prev => ({ 
        ...prev, 
        purchase: purchaseData, 
        products: productsResult.data as BusinessShopProduct[], 
        loading: false 
      }))
      // Initialize cart with current items
      setEditCart(purchaseData.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })))
    } else {
      toast.error(purchaseResult.error || productsResult.error || "Failed to load data")
      setEditPurchaseModal(prev => ({ ...prev, loading: false }))
    }
  }

  const addToEditCart = () => {
    if (!editSelectedProductId || !editPurchaseModal.purchase) return
    const product = editPurchaseModal.products.find(p => p.id === editSelectedProductId)
    if (!product) return

    const existingIndex = editCart.findIndex(item => item.productId === editSelectedProductId)
    if (existingIndex >= 0) {
      const newCart = [...editCart]
      newCart[existingIndex].quantity += editQuantity
      newCart[existingIndex].totalPrice = newCart[existingIndex].unitPrice * newCart[existingIndex].quantity
      setEditCart(newCart)
    } else {
      const purchaseType = editPurchaseModal.purchase.purchaseType
      const unitPrice = purchaseType === "CASH" 
        ? product.cashPrice 
        : purchaseType === "LAYAWAY" 
        ? product.layawayPrice 
        : product.creditPrice
      
      setEditCart([...editCart, {
        productId: product.id,
        productName: product.name,
        quantity: editQuantity,
        unitPrice,
        totalPrice: unitPrice * editQuantity,
      }])
    }
    setEditSelectedProductId("")
    setEditQuantity(1)
  }

  const removeFromEditCart = (productId: string) => {
    setEditCart(editCart.filter(item => item.productId !== productId))
  }

  const updateEditItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) return removeFromEditCart(productId)
    setEditCart(editCart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
        : item
    ))
  }

  const editCartTotal = editCart.reduce((sum, item) => sum + item.totalPrice, 0)

  const handleUpdatePurchase = async () => {
    if (!editPurchaseModal.purchase || editCart.length === 0) return

    setIsUpdatingPurchase(true)
    
    const result = await updateBusinessPurchaseItems(businessSlug, editPurchaseModal.purchase.id, {
      items: editCart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })

    if (result.success) {
      toast.success("Purchase items updated successfully")
      setEditPurchaseModal({ open: false, customer: null, purchase: null, products: [], loading: false })
      setEditCart([])
      router.refresh()
    } else {
      toast.error(result.error || "Failed to update purchase")
    }
    
    setIsUpdatingPurchase(false)
  }

  const openPaymentModal = async (customer: Customer) => {
    setPaymentModal({ open: true, customer, purchases: [], loading: true })
    setSelectedPurchaseId("")
    setPaymentAmount("")
    setPaymentReference("")
    
    const result = await getBusinessCustomerPurchases(businessSlug, customer.id)
    if (result.success && result.data) {
      setPaymentModal(prev => ({ ...prev, purchases: result.data as Purchase[], loading: false }))
      if (result.data.length > 0) {
        setSelectedPurchaseId(result.data[0].id)
      }
    } else {
      toast.error(result.error || "Failed to load purchases")
      setPaymentModal(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedPurchaseId || !paymentAmount) {
      toast.error("Please select a purchase and enter an amount")
      return
    }
    
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount")
      return
    }
    
    startTransition(async () => {
      const result = await recordPaymentAsBusinessAdmin(businessSlug, {
        purchaseId: selectedPurchaseId,
        amount,
        paymentMethod,
        reference: paymentReference || undefined,
      })
      
      if (result.success) {
        const data = result.data as { awaitingConfirmation?: boolean } | undefined
        if (data?.awaitingConfirmation) {
          toast.success("Payment recorded - awaiting confirmation")
        } else {
          toast.success("Payment recorded and confirmed")
        }
        setPaymentModal({ open: false, customer: null, purchases: [], loading: false })
        router.refresh()
      } else {
        toast.error(result.error || "Failed to record payment")
      }
    })
  }

  const handleNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCustomerForm.shopSlug) {
      toast.error("Please select a shop")
      return
    }
    if (!newCustomerForm.firstName.trim()) {
      toast.error("First name is required")
      return
    }
    if (!newCustomerForm.lastName.trim()) {
      toast.error("Last name is required")
      return
    }
    if (!newCustomerForm.phone.trim()) {
      toast.error("Phone number is required")
      return
    }

    // Validate account creation fields
    if (newCustomerForm.createAccount) {
      if (!newCustomerForm.accountEmail.trim()) {
        toast.error("Email is required for account creation")
        return
      }
      if (newCustomerForm.accountPassword.length < 8) {
        toast.error("Password must be at least 8 characters")
        return
      }
      if (newCustomerForm.accountPassword !== newCustomerForm.confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    startTransition(async () => {
      const result = await createBusinessCustomer(businessSlug, {
        shopSlug: newCustomerForm.shopSlug,
        firstName: newCustomerForm.firstName,
        lastName: newCustomerForm.lastName,
        phone: newCustomerForm.phone,
        email: newCustomerForm.createAccount ? undefined : (newCustomerForm.email || null),
        idType: newCustomerForm.idType || null,
        idNumber: newCustomerForm.idNumber || null,
        address: newCustomerForm.address || null,
        city: newCustomerForm.city || null,
        region: newCustomerForm.region || null,
        notes: newCustomerForm.notes || null,
        assignedCollectorId: newCustomerForm.assignedCollectorId || null,
        createAccount: newCustomerForm.createAccount,
        accountEmail: newCustomerForm.createAccount ? newCustomerForm.accountEmail : undefined,
        accountPassword: newCustomerForm.createAccount ? newCustomerForm.accountPassword : undefined,
      })

      if (result.success) {
        const data = result.data as { hasAccount?: boolean }
        if (data?.hasAccount) {
          toast.success("Customer created with portal account!")
        } else {
          toast.success("Customer created successfully")
        }
        setShowNewCustomer(false)
        resetNewCustomerForm()
        router.refresh()
      } else {
        toast.error(result.error || "Failed to create customer")
      }
    })
  }

  const resetNewCustomerForm = () => {
    setNewCustomerForm({
      shopSlug: shops.length > 0 ? shops[0].shopSlug : "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      idType: "",
      idNumber: "",
      address: "",
      city: "",
      region: "",
      notes: "",
      assignedCollectorId: "",
      createAccount: false,
      accountEmail: "",
      accountPassword: "",
      confirmPassword: "",
    })
  }

  // Edit customer modal state
  const [editModal, setEditModal] = useState<{
    open: boolean
    customer: Customer | null
  }>({ open: false, customer: null })
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    idType: "",
    idNumber: "",
    address: "",
    city: "",
    region: "",
    notes: "",
    isActive: true,
    assignedCollectorId: "",
    // Portal account creation
    createAccount: false,
    accountEmail: "",
    accountPassword: "",
    confirmPassword: "",
    // Portal account deactivation
    deactivateAccount: false,
    // Portal account password reset
    resetPassword: false,
    newPassword: "",
    confirmNewPassword: "",
  })

  const openEditModal = (customer: Customer) => {
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email || "",
      idType: customer.idType || "",
      idNumber: customer.idNumber || "",
      address: customer.address || "",
      city: customer.city || "",
      region: customer.region || "",
      notes: customer.notes || "",
      isActive: customer.isActive,
      assignedCollectorId: customer.assignedCollectorId || "",
      createAccount: false,
      accountEmail: "",
      accountPassword: "",
      confirmPassword: "",
      deactivateAccount: false,
      resetPassword: false,
      newPassword: "",
      confirmNewPassword: "",
    })
    setEditModal({ open: true, customer })
  }

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editModal.customer) return

    if (!editForm.firstName.trim()) {
      toast.error("First name is required")
      return
    }
    if (!editForm.lastName.trim()) {
      toast.error("Last name is required")
      return
    }
    if (!editForm.phone.trim()) {
      toast.error("Phone number is required")
      return
    }

    // Validate portal account fields if creating account
    if (editForm.createAccount) {
      if (!editForm.accountEmail.trim()) {
        toast.error("Email is required for portal account")
        return
      }
      if (editForm.accountPassword.length < 8) {
        toast.error("Password must be at least 8 characters")
        return
      }
      if (editForm.accountPassword !== editForm.confirmPassword) {
        toast.error("Passwords do not match")
        return
      }
    }

    // Validate password reset fields
    if (editForm.resetPassword) {
      if (editForm.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters")
        return
      }
      if (editForm.newPassword !== editForm.confirmNewPassword) {
        toast.error("New passwords do not match")
        return
      }
    }

    startTransition(async () => {
      const result = await updateBusinessCustomer(businessSlug, editModal.customer!.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email || null,
        idType: editForm.idType || null,
        idNumber: editForm.idNumber || null,
        address: editForm.address || null,
        city: editForm.city || null,
        region: editForm.region || null,
        notes: editForm.notes || null,
        isActive: editForm.isActive,
        assignedCollectorId: editForm.assignedCollectorId || null,
        // Portal account fields
        createAccount: editForm.createAccount,
        accountEmail: editForm.createAccount ? editForm.accountEmail : undefined,
        accountPassword: editForm.createAccount ? editForm.accountPassword : undefined,
        // Portal account deactivation
        deactivateAccount: editForm.deactivateAccount,
        // Portal account password reset
        resetPassword: editForm.resetPassword,
        newPassword: editForm.resetPassword ? editForm.newPassword : undefined,
      })

      if (result.success) {
        const message = editForm.deactivateAccount 
          ? "Customer updated and portal account deactivated" 
          : editForm.resetPassword
            ? "Customer updated and password reset"
            : editForm.createAccount 
              ? "Customer updated and portal account created" 
              : "Customer updated successfully"
        toast.success(message)
        setEditModal({ open: false, customer: null })
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update customer")
      }
    })
  }

  // Delete customer modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    customer: Customer | null
  }>({ open: false, customer: null })

  const handleDeleteCustomer = async () => {
    if (!deleteModal.customer) return

    startTransition(async () => {
      const result = await deleteBusinessCustomer(businessSlug, deleteModal.customer!.id)

      if (result.success) {
        toast.success("Customer deleted successfully")
        setDeleteModal({ open: false, customer: null })
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete customer")
      }
    })
  }

  // Get collectors for the selected shop (new customer)
  const availableCollectors = newCustomerForm.shopSlug
    ? collectors.filter(c => c.shopSlug === newCustomerForm.shopSlug)
    : []

  // Get collectors for edit modal
  const editCollectors = editModal.customer
    ? collectors.filter(c => c.shopSlug === editModal.customer!.shopSlug)
    : []

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      (customer.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || "").includes(searchQuery) ||
      (customer.idNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesShop = shopFilter === "all" || customer.shopSlug === shopFilter
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && customer.activePurchases > 0) ||
      (statusFilter === "cleared" && customer.outstanding === 0 && customer.totalPurchases > 0)
    
    return matchesSearch && matchesShop && matchesStatus
  })

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case "outstanding":
        return b.outstanding - a.outstanding
      case "recent":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return a.fullName.localeCompare(b.fullName)
    }
  })

  return (
    <div className="glass-card overflow-hidden">
      {/* Search & Filters */}
      <div className="p-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.shopSlug} value={shop.shopSlug}>
                {shop.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "active", "cleared"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                }`}
              >
                {status === "all" ? "All" : status === "active" ? "Active HP" : "Cleared"}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="name">Sort by Name</option>
            <option value="outstanding">Sort by Outstanding</option>
            <option value="recent">Sort by Recent</option>
          </select>

          {/* New Customer Button */}
          <button
            onClick={() => {
              resetNewCustomerForm()
              setShowNewCustomer(true)
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Customer
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5">
        <p className="text-sm text-slate-400">
          Showing {sortedCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* Customers Table */}
      {sortedCustomers.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No customers found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Shop</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Purchases</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-cyan-300">
                          {(customer.fullName || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{customer.fullName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{customer.phone || "N/A"}</p>
                        {customer.email && (
                          <p className="text-xs text-slate-500">{customer.email}</p>
                        )}
                        {(customer.city || customer.region) && (
                          <p className="text-xs text-slate-600">
                            {[customer.city, customer.region].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                        {customer.shopName}
                      </span>
                      {customer.assignedCollectorName && (
                        <p className="text-xs text-cyan-400 mt-1.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {customer.assignedCollectorName}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{customer.totalPurchases}</p>
                      {customer.activePurchases > 0 && (
                        <p className="text-xs text-cyan-400">{customer.activePurchases} active</p>
                      )}
                      {customer.productNames.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1 max-w-[150px] truncate" title={customer.productNames.join(", ")}>
                          {customer.productNames.slice(0, 2).join(", ")}{customer.productNames.length > 2 ? ` +${customer.productNames.length - 2}` : ""}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">₵{customer.totalPurchased.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-green-400 font-medium">₵{customer.totalPaid.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-medium ${customer.outstanding > 0 ? "text-amber-400" : "text-green-400"}`}>
                      ₵{customer.outstanding.toLocaleString()}
                    </p>
                    {customer.totalPurchased > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            style={{ width: `${Math.round((customer.totalPaid / customer.totalPurchased) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {Math.round((customer.totalPaid / customer.totalPurchased) * 100)}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {customer.activePurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Active HP
                      </span>
                    ) : customer.outstanding === 0 && customer.totalPurchases > 0 ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Cleared
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        New
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!customer.isActive && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Inactive
                        </span>
                      )}
                      <button
                        onClick={() => openEditModal(customer)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-all flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, customer })}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                      {customer.outstanding > 0 && (
                        <button
                          onClick={() => openPaymentModal(customer)}
                          className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-all flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                          </svg>
                          Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Recording Modal */}
      {paymentModal.open && paymentModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Record Payment</h3>
              <button
                onClick={() => setPaymentModal({ open: false, customer: null, purchases: [], loading: false })}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-sm text-slate-400">Customer</p>
              <p className="text-white font-medium">{paymentModal.customer.fullName}</p>
              <p className="text-xs text-slate-500">{paymentModal.customer.phone} • {paymentModal.customer.shopName}</p>
            </div>

            {paymentModal.loading ? (
              <div className="text-center py-8">
                <svg className="w-8 h-8 animate-spin mx-auto text-cyan-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400 mt-2">Loading purchases...</p>
              </div>
            ) : paymentModal.purchases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No active purchases with outstanding balance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select Purchase */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Purchase <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedPurchaseId}
                      onChange={(e) => setSelectedPurchaseId(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    >
                      {paymentModal.purchases.map((purchase) => (
                        <option key={purchase.id} value={purchase.id} className="bg-slate-800">
                          {purchase.purchaseNumber} - Outstanding: ₵{purchase.outstandingBalance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {selectedPurchaseId && paymentModal.customer && (
                      <button
                        onClick={() => {
                          setPaymentModal({ open: false, customer: null, purchases: [], loading: false })
                          openEditPurchaseModal(paymentModal.customer!, selectedPurchaseId)
                        }}
                        className="px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium transition-all flex items-center gap-1.5"
                        title="Edit Items"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                  {selectedPurchaseId && (
                    <div className="mt-2 text-xs text-slate-500">
                      {paymentModal.purchases.find(p => p.id === selectedPurchaseId)?.items.map(i => `${i.productName} ×${i.quantity}`).join(", ")}
                    </div>
                  )}
                </div>

                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₵</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="CASH" className="bg-slate-800">Cash</option>
                    <option value="MOBILE_MONEY" className="bg-slate-800">Mobile Money</option>
                    <option value="BANK_TRANSFER" className="bg-slate-800">Bank Transfer</option>
                    <option value="CARD" className="bg-slate-800">Card</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, receipt number, etc."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setPaymentModal({ open: false, customer: null, purchases: [], loading: false })}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={isPending || !selectedPurchaseId || !paymentAmount}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Recording..." : "Record Payment"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center">
                  Payment will be pending confirmation by a shop admin
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">New Customer</h3>
              <button
                onClick={() => setShowNewCustomer(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleNewCustomer} className="space-y-4">
              {/* Shop Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Shop <span className="text-red-400">*</span>
                </label>
                <select
                  value={newCustomerForm.shopSlug}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, shopSlug: e.target.value, assignedCollectorId: "" }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  required
                >
                  <option value="" className="bg-slate-800">Select a shop</option>
                  {shops.map((shop) => (
                    <option key={shop.shopSlug} value={shop.shopSlug} className="bg-slate-800">
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.firstName}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.lastName}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0XX XXX XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* ID Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ID Type
                  </label>
                  <select
                    value={newCustomerForm.idType}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, idType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="" className="bg-slate-800">Select...</option>
                    <option value="Ghana Card" className="bg-slate-800">Ghana Card</option>
                    <option value="Passport" className="bg-slate-800">Passport</option>
                    <option value="Driver License" className="bg-slate-800">Driver License</option>
                    <option value="Voter ID" className="bg-slate-800">Voter ID</option>
                    <option value="SSNIT" className="bg-slate-800">SSNIT</option>
                    <option value="Other" className="bg-slate-800">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ID Number
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.idNumber}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="GHA-XXXXXXXXX-X"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* City & Region Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.city}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Region
                  </label>
                  <select
                    value={newCustomerForm.region}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="" className="bg-slate-800">Select region...</option>
                    <option value="Greater Accra" className="bg-slate-800">Greater Accra</option>
                    <option value="Ashanti" className="bg-slate-800">Ashanti</option>
                    <option value="Western" className="bg-slate-800">Western</option>
                    <option value="Central" className="bg-slate-800">Central</option>
                    <option value="Eastern" className="bg-slate-800">Eastern</option>
                    <option value="Northern" className="bg-slate-800">Northern</option>
                    <option value="Volta" className="bg-slate-800">Volta</option>
                    <option value="Upper East" className="bg-slate-800">Upper East</option>
                    <option value="Upper West" className="bg-slate-800">Upper West</option>
                    <option value="Brong Ahafo" className="bg-slate-800">Brong Ahafo</option>
                    <option value="Savannah" className="bg-slate-800">Savannah</option>
                    <option value="Bono East" className="bg-slate-800">Bono East</option>
                    <option value="Ahafo" className="bg-slate-800">Ahafo</option>
                    <option value="Western North" className="bg-slate-800">Western North</option>
                    <option value="Oti" className="bg-slate-800">Oti</option>
                    <option value="North East" className="bg-slate-800">North East</option>
                  </select>
                </div>
              </div>

              {/* Assigned Debt Collector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assigned Debt Collector
                </label>
                <select
                  value={newCustomerForm.assignedCollectorId}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, assignedCollectorId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  disabled={!newCustomerForm.shopSlug}
                >
                  <option value="" className="bg-slate-800">
                    {!newCustomerForm.shopSlug 
                      ? "Select a shop first" 
                      : availableCollectors.length === 0 
                        ? "No collectors in this shop" 
                        : "No collector assigned"}
                  </option>
                  {availableCollectors.map((collector) => (
                    <option key={collector.id} value={collector.id} className="bg-slate-800">
                      {collector.name}
                    </option>
                  ))}
                </select>
                {newCustomerForm.shopSlug && availableCollectors.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    No debt collectors assigned to this shop
                  </p>
                )}
              </div>

              {/* Customer Portal Account */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Customer Portal Account
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Allow customer to log in and view their purchases
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewCustomerForm(prev => ({ ...prev, createAccount: !prev.createAccount }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      newCustomerForm.createAccount ? "bg-cyan-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        newCustomerForm.createAccount ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {newCustomerForm.createAccount && (
                  <div className="space-y-4 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Account Email <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={newCustomerForm.accountEmail}
                        onChange={(e) => setNewCustomerForm(prev => ({ ...prev, accountEmail: e.target.value }))}
                        placeholder="customer@email.com"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        required={newCustomerForm.createAccount}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          value={newCustomerForm.accountPassword}
                          onChange={(e) => setNewCustomerForm(prev => ({ ...prev, accountPassword: e.target.value }))}
                          placeholder="Min. 8 characters"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                          required={newCustomerForm.createAccount}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Confirm Password <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          value={newCustomerForm.confirmPassword}
                          onChange={(e) => setNewCustomerForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm password"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                          required={newCustomerForm.createAccount}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      The customer will be able to log in at <span className="text-cyan-400">/customer</span> with these credentials.
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModal.open && editModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Edit Customer</h3>
              <button
                onClick={() => setEditModal({ open: false, customer: null })}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Shop Info */}
            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-sm text-slate-400">Shop</p>
              <p className="text-white font-medium">{editModal.customer.shopName}</p>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="font-medium text-white">Account Status</p>
                  <p className="text-sm text-slate-400">
                    {editForm.isActive ? "Customer can make new purchases" : "Customer account is disabled"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative w-14 h-7 rounded-full transition-all ${
                    editForm.isActive 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                      : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                      editForm.isActive ? "left-8" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              {/* ID Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ID Type (Optional)
                  </label>
                  <select
                    value={editForm.idType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, idType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="" className="bg-slate-800">Select ID Type</option>
                    <option value="Ghana Card" className="bg-slate-800">Ghana Card</option>
                    <option value="Passport" className="bg-slate-800">Passport</option>
                    <option value="Voter ID" className="bg-slate-800">Voter ID</option>
                    <option value="Driver License" className="bg-slate-800">Driver License</option>
                    <option value="NHIS" className="bg-slate-800">NHIS Card</option>
                    <option value="Other" className="bg-slate-800">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ID Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.idNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="ID Number"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* City & Region */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
                <div>
                  <select
                    value={editForm.region}
                    onChange={(e) => setEditForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="" className="bg-slate-800">Select region...</option>
                    <option value="Greater Accra" className="bg-slate-800">Greater Accra</option>
                    <option value="Ashanti" className="bg-slate-800">Ashanti</option>
                    <option value="Western" className="bg-slate-800">Western</option>
                    <option value="Central" className="bg-slate-800">Central</option>
                    <option value="Eastern" className="bg-slate-800">Eastern</option>
                    <option value="Northern" className="bg-slate-800">Northern</option>
                    <option value="Volta" className="bg-slate-800">Volta</option>
                    <option value="Upper East" className="bg-slate-800">Upper East</option>
                    <option value="Upper West" className="bg-slate-800">Upper West</option>
                    <option value="Brong Ahafo" className="bg-slate-800">Brong Ahafo</option>
                    <option value="Savannah" className="bg-slate-800">Savannah</option>
                    <option value="Bono East" className="bg-slate-800">Bono East</option>
                    <option value="Ahafo" className="bg-slate-800">Ahafo</option>
                    <option value="Western North" className="bg-slate-800">Western North</option>
                    <option value="Oti" className="bg-slate-800">Oti</option>
                    <option value="North East" className="bg-slate-800">North East</option>
                  </select>
                </div>
              </div>

              {/* Assigned Debt Collector */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assigned Debt Collector
                </label>
                <select
                  value={editForm.assignedCollectorId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, assignedCollectorId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="" className="bg-slate-800">
                    {editCollectors.length === 0 ? "No collectors in this shop" : "No collector assigned"}
                  </option>
                  {editCollectors.map((collector) => (
                    <option key={collector.id} value={collector.id} className="bg-slate-800">
                      {collector.name}
                    </option>
                  ))}
                </select>
                {editCollectors.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    No debt collectors assigned to this shop
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Customer Portal Account */}
              {editModal.customer && !editModal.customer.hasAccount && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-white">Customer Portal Account</p>
                        <p className="text-xs text-slate-400">Allow customer to log in and view their purchases</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, createAccount: !prev.createAccount }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editForm.createAccount ? "bg-cyan-500" : "bg-slate-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.createAccount ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {editForm.createAccount && (
                    <div className="space-y-3 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Account Email</label>
                        <input
                          type="email"
                          value={editForm.accountEmail}
                          onChange={(e) => setEditForm(prev => ({ ...prev, accountEmail: e.target.value }))}
                          placeholder="customer@email.com"
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                          <input
                            type="password"
                            value={editForm.accountPassword}
                            onChange={(e) => setEditForm(prev => ({ ...prev, accountPassword: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Confirm Password</label>
                          <input
                            type="password"
                            value={editForm.confirmPassword}
                            onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Password must be at least 8 characters</p>
                    </div>
                  )}
                </div>
              )}

              {/* Already has portal account - with toggle to deactivate and password reset */}
              {editModal.customer && editModal.customer.hasAccount && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${editForm.deactivateAccount ? "text-red-400" : "text-green-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {editForm.deactivateAccount ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      <div>
                        <p className={`text-sm font-medium ${editForm.deactivateAccount ? "text-red-400" : "text-green-400"}`}>
                          {editForm.deactivateAccount ? "Portal Account Will Be Deactivated" : "Portal Account Active"}
                        </p>
                        <p className="text-xs text-slate-400">{editModal.customer.accountEmail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, deactivateAccount: !prev.deactivateAccount, resetPassword: false }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        !editForm.deactivateAccount ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={editForm.deactivateAccount ? "Click to keep account active" : "Click to deactivate account"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          !editForm.deactivateAccount ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Account details and password reset when active */}
                  {!editForm.deactivateAccount && (
                    <div className="mt-3 space-y-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                      {/* Email (read-only) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Account Email</label>
                        <input
                          type="email"
                          value={editModal.customer.accountEmail || ""}
                          readOnly
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm cursor-not-allowed"
                        />
                      </div>

                      {/* Reset Password Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">Reset Password</p>
                          <p className="text-xs text-slate-400">Set a new password for this account</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({ ...prev, resetPassword: !prev.resetPassword, newPassword: "", confirmNewPassword: "" }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            editForm.resetPassword ? "bg-cyan-500" : "bg-slate-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              editForm.resetPassword ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Password fields when reset is enabled */}
                      {editForm.resetPassword && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                            <input
                              type="password"
                              value={editForm.newPassword}
                              onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={editForm.confirmNewPassword}
                              onChange={(e) => setEditForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            />
                          </div>
                          <p className="col-span-2 text-xs text-slate-500">Password must be at least 8 characters</p>
                        </div>
                      )}
                    </div>
                  )}

                  {editForm.deactivateAccount && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-xs text-red-400">
                        ⚠️ The customer will no longer be able to log into their portal account. Their purchase history and data will be preserved.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, customer: null })}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Customer</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-white font-medium">{deleteModal.customer.fullName}</p>
              <p className="text-xs text-slate-500">{deleteModal.customer.phone} • {deleteModal.customer.shopName}</p>
            </div>

            {deleteModal.customer.activePurchases > 0 ? (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-400">
                  <strong>Warning:</strong> This customer has {deleteModal.customer.activePurchases} active purchase(s). 
                  You must complete or cancel all purchases before deleting this customer.
                </p>
              </div>
            ) : (
              <p className="text-slate-300 text-sm mb-4">
                Are you sure you want to delete this customer? All associated data will be permanently removed.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, customer: null })}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isPending || deleteModal.customer.activePurchases > 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Customer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Modal */}
      {editPurchaseModal.open && editPurchaseModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Edit Purchase Items</h3>
                  {editPurchaseModal.purchase && (
                    <p className="text-sm text-slate-400">{editPurchaseModal.purchase.purchaseNumber} • {editPurchaseModal.purchase.purchaseType}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setEditPurchaseModal({ open: false, customer: null, purchase: null, products: [], loading: false })
                  setEditCart([])
                }}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-white/5 rounded-xl">
              <p className="text-sm text-slate-400">Customer</p>
              <p className="text-white font-medium">{editPurchaseModal.customer.fullName}</p>
              <p className="text-xs text-slate-500">{editPurchaseModal.customer.phone} • {editPurchaseModal.customer.shopName}</p>
            </div>

            {editPurchaseModal.loading ? (
              <div className="text-center py-8">
                <svg className="w-8 h-8 animate-spin mx-auto text-violet-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400 mt-2">Loading purchase details...</p>
              </div>
            ) : editPurchaseModal.purchase && (
              <div className="space-y-4">
                {/* Add Product */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Add Product</h4>
                  <div className="flex gap-3">
                    <select
                      value={editSelectedProductId}
                      onChange={(e) => setEditSelectedProductId(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                    >
                      <option value="" className="bg-slate-800">Select a product...</option>
                      {editPurchaseModal.products.filter(p => p.stockQuantity > 0).map((product) => (
                        <option key={product.id} value={product.id} className="bg-slate-800">
                          {product.name} - ₵{
                            (editPurchaseModal.purchase?.purchaseType === "CASH" 
                              ? product.cashPrice 
                              : editPurchaseModal.purchase?.purchaseType === "LAYAWAY" 
                              ? product.layawayPrice 
                              : product.creditPrice
                            ).toLocaleString()
                          } (Stock: {product.stockQuantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                    />
                    <button
                      onClick={addToEditCart}
                      disabled={!editSelectedProductId}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-all disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Purchase Items</h4>
                  {editCart.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No items in purchase</p>
                  ) : (
                    <div className="space-y-3">
                      {editCart.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{item.productName}</p>
                            <p className="text-xs text-slate-400">₵{item.unitPrice.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateEditItemQuantity(item.productId, item.quantity - 1)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                              <button
                                onClick={() => updateEditItemQuantity(item.productId, item.quantity + 1)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m6-6H6" />
                                </svg>
                              </button>
                            </div>
                            <span className="w-24 text-right text-sm font-medium text-white">
                              ₵{item.totalPrice.toLocaleString()}
                            </span>
                            <button
                              onClick={() => removeFromEditCart(item.productId)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">New Subtotal</p>
                      <p className="text-lg font-bold text-white">₵{editCartTotal.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Previous Subtotal</p>
                      <p className="text-lg font-medium text-slate-400">₵{editPurchaseModal.purchase.subtotal.toLocaleString()}</p>
                    </div>
                  </div>
                  {editCartTotal !== editPurchaseModal.purchase.subtotal && (
                    <p className={`text-sm mt-2 ${editCartTotal > editPurchaseModal.purchase.subtotal ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {editCartTotal > editPurchaseModal.purchase.subtotal 
                        ? `+₵${(editCartTotal - editPurchaseModal.purchase.subtotal).toLocaleString()} increase`
                        : `-₵${(editPurchaseModal.purchase.subtotal - editCartTotal).toLocaleString()} decrease`
                      }
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">Interest will be recalculated based on the new subtotal</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditPurchaseModal({ open: false, customer: null, purchase: null, products: [], loading: false })
                      setEditCart([])
                    }}
                    className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePurchase}
                    disabled={isUpdatingPurchase || editCart.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isUpdatingPurchase ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>Update Purchase</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
