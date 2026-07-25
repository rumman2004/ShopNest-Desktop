import { useState, useEffect } from 'react';
import { subscribeSyncStatus, triggerSync } from '../../services/syncService';
import { useShop } from '../../hooks/useShop';
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SyncBadge() {
  const { shopId } = useShop();
  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    pendingSalesCount: 0,
    syncedSalesCount: 0,
    cachedProductsCount: 0,
    error: null
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = () => {
    triggerSync(shopId);
  };

  const { isOnline, isSyncing, pendingSalesCount, cachedProductsCount } = syncState;

  return (
    <button
      onClick={handleManualSync}
      disabled={isSyncing}
      title={isOnline ? "Click to sync offline sales and inventory" : "Device offline. Sales are queued locally."}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border shadow-2xs cursor-pointer select-none
        ${!isOnline 
          ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' 
          : pendingSalesCount > 0 
            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
        }
      `}
    >
      {/* Icon status */}
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
      ) : !isOnline ? (
        <WifiOff className="w-3.5 h-3.5 text-amber-600" />
      ) : pendingSalesCount > 0 ? (
        <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
      ) : (
        <Wifi className="w-3.5 h-3.5 text-emerald-600" />
      )}

      {/* Label */}
      <span>
        {!isOnline ? (
          <>Offline Mode {pendingSalesCount > 0 && `(${pendingSalesCount} Queued)`}</>
        ) : isSyncing ? (
          <>Syncing...</>
        ) : pendingSalesCount > 0 ? (
          <>{pendingSalesCount} Pending Sync</>
        ) : (
          <>Online ({cachedProductsCount} Cached)</>
        )}
      </span>
    </button>
  );
}
