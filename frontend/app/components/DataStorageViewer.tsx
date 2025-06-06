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
        description: 'API ID, API Hash, and Phone Number',
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
        }, Phone: ${
          config.phoneNumber
            ? config.phoneNumber.slice(0, 3) +
              '***' +
              config.phoneNumber.slice(-4)
            : 'Not set'
        }`;
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
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-telegram-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Local Storage Overview
          </h3>
        </div>
        <button
          onClick={loadStorageData}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        This shows exactly what data is stored in your browser. All data stays
        on your device unless explicitly sent to the server.
      </p>

      <div className="space-y-3">
        {storageItems.map((item) => (
          <div
            key={item.key}
            className={`border rounded-lg p-4 ${
              item.hasData
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{item.size}</span>
                {item.hasData && (
                  <>
                    {item.isSensitive && (
                      <button
                        onClick={() => toggleSensitiveView(item.key)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={
                          showSensitive[item.key]
                            ? 'Hide sensitive data'
                            : 'Show sensitive data'
                        }
                      >
                        {showSensitive[item.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => viewData(item.key)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Log full data to console"
                    >
                      <Database className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => clearItem(item.key, item.label)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Clear this data"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {item.hasData && (
              <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-700 font-mono">
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
              <div className="mt-2 text-xs text-gray-500 italic">
                No data stored
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Privacy Note:</strong> This data is stored locally in your
          browser and is never automatically sent to our servers. Only session
          tokens and scheduled messages are sent to our backend when you
          explicitly use those features.
        </p>
      </div>
    </div>
  );
}
