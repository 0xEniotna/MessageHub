'use client';

import { useState, useEffect } from 'react';
import { Database, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface StorageItem {
  key: string;
  label: string;
  description: string;
  size: string;
  hasData: boolean;
  isSensitive?: boolean;
}

export default function DataStorageViewer() {
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>(
    {}
  );

  const loadStorageData = () => {
    const items: StorageItem[] = [
      {
        key: 'telegram-config',
        label: 'Telegram Configuration',
        description: 'API ID and API Hash (Phone number NOT stored)',
        size: '',
        hasData: false,
        isSensitive: true,
      },
      {
        key: 'telegram_session_token',
        label: 'Session Token',
        description: 'Authentication token for staying logged in',
        size: '',
        hasData: false,
        isSensitive: true,
      },
      {
        key: 'telegram-group-lists',
        label: 'Contact Groups',
        description: 'Your saved contact groups and lists',
        size: '',
        hasData: false,
      },
      {
        key: 'telegram-scheduled-messages',
        label: 'Scheduled Messages',
        description: 'Messages waiting to be sent',
        size: '',
        hasData: false,
      },
    ];

    // Check each storage item
    items.forEach((item) => {
      const data = localStorage.getItem(item.key);
      if (data) {
        item.hasData = true;
        item.size = `${(new Blob([data]).size / 1024).toFixed(1)} KB`;
      } else {
        item.hasData = false;
        item.size = '0 KB';
      }
    });

    setStorageItems(items);
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const clearItem = (key: string, label: string) => {
    if (
      confirm(
        `Are you sure you want to clear "${label}"? This action cannot be undone.`
      )
    ) {
      localStorage.removeItem(key);
      loadStorageData();
      toast.success(`Cleared ${label}`);
    }
  };

  const viewData = (key: string) => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log(`Storage Data for ${key}:`, parsed);
        toast.success('Data logged to console (F12 → Console)');
      } catch {
        console.log(`Raw Storage Data for ${key}:`, data);
        toast.success('Data logged to console (F12 → Console)');
      }
    }
  };

  const toggleSensitiveView = (key: string) => {
    setShowSensitive((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getSensitivePreview = (key: string): string => {
    const data = localStorage.getItem(key);
    if (!data) return 'No data';

    if (key === 'telegram-config') {
      try {
        const config = JSON.parse(data);
        return `API ID: ${
          config.apiId ? '***' + config.apiId.slice(-4) : 'Not set'
        } | API Hash: ${
          config.apiHash ? '***' + config.apiHash.slice(-8) : 'Not set'
        } | Phone: NOT STORED (privacy protection)`;
      } catch {
        return 'Invalid data format';
      }
    }

    if (key === 'telegram_session_token') {
      return `Token: ${data.slice(0, 8)}...${data.slice(-8)} (${
        data.length
      } chars)`;
    }

    return data.slice(0, 50) + (data.length > 50 ? '...' : '');
  };

  const getNonSensitivePreview = (key: string): string => {
    const data = localStorage.getItem(key);
    if (!data) return 'No data';

    if (key === 'telegram-group-lists') {
      try {
        const lists = JSON.parse(data);
        if (Array.isArray(lists)) {
          return `${lists.length} group list(s): ${lists
            .map((l) => l.name)
            .join(', ')}`;
        }
      } catch {
        return 'Invalid data format';
      }
    }

    if (key === 'telegram-scheduled-messages') {
      try {
        const messages = JSON.parse(data);
        if (Array.isArray(messages)) {
          return `${messages.length} scheduled message(s)`;
        }
      } catch {
        return 'Invalid data format';
      }
    }

    return data.slice(0, 100) + (data.length > 100 ? '...' : '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div
            className="p-2"
            style={{
              background: 'linear-gradient(45deg, #ff99ff, #99ff99)',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px #333',
            }}
          >
            <Database className="h-6 w-6 text-black" />
          </div>
          <h3
            className="text-lg font-bold"
            style={{
              fontFamily: 'Impact, Arial Black, sans-serif',
              color: '#000080',
              textShadow: '2px 2px 0px #fff',
            }}
          >
            💾 LOCAL STORAGE OVERVIEW 💾
          </h3>
        </div>
        <button
          onClick={loadStorageData}
          className="px-3 py-2 text-black text-sm flex items-center space-x-2 font-bold"
          style={{
            background: 'linear-gradient(45deg, #ff6b6b, #ffd93d)',
            border: '2px solid #000',
            boxShadow: '2px 2px 0px #333',
            fontFamily: 'Courier New, monospace',
            textTransform: 'uppercase',
            transition: 'all 0.1s',
          }}
        >
          <RefreshCw className="h-4 w-4" />
          <span>🔄 REFRESH</span>
        </button>
      </div>

      <p
        className="text-sm mb-4 font-bold text-center"
        style={{
          fontFamily: 'Comic Sans MS, cursive',
          color: '#800080',
        }}
      >
        🔍 This shows exactly what data is stored in your browser. All data
        stays on your device unless explicitly sent to the server! 🔍
      </p>

      <div className="space-y-3">
        {storageItems.map((item) => (
          <div
            key={item.key}
            className="p-4"
            style={{
              border: '3px solid #000',
              boxShadow: '3px 3px 0px #666',
              background: item.hasData
                ? 'linear-gradient(135deg, #ccffcc, #ccffff)'
                : 'linear-gradient(135deg, #ffcccc, #ffffcc)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4
                  className="font-bold"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  {item.label}
                </h4>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: 'Verdana, sans-serif',
                    color: '#800000',
                  }}
                >
                  {item.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className="text-sm font-bold"
                  style={{
                    fontFamily: 'Courier New, monospace',
                    color: '#000080',
                  }}
                >
                  {item.size}
                </span>
                {item.hasData && (
                  <>
                    {item.isSensitive && (
                      <button
                        onClick={() => toggleSensitiveView(item.key)}
                        className="p-1 font-bold"
                        style={{
                          background:
                            'linear-gradient(45deg, #ffff99, #99ffff)',
                          border: '2px solid #000',
                          boxShadow: '1px 1px 0px #333',
                        }}
                        title={
                          showSensitive[item.key]
                            ? 'Hide sensitive data'
                            : 'Show sensitive data'
                        }
                      >
                        {showSensitive[item.key] ? (
                          <EyeOff className="h-4 w-4 text-black" />
                        ) : (
                          <Eye className="h-4 w-4 text-black" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => viewData(item.key)}
                      className="p-1 font-bold"
                      style={{
                        background: 'linear-gradient(45deg, #99ccff, #ccccff)',
                        border: '2px solid #000',
                        boxShadow: '1px 1px 0px #333',
                      }}
                      title="Log full data to console"
                    >
                      <Database className="h-4 w-4 text-black" />
                    </button>
                    <button
                      onClick={() => clearItem(item.key, item.label)}
                      className="p-1 font-bold"
                      style={{
                        background: 'linear-gradient(45deg, #ff9999, #ffcccc)',
                        border: '2px solid #000',
                        boxShadow: '1px 1px 0px #333',
                      }}
                      title="Clear this data"
                    >
                      <Trash2 className="h-4 w-4 text-black" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {item.hasData && (
              <div
                className="mt-2 p-2 text-xs font-bold"
                style={{
                  background: '#ffff99',
                  border: '2px solid #000',
                  fontFamily: 'Courier New, monospace',
                  color: '#000080',
                }}
              >
                {item.isSensitive
                  ? showSensitive[item.key]
                    ? localStorage.getItem(item.key)?.slice(0, 200) +
                      (localStorage.getItem(item.key)!.length > 200
                        ? '...'
                        : '')
                    : getSensitivePreview(item.key)
                  : getNonSensitivePreview(item.key)}
              </div>
            )}

            {!item.hasData && (
              <div
                className="mt-2 text-xs font-bold italic text-center"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#666666',
                }}
              >
                📭 No data stored
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="mt-6 p-3"
        style={{
          background: 'linear-gradient(45deg, #e6f3ff, #ffe6f3)',
          border: '3px solid #000',
          boxShadow: '3px 3px 0px #666',
        }}
      >
        <p
          className="text-sm font-bold"
          style={{
            fontFamily: 'Comic Sans MS, cursive',
            color: '#000080',
          }}
        >
          🔒 <strong>Privacy Note:</strong> This data is stored locally in your
          browser and is never automatically sent to our servers.{' '}
          <strong>Your phone number is NEVER stored permanently</strong> - it's
          only used during authentication and immediately discarded. Only API
          credentials, session tokens and scheduled messages are stored as
          needed! 🔒
        </p>
      </div>
    </div>
  );
}
