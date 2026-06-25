import {
  STORAGE_KEYS,
  createDefaultAppState,
  createDefaultStoreSettings,
} from './defaultData';
import { isSupabaseConfigured, supabase } from './supabase';

const STORE_ID = 'main-store';

// --- Local Storage Helpers ---
const getStorageValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.error('Storage Load Error', error);
    return fallback;
  }
};

const setStorageValue = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage Save Error', error);
  }
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// --- Normalizers ---
const normalizeStoreSettings = (settings = {}) => {
  const defaults = createDefaultStoreSettings();
  return {
    ...defaults,
    ...settings,
    defaultMinStock: toNumber(settings.defaultMinStock, defaults.defaultMinStock),
    taxRate: toNumber(settings.taxRate, defaults.taxRate),
    currency: settings.currency || defaults.currency,
  };
};

const normalizeInventoryItem = (item = {}, fallbackMinLevel = 5) => ({
  id: item.id ?? Date.now(),
  name: item.name || '',
  category: item.category || 'Cricket',
  brand: item.brand || '',
  price: toNumber(item.price),
  costPrice: toNumber(item.costPrice ?? item.cost_price),
  size: item.size || '',
  stock: toNumber(item.stock),
  minLevel: toNumber(item.minLevel ?? item.min_level, fallbackMinLevel),
  description: item.description || 'No description added.',
  image: item.image || null,
});

const normalizeTransaction = (transaction = {}) => ({
  id: transaction.id ?? Date.now(),
  date: transaction.date || new Date().toISOString(),
  type: transaction.type || 'SALE',
  amount: toNumber(transaction.amount),
  profit: toNumber(transaction.profit),
  description: transaction.description || 'Sale recorded',
});

export const normalizeAppState = (data = {}) => {
  const defaults = createDefaultAppState();
  const storeSettings = normalizeStoreSettings(
    data.storeSettings ?? data.store_settings ?? defaults.storeSettings,
  );

  return {
    isDarkMode: Boolean(data.isDarkMode ?? data.theme_preference ?? defaults.isDarkMode),
    storeSettings,
    inventory: Array.isArray(data.inventory)
      ? data.inventory.map((item) => normalizeInventoryItem(item, storeSettings.defaultMinStock))
      : defaults.inventory,
    transactions: Array.isArray(data.transactions)
      ? data.transactions.map(normalizeTransaction)
      : defaults.transactions,
  };
};

// --- Local State Management ---
export const loadCachedAppState = () => {
  const defaults = createDefaultAppState();
  return normalizeAppState({
    isDarkMode: getStorageValue(STORAGE_KEYS.theme, defaults.isDarkMode),
    storeSettings: getStorageValue(STORAGE_KEYS.settings, defaults.storeSettings),
    inventory: getStorageValue(STORAGE_KEYS.inventory, defaults.inventory),
    transactions: getStorageValue(STORAGE_KEYS.transactions, defaults.transactions),
  });
};

export const persistCachedAppState = (state) => {
  const normalizedState = normalizeAppState(state);
  setStorageValue(STORAGE_KEYS.theme, normalizedState.isDarkMode);
  setStorageValue(STORAGE_KEYS.settings, normalizedState.storeSettings);
  setStorageValue(STORAGE_KEYS.inventory, normalizedState.inventory);
  setStorageValue(STORAGE_KEYS.transactions, normalizedState.transactions);
};

// --- Supabase Cloud Sync Management (Updated for Multiple Tables) ---

export const fetchRemoteAppState = async () => {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    // Fetch all three tables concurrently
    const [settingsRes, inventoryRes, transactionsRes] = await Promise.all([
      supabase.from('store_settings').select('*').eq('id', STORE_ID).maybeSingle(),
      supabase.from('inventory').select('*').eq('store_id', STORE_ID),
      supabase.from('transactions').select('*').eq('store_id', STORE_ID)
    ]);

    if (settingsRes.error) throw settingsRes.error;
    if (inventoryRes.error) throw inventoryRes.error;
    if (transactionsRes.error) throw transactionsRes.error;

    const dbSettings = settingsRes.data;
    
    // If no settings exist yet, it means no data has ever been synced
    if (!dbSettings) return null;

    return normalizeAppState({
      isDarkMode: dbSettings.theme_preference,
      storeSettings: {
        currency: dbSettings.currency,
        taxRate: dbSettings.tax_rate,
        defaultMinStock: dbSettings.default_min_stock,
      },
      inventory: inventoryRes.data || [],
      transactions: transactionsRes.data || []
    });

  } catch (error) {
    console.error('Supabase Load Error (Multiple Tables)', error);
    throw error;
  }
};

export const saveRemoteAppState = async (state) => {
  if (!isSupabaseConfigured || !supabase) return normalizeAppState(state);

  const normalizedState = normalizeAppState(state);

  try {
    // 1. Save Store Settings
    const settingsPayload = {
      id: STORE_ID,
      theme_preference: normalizedState.isDarkMode,
      currency: normalizedState.storeSettings.currency,
      tax_rate: normalizedState.storeSettings.taxRate,
      default_min_stock: normalizedState.storeSettings.defaultMinStock,
      updated_at: new Date().toISOString()
    };
    
    const { error: settingsErr } = await supabase.from('store_settings').upsert(settingsPayload);
    if (settingsErr) throw settingsErr;

    // 2. Save Inventory (Upsert active items, delete removed ones)
    if (normalizedState.inventory.length > 0) {
      const inventoryPayload = normalizedState.inventory.map(item => ({
        id: item.id,
        store_id: STORE_ID,
        name: item.name,
        category: item.category,
        brand: item.brand,
        price: item.price,
        cost_price: item.costPrice,
        size: item.size,
        stock: item.stock,
        min_level: item.minLevel,
        description: item.description,
        image: item.image,
        updated_at: new Date().toISOString()
      }));

      const { error: invErr } = await supabase.from('inventory').upsert(inventoryPayload);
      if (invErr) throw invErr;

      // Clean up deleted inventory items from the cloud
      const currentIds = normalizedState.inventory.map(i => i.id);
      await supabase.from('inventory').delete()
        .eq('store_id', STORE_ID)
        .not('id', 'in', `(${currentIds.join(',')})`);
    } else {
      // If inventory is totally empty, clear the table for this store
      await supabase.from('inventory').delete().eq('store_id', STORE_ID);
    }

    // 3. Save Transactions
    if (normalizedState.transactions.length > 0) {
      const txPayload = normalizedState.transactions.map(tx => ({
        id: tx.id,
        store_id: STORE_ID,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        profit: tx.profit,
        description: tx.description
      }));

      const { error: txErr } = await supabase.from('transactions').upsert(txPayload);
      if (txErr) throw txErr;
      
      const currentTxIds = normalizedState.transactions.map(t => t.id);
      await supabase.from('transactions').delete()
        .eq('store_id', STORE_ID)
        .not('id', 'in', `(${currentTxIds.join(',')})`);
    } else {
      await supabase.from('transactions').delete().eq('store_id', STORE_ID);
    }

    return normalizedState;

  } catch (error) {
    console.error('Supabase Save Error (Multiple Tables)', error);
    throw error;
  }
};