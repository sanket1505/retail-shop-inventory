import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package,
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  Activity, 
  Filter, 
  Sparkles, 
  Loader2, 
  X, 
  Wand2, 
  Mail, 
  Copy, 
  Upload, 
  Image as ImageIcon, 
  Camera, 
  Share2, 
  MessageSquare, 
  Receipt, 
  ShoppingBag, 
  Minus, 
  CheckCircle2, 
  Printer, 
  IndianRupee, 
  Wallet, 
  PieChart, 
  Calendar, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Ruler, 
  Settings, 
  Save, 
  RotateCcw, 
  Moon, 
  Sun,
  FileText 
} from 'lucide-react';
import { fetchRemoteAppState, loadCachedAppState, persistCachedAppState, saveRemoteAppState } from './lib/appData';
import { createDefaultAppState, createDefaultNewItem } from './lib/defaultData';
import { isSupabaseConfigured } from './lib/supabase';

const SYNC_STATUS_STYLES = {
  local: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  loading: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
  saving: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  synced: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-400/20 bg-red-500/10 text-red-300',
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const InventoryApp = () => {
  const initialAppState = useMemo(() => loadCachedAppState(), []);

  const notificationTimeoutRef = useRef(null);

    // --- State Management ---
  const [activeTab, setActiveTab] = useState('inventory');
  const [isDarkMode, setIsDarkMode] = useState(initialAppState.isDarkMode);
  const [isHydrated, setIsHydrated] = useState(!isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'loading' : 'local');
  const [syncError, setSyncError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [storeSettings, setStoreSettings] = useState(initialAppState.storeSettings);
  const [inventory, setInventory] = useState(initialAppState.inventory);
  const [transactions, setTransactions] = useState(initialAppState.transactions);

  useEffect(() => {
    persistCachedAppState({
      isDarkMode,
      storeSettings,
      inventory,
      transactions,
    });
  }, [isDarkMode, storeSettings, inventory, transactions]);

  useEffect(() => {
    setStoreSettings(initialAppState.storeSettings);
    setInventory(initialAppState.inventory);
    setTransactions(initialAppState.transactions);
  }, [initialAppState]);

  // UI States
  const [reportView, setReportView] = useState('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [restockValues, setRestockValues] = useState({});
  const [notification, setNotification] = useState(null);
  
  // Billing States
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  
  // AI Feature States
  const [isMagicFilling, setIsMagicFilling] = useState(false); 
  const [emailDraft, setEmailDraft] = useState(null);
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [socialPost, setSocialPost] = useState(null);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);

  // Form State
  const [newItem, setNewItem] = useState(() => createDefaultNewItem());

  const categories = ['All', 'Cricket', 'Football', 'Tennis', 'Gym', 'Badminton', 'Apparel'];

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isActive = true;

    const hydrateFromSupabase = async () => {
      try {
        const remoteState = await fetchRemoteAppState();
        if (!isActive) {
          return;
        }

        if (remoteState) {
          setIsDarkMode(remoteState.isDarkMode);
          setStoreSettings(remoteState.storeSettings);
          setInventory(remoteState.inventory);
          setTransactions(remoteState.transactions);
          persistCachedAppState(remoteState);
        } else {
          await saveRemoteAppState(initialAppState);
          if (!isActive) {
            return;
          }
        }

        setSyncStatus('synced');
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        console.error('Supabase Load Error', error);
        if (!isActive) {
          return;
        }

        setSyncStatus('error');
        setSyncError('Could not load Supabase data. The app is using local browser data for now.');
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    hydrateFromSupabase();

    return () => {
      isActive = false;
    };
  }, [initialAppState]);

  useEffect(() => {
    if (!isHydrated || !isSupabaseConfigured) {
      if (isHydrated && !isSupabaseConfigured) {
        setSyncStatus('local');
        setSyncError(null);
      }
      return;
    }

    let isCancelled = false;
    const nextAppState = {
      isDarkMode,
      storeSettings,
      inventory,
      transactions,
    };

    const timeoutId = window.setTimeout(async () => {
      try {
        setSyncStatus('saving');
        await saveRemoteAppState(nextAppState);

        if (isCancelled) {
          return;
        }

        setSyncStatus('synced');
        setSyncError(null);
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        console.error('Supabase Save Error', error);
        if (isCancelled) {
          return;
        }

        setSyncStatus('error');
        setSyncError('Supabase Error: ' + (error?.message || error?.details || 'Unknown sync error'));
      }
    }, 500);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [inventory, isDarkMode, isHydrated, storeSettings, transactions]);

  const syncStatusLabel = {
    local: 'Local cache only',
    loading: 'Loading cloud data',
    saving: 'Saving to Supabase',
    synced: 'Synced to Supabase',
    error: 'Sync issue',
  }[syncStatus];

  const syncStatusDescription = syncError
    || (!isSupabaseConfigured
      ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.'
      : syncStatus === 'loading'
        ? 'Reading your latest inventory snapshot from Supabase.'
        : syncStatus === 'saving'
          ? 'Recent changes are being uploaded in the background.'
          : lastSyncedAt
            ? `Last successful sync: ${new Date(lastSyncedAt).toLocaleString()}`
            : 'Cloud sync is ready.');

  // --- Dynamic Financial Calculations ---
  
  // Daily Income (Today)
  const currentDayRevenue = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString(); 
    
    return transactions.reduce((total, t) => {
      const tDate = new Date(t.date);
      if (t.type === 'SALE' && tDate.toLocaleDateString() === todayStr) {
        return total + t.amount;
      }
      return total;
    }, 0);
  }, [transactions]);

  // Daily Profit (Today)
  const currentDayProfit = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString(); 
    
    return transactions.reduce((total, t) => {
      const tDate = new Date(t.date);
      if (t.type === 'SALE' && tDate.toLocaleDateString() === todayStr) {
        return total + (t.profit || 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  // Monthly Income
  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions.reduce((total, t) => {
      const tDate = new Date(t.date);
      if (t.type === 'SALE' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        return total + t.amount;
      }
      return total;
    }, 0);
  }, [transactions]);

   // Monthly Profit
   const currentMonthProfit = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions.reduce((total, t) => {
      const tDate = new Date(t.date);
      if (t.type === 'SALE' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        return total + (t.profit || 0);
      }
      return total;
    }, 0);
  }, [transactions]);

  // --- Gemini API Handler ---
  const callGemini = async (prompt, isJson = false, imageBase64 = null) => {
    const apiKey = ""; 
    try {
      const parts = [{ text: prompt }];
      if (imageBase64) {
        const cleanBase64 = imageBase64.split(',')[1];
        parts.push({ inline_data: { mime_type: "image/jpeg", data: cleanBase64 } });
      }
      const payload = { contents: [{ parts: parts }] };
      if (isJson) payload.generationConfig = { responseMimeType: "application/json" };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      console.error("Gemini API Error:", error);
      showNotification("Failed to connect to AI service", "danger");
      return null;
    }
  };

  // --- AI Features ---
  const magicFillProduct = async () => {
    if (!newItem.name || newItem.name.length < 3) { showNotification("Please enter a product name first", "neutral"); return; }
    setIsMagicFilling(true);
    const prompt = `You are a sports inventory assistant. Based on the product name "${newItem.name}", generate a JSON object with: category, brand, price (selling), costPrice (approx 70% of selling), size (e.g. L, 5, SH), description.`;
    const result = await callGemini(prompt, true);
    if (result) {
      try {
        const data = JSON.parse(result);
        setNewItem(prev => ({ ...prev, ...data, stock: prev.stock })); 
        showNotification("Auto-filled details using Gemini!", "success");
      } catch (e) { showNotification("Could not parse AI response", "danger"); }
    }
    setIsMagicFilling(false);
  };

  const scanImageWithGemini = async () => {
    if (!newItem.image) { showNotification("Please upload an image first", "neutral"); return; }
    setIsMagicFilling(true);
    const prompt = `Analyze this sports equipment/apparel image. Return JSON: { name, category, brand, price (selling), costPrice (approx 70% of selling), size (estimate), description }.`;
    const result = await callGemini(prompt, true, newItem.image);
    if (result) {
      try {
        const data = JSON.parse(result);
        setNewItem(prev => ({ ...prev, ...data, stock: prev.stock }));
        showNotification("Image analyzed successfully!", "success");
      } catch (e) { showNotification("Could not understand the image", "danger"); }
    }
    setIsMagicFilling(false);
  };

  const generateRestockEmail = async (item) => {
    setIsDraftingEmail(true);
    setEmailDraft({ loading: true, title: `Restock: ${item.name}` });
    const prompt = `Write a restock email for: ${item.name} (${item.brand}) Size: ${item.size}. Stock: ${item.stock}.`;
    const result = await callGemini(prompt);
    if (result) setEmailDraft({ loading: false, content: result, title: `Draft for: ${item.name}` });
    else setEmailDraft(null);
    setIsDraftingEmail(false);
  };

  const generateSocialPost = async (item) => {
    setIsGeneratingPost(true);
    setSocialPost({ loading: true, title: `Promo: ${item.name}` });
    const prompt = `Write an Instagram caption for: ${item.name} by ${item.brand} (Size: ${item.size}), ${storeSettings.currency}${item.price}.`;
    const result = await callGemini(prompt);
    if (result) setSocialPost({ loading: false, content: result, title: `Promo for: ${item.name}` });
    else setSocialPost(null);
    setIsGeneratingPost(false);
  };

  // --- Settings Handler ---
  const handleSaveSettings = (e) => {
    e.preventDefault();
    showNotification(
      isSupabaseConfigured
        ? "Settings saved. Supabase sync is running in the background."
        : "Settings saved locally. Add Supabase keys to sync across devices.",
      "success",
    );
  };

  const handleResetData = () => {
    if(window.confirm("Are you sure? This will clear all sales history and reset inventory to demo data.")) {
      setTransactions([]);
      setInventory(inventory.map(i => ({...i, stock: 10}))); 
      showNotification("System reset to demo state.", "neutral");
    }
  };

  // --- Report Download Logic ---
  const handleDownloadReport = () => {
    const headers = ['Transaction ID,Date,Type,Description,Amount,Profit'];
    const csvRows = transactions.map(t => {
      const cleanDesc = t.description.replace(/,/g, ' '); 
      return `${t.id},${new Date(t.date).toLocaleDateString()},${t.type},"${cleanDesc}",${t.amount},${t.profit || 0}`;
    });
    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Sales report downloaded successfully!");
  };

  // --- Billing Logic ---
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        showNotification(`Only ${product.stock} units available!`, 'danger');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      if (product.stock === 0) {
        showNotification("Out of stock!", "danger");
        return;
      }
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (productId, change) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + change;
        const productInStock = inventory.find(p => p.id === productId);
        if (newQty > productInStock.stock) {
           showNotification(`Max stock reached`, 'danger');
           return item;
        }
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
  };

  const calculateTotalProfit = () => {
    return cart.reduce((total, item) => {
       // Profit = (Selling Price - Cost Price) * Qty
       // If cost price is missing, fallback to 0 profit to be safe, or estimate 
       const cost = item.costPrice || (item.price * 0.7); 
       return total + ((item.price - cost) * item.qty);
    }, 0);
  };

  const calculateTax = (subtotal) => {
    const rate = storeSettings.taxRate || 0;
    return (subtotal * rate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    return subtotal + tax;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const finalTotal = calculateTotal();
    const totalProfit = calculateTotalProfit(); // Calculate profit for this sale

    const newInventory = inventory.map(product => {
      const cartItem = cart.find(c => c.id === product.id);
      if (cartItem) {
        return { ...product, stock: product.stock - cartItem.qty };
      }
      return product;
    });

    const newTransaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'SALE',
      amount: finalTotal,
      profit: totalProfit, // Store profit
      description: `Sale: ${cart.length} items (POS)`
    };
    setTransactions(prev => [newTransaction, ...prev]);

    setInventory(newInventory);
    
    setLastOrder({
      id: Math.floor(Math.random() * 100000),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      items: [...cart],
      subtotal: calculateSubtotal(),
      tax: calculateTax(calculateSubtotal()),
      total: finalTotal
    });
    
    setCart([]);
    setShowReceipt(true);
    showNotification("Sale completed! Income recorded.", "success");
  };

  // --- General Handlers ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewItem(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateStock = (id, change) => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newStock = item.stock + change;
        if (newStock < 0) return item; 
        
        if (change > 0) {
           showNotification(`Restocked ${item.name}`, 'success');
        } else {
           showNotification(`Sold 1 unit of ${item.name}`, 'neutral');
           const revenue = item.price * Math.abs(change);
           const cost = (item.costPrice || (item.price * 0.7)) * Math.abs(change);
           const profit = revenue - cost;

           setTransactions(t => [{
            id: Date.now(),
            date: new Date().toISOString(),
            type: 'SALE',
            amount: revenue,
            profit: profit,
            description: `Manual Sale: ${item.name}`
          }, ...t]);
        }
        return { ...item, stock: newStock };
      }
      return item;
    }));
  };

  const handleDelete = (id) => {
    setInventory(prev => prev.filter(item => item.id !== id));
    showNotification('Item removed from inventory', 'danger');
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    
    if (!newItem.name || !newItem.price) {
      showNotification("Please enter at least a Name and Price.", "danger");
      return;
    }
    
    const stock = Number(newItem.stock) || 0; 
    const minLevel = storeSettings.defaultMinStock || 5;
    const cost = Number(newItem.costPrice) || 0;
    
    const itemToAdd = { 
      id: Date.now(), 
      ...newItem, 
      price: Number(newItem.price), 
      costPrice: cost,
      size: newItem.size,
      stock: stock, 
      minLevel: minLevel, 
      description: newItem.description || 'No description added.' 
    };

    setInventory([...inventory, itemToAdd]);
    setShowAddForm(false);
    setNewItem(createDefaultNewItem());
    showNotification('New product added!');
  };

  // --- Reports Logic ---
  const chartData = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      if (t.type !== 'SALE') return;
      const tDate = new Date(t.date);
      let key;
      let sortTime = tDate.getTime();
      
      if (reportView === 'daily') {
        key = tDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (reportView === 'monthly') {
        key = tDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        sortTime = new Date(tDate.getFullYear(), tDate.getMonth(), 1).getTime();
      } else {
        key = tDate.getFullYear().toString();
        sortTime = new Date(tDate.getFullYear(), 0, 1).getTime();
      }

      if (!grouped[key]) grouped[key] = { revenue: 0, profit: 0, count: 0, sortTime };
      grouped[key].revenue += t.amount;
      grouped[key].profit += (t.profit || 0);
      grouped[key].count += 1;
    });

    return Object.entries(grouped).map(([label, data]) => ({ label, ...data })).sort((a, b) => a.sortTime - b.sortTime);
  }, [transactions, reportView]);

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 10000;
    const maxRev = Math.max(...chartData.map(d => d.revenue));
    return maxRev > 0 ? maxRev : 10000;
  }, [chartData]);

  // --- Derived Statistics ---
  const totalItems = inventory.reduce((acc, item) => acc + item.stock, 0);
  const totalValue = inventory.reduce((acc, item) => acc + (item.price * item.stock), 0);
  const lowStockItems = inventory.filter(item => item.stock <= item.minLevel);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className={`min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} ${showReceipt ? 'receipt-mode-active' : ''}`}>
      
        <style>{`
          @media print {
            aside, button, .action-bar, .stats-cards, .no-print { display: none !important; }
            .min-h-screen { display: block; height: auto; overflow: visible; background: white; }
            main { margin: 0; padding: 0; overflow: visible; }
            .receipt-mode-active main { display: none !important; }
            .receipt-mode-active .printable-receipt { 
              display: block !important; 
              position: absolute; 
              top: 0; 
              left: 0; 
              width: 100%; 
              height: auto;
              z-index: 9999;
              padding: 0;
              margin: 0;
            }
            canvas, .bg-white { box-shadow: none !important; border: none !important; }
          }
        `}</style>

        {notification && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all z-50 no-print ${
            notification.type === 'danger' ? 'bg-red-500' : notification.type === 'neutral' ? 'bg-blue-600' : 'bg-emerald-500'
          }`}>
            {notification.message}
          </div>
        )}

        {showReceipt && lastOrder && (
          <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
              <div className="flex flex-col w-full max-w-md overflow-hidden bg-white shadow-2xl dark:bg-slate-800 rounded-2xl">
                <div className="flex items-center justify-between p-6 text-white bg-slate-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-400" />
                    <h2 className="text-xl font-bold">Sale Completed</h2>
                  </div>
                  <button onClick={() => setShowReceipt(false)} className="p-2 rounded-full hover:bg-white/20">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-8 border-b border-dashed bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                  <div className="mb-6 text-center">
                    <h3 className="mb-1 text-2xl font-bold text-slate-800 dark:text-white">{storeSettings.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Receipt #{lastOrder.id}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{lastOrder.date}</p>
                  </div>
                  <div className="mb-6 space-y-3">
                    {lastOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-300">{item.name} <span className="font-mono text-xs text-slate-400">{item.size && `(${item.size})`}</span> <span className="text-slate-400">x{item.qty}</span></span>
                        <span className="font-medium text-slate-800 dark:text-white">{storeSettings.currency}{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 space-y-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>{storeSettings.currency}{lastOrder.subtotal.toLocaleString()}</span>
                    </div>
                    {storeSettings.taxRate > 0 && (
                      <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>Tax ({storeSettings.taxRate}%)</span>
                        <span>{storeSettings.currency}{lastOrder.tax.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 text-lg font-bold text-slate-800 dark:text-white">
                      <span>Total Paid</span>
                      <span className="text-blue-600 dark:text-blue-400">{storeSettings.currency}{lastOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center p-4 bg-white dark:bg-slate-800">
                   <button onClick={() => window.print()} className="flex items-center gap-2 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                     <Printer size={16} /> Print Receipt
                   </button>
                </div>
              </div>
            </div>

            <div className="printable-receipt hidden bg-white p-8 max-w-[80mm] mx-auto text-black font-mono text-sm leading-tight">
               <div className="pb-4 mb-6 text-center border-b border-black">
                 <h1 className="mb-1 text-2xl font-bold tracking-wider uppercase">{storeSettings.name}</h1>
                 <p className="text-xs">{storeSettings.address}</p>
                 <p className="text-xs">Ph: {storeSettings.phone}</p>
                 {storeSettings.gstin && <p className="mt-1 text-xs font-bold">GSTIN: {storeSettings.gstin}</p>}
               </div>
               
               <div className="flex justify-between mb-4 text-xs">
                 <span>ID: #{lastOrder.id}</span>
                 <span>{lastOrder.date}</span>
               </div>

               <table className="w-full mb-4 text-xs text-left">
                 <thead>
                   <tr className="border-b border-black">
                     <th className="py-1">Item</th>
                     <th className="py-1 text-center">Qty</th>
                     <th className="py-1 text-right">Price</th>
                     <th className="py-1 text-right">Amt</th>
                   </tr>
                 </thead>
                 <tbody>
                   {lastOrder.items.map((item, idx) => (
                     <tr key={idx}>
                       <td className="py-1 max-w-[100px]">
                         <div className="truncate">{item.name}</div>
                         {item.size && <div className="text-[10px] text-gray-600">Size: {item.size}</div>}
                       </td>
                       <td className="py-1 text-center">{item.qty}</td>
                       <td className="py-1 text-right">{item.price}</td>
                       <td className="py-1 text-right">{item.price * item.qty}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>

               <div className="pt-2 mb-6 border-t border-black">
                 <div className="flex justify-between text-xs">
                   <span>Subtotal</span>
                   <span>{storeSettings.currency}{lastOrder.subtotal.toLocaleString()}</span>
                 </div>
                 {storeSettings.taxRate > 0 && (
                   <div className="flex justify-between text-xs">
                     <span>Tax ({storeSettings.taxRate}%)</span>
                     <span>{storeSettings.currency}{lastOrder.tax.toLocaleString()}</span>
                   </div>
                 )}
                 <div className="flex justify-between mt-2 text-base font-bold">
                   <span>TOTAL</span>
                   <span>{storeSettings.currency}{lastOrder.total.toLocaleString()}</span>
                 </div>
               </div>

               <div className="text-xs text-center">
                 <p className="font-bold">Tax Invoice</p>
                 <p>Thank you for shopping!</p>
                 <p>No returns without receipt.</p>
               </div>
            </div>
          </>
        )}

        {showLowStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-red-100 bg-red-50 dark:bg-red-900/20 dark:border-red-900/30">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-600 dark:text-red-400" />
                  <h2 className="text-xl font-bold text-red-900 dark:text-red-200">Low Stock Alerts</h2>
                </div>
                <button onClick={() => setShowLowStockModal(false)} className="p-2 text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 dark:text-red-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4 overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
                    <p>All stock levels are healthy!</p>
                  </div>
                ) : (
                  lowStockItems.map(item => (
                    <div key={item.id} className="flex flex-col gap-4 p-4 bg-white border border-red-100 shadow-sm sm:flex-row sm:items-center dark:bg-slate-900 dark:border-red-900/30 rounded-xl">
                      <div className="flex-shrink-0 w-16 h-16 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                         {item.image ? <img src={item.image} className="object-cover w-full h-full" /> : <Package className="w-8 h-8 m-auto mt-4 text-slate-300" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-white">{item.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.size ? `Size: ${item.size}` : ''}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="font-medium text-red-600 dark:text-red-400">Stock: {item.stock}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500 dark:text-slate-400">Min: {item.minLevel}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 items-end min-w-[180px]">
                         <div className="flex items-center justify-end w-full gap-2">
                           <input type="number" className="w-20 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" placeholder="Qty" value={restockValues[item.id] || ''} onChange={(e) => setRestockValues({...restockValues, [item.id]: e.target.value})} />
                           <button onClick={() => { const qty = parseInt(restockValues[item.id] || 0); if(qty > 0) { handleUpdateStock(item.id, qty); setRestockValues({...restockValues, [item.id]: ''}); } }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"> + Add </button>
                         </div>
                         <button onClick={() => generateRestockEmail(item)} className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 rounded dark:text-blue-300 hover:text-blue-800 bg-blue-50 dark:bg-blue-900/30"> <Mail size={12} /> Draft Supplier Email </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {(emailDraft || socialPost) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print">
             <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className={`p-6 flex justify-between items-center text-white ${socialPost ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-slate-800'}`}>
                  <div className="flex items-center gap-3">{socialPost ? <Share2 size={24} /> : <Mail size={24} />}<h2 className="text-xl font-bold">{socialPost ? socialPost.title : emailDraft.title}</h2></div>
                  <button onClick={() => { setEmailDraft(null); setSocialPost(null); }} className="p-2 rounded-full hover:bg-white/20"><X size={20} /></button>
               </div>
               <div className="p-6 overflow-y-auto">
                  {(emailDraft?.loading || socialPost?.loading) ? <div className="py-12 text-center"><Loader2 size={40} className="mx-auto text-blue-600 animate-spin" /></div> : <div className="space-y-4"><div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"><p className="font-mono text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{socialPost ? socialPost.content : emailDraft.content}</p></div><div className="flex justify-end"><button onClick={() => { navigator.clipboard.writeText(socialPost ? socialPost.content : emailDraft.content); showNotification("Copied!"); if(socialPost) setSocialPost(null); else setEmailDraft(null); }} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Copy size={16} /> Copy Text</button></div></div>}
               </div>
             </div>
          </div>
        )}

        <div className="flex flex-col min-h-screen md:flex-row">
          <aside className="z-10 flex flex-col w-full p-6 shadow-xl md:w-64 bg-slate-900 text-slate-300 no-print">
            <div className="flex items-center gap-3 mb-10 text-white">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50"><Activity size={24} /></div>
              <h1 className="text-xl font-bold tracking-tight">{storeSettings.name}</h1>
            </div>
            <nav className="flex-1 space-y-2">
              <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800'}`}>
                <Package size={20} /><span>Inventory</span>
              </button>
              <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'billing' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'hover:bg-slate-800'}`}>
                <Receipt size={20} /><span>Billing / POS</span>
              </button>
              <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' : 'hover:bg-slate-800'}`}>
                <BarChart3 size={20} /><span>Sales Reports</span>
              </button>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800'}`}>
                  <Settings size={20} /><span>Settings</span>
                </button>
              </div>
            </nav>
            <div className="pt-6 mt-auto space-y-4 border-t border-slate-800">
              <div className="p-3 border rounded-xl border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Cloud Sync</span>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${SYNC_STATUS_STYLES[syncStatus]}`}>
                    {syncStatusLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{syncStatusDescription}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Theme</span>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)} 
                  className="p-2 transition-colors rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Toggle Dark Mode"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>
          </aside>

          <main className="flex-1 p-4 overflow-y-auto md:p-8 bg-slate-50 dark:bg-slate-950">
            
            {activeTab === 'inventory' && (
              <>
                <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 stats-cards">
                   <div className="p-6 text-white bg-indigo-600 shadow-lg rounded-xl shadow-indigo-200 dark:shadow-none">
                     <div className="flex items-start justify-between mb-2">
                       <div><p className="text-sm font-medium text-indigo-200">Daily Income (Today)</p><h3 className="text-2xl font-bold">{storeSettings.currency}{currentDayRevenue.toLocaleString()}</h3></div>
                       <div className="p-2 rounded-lg bg-white/20"><Wallet size={20} /></div>
                     </div>
                     <div className="flex items-center justify-between mt-2">
                       <p className="text-xs text-indigo-200">Resets automatically every day</p>
                       <p className="text-xs font-bold text-indigo-200">Profit: {storeSettings.currency}{currentDayProfit.toLocaleString()}</p>
                     </div>
                   </div>
                   <div className="p-6 text-white shadow-lg bg-emerald-600 rounded-xl shadow-emerald-200 dark:shadow-none">
                     <div className="flex items-start justify-between mb-2">
                       <div><p className="text-sm font-medium text-emerald-200">Total Income (This Month)</p><h3 className="text-2xl font-bold">{storeSettings.currency}{currentMonthRevenue.toLocaleString()}</h3></div>
                       <div className="p-2 rounded-lg bg-white/20"><IndianRupee size={20} /></div>
                     </div>
                     <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-emerald-200">Resets automatically at start of month</p>
                        <p className="text-xs font-bold text-emerald-200">Profit: {storeSettings.currency}{currentMonthProfit.toLocaleString()}</p>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3 stats-cards">
                  <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                    <div className="flex items-start justify-between mb-4">
                      <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inventory Value</p><h3 className="text-2xl font-bold text-slate-800 dark:text-white">{storeSettings.currency}{totalValue.toLocaleString()}</h3></div>
                      <div className="p-2 text-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"><Activity size={20} /></div>
                    </div>
                    <p className="text-xs text-slate-400">Current stock value</p>
                  </div>
                  
                  <div onClick={() => setShowLowStockModal(true)} className="p-6 transition-all bg-white border shadow-sm cursor-pointer dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 hover:shadow-md group">
                    <div className="flex items-start justify-between mb-4">
                      <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock Alerts</p><h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{lowStockItems.length} Items</h3></div>
                      <div className="p-2 text-red-600 transition-colors rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/40"><AlertTriangle size={20} /></div>
                    </div>
                    <p className="text-xs font-medium transition-colors text-slate-400 group-hover:text-red-500">Click to view & restock items</p>
                  </div>
                  
                  <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                    <div className="flex items-start justify-between mb-4">
                       <div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Category</p><h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Cricket</h3></div>
                       <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"><TrendingUp size={20} /></div>
                    </div>
                    <p className="text-xs text-slate-400">Highest sales volume</p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 mb-6 md:flex-row action-bar">
                  <div className="flex items-center w-full gap-4 md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Search products..." className="w-full py-2 pl-10 pr-4 border rounded-lg shadow-sm border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="relative">
                      <Filter className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
                      <select className="py-2 pl-10 pr-8 bg-white border rounded-lg shadow-sm appearance-none cursor-pointer border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => setShowAddForm(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all font-medium shadow-md shadow-blue-200 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5"><Plus size={18} /> Add Product</button>
                </div>

                {showAddForm && (
                  <div className="p-6 mb-6 duration-300 bg-white border border-blue-100 shadow-lg dark:bg-slate-800 rounded-xl dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Add New Stock</h3>
                      <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                    </div>
                    <form onSubmit={handleAddItem} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Product Name</label>
                          <div className="flex gap-2">
                             <input placeholder="e.g. Pro Running Shoes" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                             <button type="button" onClick={magicFillProduct} disabled={isMagicFilling || !newItem.name} className="px-3 transition-colors rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 disabled:opacity-50">{isMagicFilling ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18} />}</button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Category</label>
                          <select className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-1"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Brand</label><input placeholder="e.g. Nike" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value})} /></div>
                        
                        <div className="space-y-1"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Selling Price</label><input type="number" placeholder="MRP" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Buying Price</label><input type="number" placeholder="Cost" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800" value={newItem.costPrice} onChange={e => setNewItem({...newItem, costPrice: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Stock Qty</label><input type="number" placeholder="0" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} required /></div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Size / Variant</label><input placeholder="e.g. L, 5, Full Size" className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.size} onChange={e => setNewItem({...newItem, size: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-1 md:col-span-2"><label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Description</label><textarea placeholder="Enter product description..." className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none text-sm" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
                        <div className="space-y-1">
                          <label className="flex justify-between text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Product Image {newItem.image && (<button type="button" onClick={scanImageWithGemini} disabled={isMagicFilling} className="flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-700 text-[10px]">{isMagicFilling ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} Scan with AI</button>)}</label>
                          <div className="relative flex flex-col items-center justify-center h-32 overflow-hidden transition-colors border-2 border-dashed rounded-lg cursor-pointer border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 group">
                             <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
                             {newItem.image ? (<><img src={newItem.image} alt="Preview" className="object-cover w-full h-full" /><div className="absolute inset-0 z-0 flex flex-col items-center justify-center transition-opacity opacity-0 bg-black/50 group-hover:opacity-100"><span className="mb-1 text-xs font-medium text-white">Change Image</span><span className="text-violet-200 text-[10px]">AI Scan Ready</span></div></>) : (<div className="p-2 text-center"><Upload className="w-8 h-8 mx-auto mb-1 text-slate-300" /><span className="text-xs">Click to upload</span></div>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 font-medium transition-colors rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                        <button type="submit" className="px-6 py-2 font-medium text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Save Product</button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Inventory Table */}
                <div className="overflow-hidden bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="text-xs font-bold uppercase border-b bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                        <tr><th className="px-6 py-4">Status</th><th className="px-6 py-4">Product Details</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Price</th><th className="px-6 py-4 text-center">Stock Level</th><th className="px-6 py-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInventory.map((item) => {
                          const isLowStock = item.stock <= item.minLevel;
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                              <td className="px-6 py-4 align-top">{isLowStock ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"><AlertTriangle size={12} /> Low</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">In Stock</span>}</td>
                              <td className="px-6 py-4 align-top">
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 overflow-hidden border rounded-lg bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{item.image ? <img src={item.image} alt={item.name} className="object-cover w-full h-full" /> : <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />}</div>
                                  <div><p className="font-medium text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-sm text-slate-500 dark:text-slate-400">{item.brand}</p>{item.size && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700 mt-1 inline-block">{item.size}</span>} {item.description && <p className="max-w-xs mt-1 text-xs italic truncate text-slate-400 dark:text-slate-500">{item.description}</p>}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm align-top text-slate-500 dark:text-slate-400"><span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{item.category}</span></td>
                              <td className="px-6 py-4 font-medium align-top text-slate-700 dark:text-slate-300">{storeSettings.currency}{item.price.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center align-top">
                                <span className={`font-bold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.stock}</span>
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => generateSocialPost(item)} className="p-2 text-pink-500 transition-colors rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/20">{isGeneratingPost && socialPost?.title.includes(item.name) ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}</button>
                                  {isLowStock && <button onClick={() => generateRestockEmail(item)} className="p-2 text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">{isDraftingEmail && emailDraft?.title.includes(item.name) ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}</button>}
                                  <button onClick={() => handleDelete(item.id)} className="p-2 transition-colors rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={18} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* --- BILLING VIEW --- */}
            {activeTab === 'billing' && (
              <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-6">
                {/* Product Selector (Left) */}
                <div className="flex flex-col overflow-hidden bg-white border shadow-sm lg:w-2/3 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="flex gap-4 p-4 border-b border-slate-200 dark:border-slate-800 action-bar">
                    <div className="relative flex-1">
                      <Search className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Search products for bill..." className="w-full py-2 pl-10 pr-4 border rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="grid flex-1 grid-cols-1 gap-4 p-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
                    {filteredInventory.map(item => (
                      <div key={item.id} className="relative flex flex-col gap-2 p-4 transition-shadow bg-white border rounded-lg border-slate-200 dark:border-slate-800 hover:shadow-md dark:bg-slate-800">
                        <div className="flex items-start justify-between">
                           <div className="flex items-center justify-center w-12 h-12 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-700">{item.image ? <img src={item.image} className="object-cover w-full h-full" /> : <Package className="text-slate-300" />}</div>
                           <div className="text-right">
                             <p className="font-bold text-slate-800 dark:text-white">{storeSettings.currency}{item.price.toLocaleString()}</p>
                             <span className={`text-xs px-2 py-0.5 rounded-full ${item.stock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>{item.stock} left</span>
                           </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.brand}</p>
                            {item.size && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{item.size}</span>}
                          </div>
                        </div>
                        <button onClick={() => addToCart(item)} disabled={item.stock === 0} className="flex items-center justify-center w-full gap-2 py-2 mt-auto text-sm font-medium transition-colors rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                          <Plus size={16} /> Add to Bill
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill Summary (Right) */}
                <div className="flex flex-col h-full bg-white border shadow-sm lg:w-1/3 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white"><ShoppingBag size={20} className="text-emerald-600 dark:text-emerald-400" /> Current Bill</h2>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Cart is empty</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm dark:bg-slate-800 border-slate-100 dark:border-slate-700">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1">{item.name}</p>
                            <p className="text-xs text-slate-400">{storeSettings.currency}{item.price} each {item.size ? `(${item.size})` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <button onClick={() => updateCartQty(item.id, -1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" disabled={item.qty <= 1}><Minus size={14} /></button>
                             <span className="w-6 text-sm font-bold text-center text-slate-800 dark:text-white">{item.qty}</span>
                             <button onClick={() => updateCartQty(item.id, 1)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><Plus size={14} /></button>
                          </div>
                          <div className="text-right min-w-[60px]">
                             <p className="text-sm font-bold text-slate-800 dark:text-white">{storeSettings.currency}{(item.price * item.qty).toLocaleString()}</p>
                             <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 text-[10px] mt-1">Remove</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                     <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                       <span>Subtotal</span>
                       <span>{storeSettings.currency}{calculateSubtotal().toLocaleString()}</span>
                     </div>
                     {storeSettings.taxRate > 0 && (
                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                          <span>Tax ({storeSettings.taxRate}%)</span>
                          <span>{storeSettings.currency}{calculateTax(calculateSubtotal()).toLocaleString()}</span>
                        </div>
                     )}
                     <div className="flex items-center justify-between pt-2 mb-4 border-t border-slate-100 dark:border-slate-700">
                       <span className="text-lg font-bold text-slate-800 dark:text-white">Total</span>
                       <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{storeSettings.currency}{calculateTotal().toLocaleString()}</span>
                     </div>
                     <button onClick={handleCheckout} disabled={cart.length === 0} className="flex items-center justify-center w-full gap-2 py-3 font-bold text-white rounded-lg shadow-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-emerald-200 dark:shadow-none">
                       <CheckCircle2 size={20} /> Complete Sale
                     </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- REPORTS VIEW --- */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                
                {/* Header Controls */}
                <div className="flex flex-col items-center justify-between p-4 bg-white border shadow-sm md:flex-row dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 action-bar">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"><BarChart3 size={24} /></div>
                    <div>
                       <h2 className="text-xl font-bold text-slate-800 dark:text-white">Performance Analytics</h2>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Track your business growth</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    {/* View Toggle */}
                    <div className="flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <button onClick={() => setReportView('daily')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportView === 'daily' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Daily View</button>
                      <button onClick={() => setReportView('monthly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportView === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Monthly View</button>
                      <button onClick={() => setReportView('yearly')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${reportView === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Yearly View</button>
                    </div>
                    
                    {/* Download Options */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleDownloadReport} 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-sm bg-emerald-600 hover:bg-emerald-700"
                        title="Download Raw Data"
                      >
                        <Download size={16} />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>
                      <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg shadow-sm bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600" 
                        title="Print or Save as PDF"
                      >
                        <Printer size={16} />
                        <span className="hidden sm:inline">Print Graph</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vertical Bar Chart Section */}
                <div className="p-6 overflow-x-auto bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                   <h3 className="flex items-center gap-2 mb-6 font-bold capitalize text-slate-700 dark:text-white">
                     <Calendar size={18} /> {reportView === 'daily' ? 'Last 30 Days' : reportView} Income
                   </h3>
                   
                   {chartData.length === 0 ? (
                     <div className="py-12 text-center text-slate-400 dark:text-slate-500">No transaction data available yet.</div>
                   ) : (
                     <div className="h-64 flex items-end justify-between gap-4 pt-10 pb-2 min-w-[600px]">
                       {chartData.map((data, idx) => (
                         <div key={idx} className="relative flex flex-col items-center justify-end w-full h-full gap-2 group">
                            {/* Tooltip */}
                            <div className="absolute z-10 p-2 mb-2 text-xs text-white transition-opacity rounded shadow-lg opacity-0 pointer-events-none bottom-full bg-slate-800 dark:bg-slate-700 group-hover:opacity-100 whitespace-nowrap">
                               <p className="mb-1 font-bold">{data.label}</p>
                               <p className="text-emerald-300">Income: {storeSettings.currency}{data.revenue.toLocaleString()}</p>
                            </div>

                            {/* Bars Container */}
                            <div className="flex items-end justify-center w-full h-full gap-1 px-1">
                               {/* Revenue Bar (Green) */}
                               <div 
                                 className="w-full max-w-[30px] bg-emerald-500 rounded-t-sm transition-all duration-500 hover:bg-emerald-400 min-h-[4px] relative"
                                 style={{ height: `${(data.revenue / maxChartValue) * 100}%` }}
                               ></div>
                            </div>
                            
                            {/* Label */}
                            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium -rotate-45 origin-top-left translate-y-4 sm:rotate-0 sm:translate-y-0 sm:origin-center mt-2 w-full text-center truncate">{data.label}</span>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                {/* Recent Transactions List */}
                <div className="overflow-hidden bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                     <h3 className="font-bold text-slate-700 dark:text-white">Transaction History</h3>
                     <span className="text-xs text-slate-500 dark:text-slate-400">{transactions.length} records</span>
                  </div>
                  <div className="overflow-y-auto max-h-96">
                     <table className="w-full text-sm text-left border-collapse">
                       <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                         <tr>
                           <th className="px-6 py-3 font-semibold">Date</th>
                           <th className="px-6 py-3 font-semibold">Description</th>
                           <th className="px-6 py-3 font-semibold text-right">Amount</th>
                           <th className="px-6 py-3 font-semibold text-right">Profit</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {transactions.map((t) => (
                           <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                             <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                               {new Date(t.date).toLocaleDateString()} <span className="ml-1 text-xs">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </td>
                             <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200">
                               <div className="flex items-center gap-2">
                                 {t.type === 'SALE' ? <ArrowUpRight size={14} className="text-emerald-500" /> : <ArrowDownRight size={14} className="text-red-500" />}
                                 {t.description}
                               </div>
                             </td>
                             <td className={`px-6 py-3 text-right font-bold ${t.type === 'SALE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                               {t.type === 'SALE' ? '+' : '-'}{storeSettings.currency}{t.amount.toLocaleString()}
                             </td>
                             <td className="px-6 py-3 font-medium text-right text-violet-600 dark:text-violet-400">
                               {/* Check if profit exists (it might be 0/undefined for expenses or older records) */}
                               {(t.type === 'SALE' && t.profit !== undefined) ? 
                                 `+${storeSettings.currency}${t.profit.toLocaleString()}` 
                                 : '-'
                               }
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- SETTINGS VIEW --- */}
            {activeTab === 'settings' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Supabase Data Sync</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{syncStatusDescription}</p>
                    </div>
                    <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${syncStatus === 'local'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300'
                      : syncStatus === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
                        : syncStatus === 'saving'
                          ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300'
                          : syncStatus === 'loading'
                            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                    }`}>
                      {syncStatusLabel}
                    </span>
                  </div>
                  <div className="p-4 mt-4 text-sm border rounded-xl border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    <p>Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your local <code>.env</code> file.</p>
                    <p className="mt-2">Run the SQL in <code>supabase/schema.sql</code> once to create the backend table this app uses.</p>
                  </div>
                </div>

                <div className="p-6 bg-white border shadow-sm dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Settings size={24} /></div>
                    <div>
                       <h2 className="text-xl font-bold text-slate-800 dark:text-white">Store Settings</h2>
                       <p className="text-xs text-slate-500 dark:text-slate-400">Manage your store profile and system preferences</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    {/* Store Profile Section */}
                    <div className="space-y-4">
                      <h3 className="pb-2 text-sm font-semibold tracking-wide uppercase border-b text-slate-900 dark:text-white border-slate-100 dark:border-slate-700">Store Profile (For Receipts)</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={storeSettings.name}
                            onChange={e => setStoreSettings({...storeSettings, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={storeSettings.phone}
                            onChange={e => setStoreSettings({...storeSettings, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                          <textarea 
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                            value={storeSettings.address}
                            onChange={e => setStoreSettings({...storeSettings, address: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Taxation Section */}
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 pb-2 text-sm font-semibold tracking-wide uppercase border-b text-slate-900 dark:text-white border-slate-100 dark:border-slate-700">
                        <FileText size={16} /> Taxation & Compliance
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GST Identification Number (GSTIN)</label>
                          <input 
                            type="text" 
                            placeholder="e.g., 27ABCDE1234F1Z5"
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={storeSettings.gstin || ''}
                            onChange={e => setStoreSettings({...storeSettings, gstin: e.target.value.toUpperCase()})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Tax Rate (%)</label>
                          <input 
                            type="number" 
                            placeholder="e.g., 18"
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={storeSettings.taxRate || ''}
                            onChange={e => setStoreSettings({...storeSettings, taxRate: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* System Prefs Section */}
                    <div className="space-y-4">
                      <h3 className="pb-2 text-sm font-semibold tracking-wide uppercase border-b text-slate-900 dark:text-white border-slate-100 dark:border-slate-700">System Preferences</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Low Stock Alert Level</label>
                          <input 
                            type="number" 
                            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={storeSettings.defaultMinStock}
                            onChange={e => setStoreSettings({...storeSettings, defaultMinStock: Number(e.target.value)})}
                          />
                        </div>
                        {/* Theme Setting in Form */}
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme Preference</label>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setIsDarkMode(false)}
                              className={`flex-1 py-2 px-3 rounded-lg border ${!isDarkMode ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                              Light Mode
                            </button>
                            <button 
                              type="button"
                              onClick={() => setIsDarkMode(true)}
                              className={`flex-1 py-2 px-3 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-blue-500 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                              Dark Mode
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                        <Save size={18} />
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>

                {/* Data Management Zone */}
                <div className="p-6 bg-white border border-red-100 shadow-sm dark:bg-slate-900 rounded-xl dark:border-red-900/30">
                  <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                    <AlertTriangle size={20} />
                    <h3 className="font-bold">Danger Zone</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Reset all inventory data, transactions, and metrics to default state.</p>
                    <button 
                      onClick={handleResetData}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 transition-colors border border-red-200 rounded-lg dark:border-red-900/50 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <RotateCcw size={16} />
                      Reset System Data
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default InventoryApp;
