'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Download, Upload, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';
import PrivacyNotice from './PrivacyNotice';
import DataStorageViewer from './DataStorageViewer';

interface TelegramConfig {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
}

export default function SettingsPanel() {
  const [config, setConfig] = useState<TelegramConfig>({
    apiId: '',
    apiHash: '',
    phoneNumber: '',
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresCode, setRequiresCode] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('telegram-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }

    // Check current auth status and auto-connect if token exists
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('telegram-auth-token');
      if (token) {
        // If we have a token, check if it's still valid
        const status = await apiClient.checkAuthStatus();
        setIsConnected(status.connected);

        if (status.connected) {
          toast.success('Auto-connected to Telegram!', { duration: 2000 });
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('telegram-auth-token');
          apiClient.clearSession();
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.warn('Auth status check failed:', error);
      setIsConnected(false);
      // Clear invalid token
      localStorage.removeItem('telegram-auth-token');
      apiClient.clearSession();
    }
  };

  const saveConfig = () => {
    if (!config.apiId || !config.apiHash || !config.phoneNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    localStorage.setItem('telegram-config', JSON.stringify(config));
    toast.success('Configuration saved!');
  };

  const testConnection = async () => {
    if (!config.apiId || !config.apiHash || !config.phoneNumber) {
      toast.error('Please configure your Telegram credentials first');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.login({
        api_id: config.apiId,
        api_hash: config.apiHash,
        phone_number: config.phoneNumber,
      });

      if (result.success) {
        setIsConnected(true);
        toast.success('Successfully connected to Telegram!');

        // Refresh auth status to ensure frontend state is correct
        await checkAuthStatus();
      } else if (result.requires_code) {
        setRequiresCode(true);
        toast.success('Verification code sent to your phone');
      } else {
        toast.error(result.message || 'Failed to connect');
      }
    } catch (error) {
      toast.error(`Connection failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.verifyCode({
        phone_number: config.phoneNumber,
        code: verificationCode,
        password: requiresPassword ? password : undefined,
      });

      if (result.success) {
        setIsConnected(true);
        setRequiresCode(false);
        setRequiresPassword(false);
        setVerificationCode('');
        setPassword('');
        toast.success('Successfully authenticated!');

        // Refresh auth status to ensure frontend state is correct
        await checkAuthStatus();
      } else if (result.requires_password) {
        setRequiresPassword(true);
        toast.success('Two-factor authentication required');
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      toast.error(`Verification failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.clearSession();
    setIsConnected(false);
    setRequiresCode(false);
    setRequiresPassword(false);
    setVerificationCode('');
    setPassword('');
    toast.success('Logged out successfully');
  };

  const exportData = () => {
    const groupLists = localStorage.getItem('telegram-group-lists');
    const scheduledMessages = localStorage.getItem(
      'telegram-scheduled-messages'
    );

    const exportData = {
      groupLists: groupLists ? JSON.parse(groupLists) : [],
      scheduledMessages: scheduledMessages ? JSON.parse(scheduledMessages) : [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telegram-sender-backup-${
      new Date().toISOString().split('T')[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully!');
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        if (importedData.groupLists) {
          localStorage.setItem(
            'telegram-group-lists',
            JSON.stringify(importedData.groupLists)
          );
        }

        if (importedData.scheduledMessages) {
          localStorage.setItem(
            'telegram-scheduled-messages',
            JSON.stringify(importedData.scheduledMessages)
          );
        }

        toast.success('Data imported successfully! Please refresh the page.');
      } catch (error) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (
      confirm(
        'Are you sure you want to clear all data? This action cannot be undone.'
      )
    ) {
      localStorage.removeItem('telegram-group-lists');
      localStorage.removeItem('telegram-scheduled-messages');
      localStorage.removeItem('telegram-config');
      setConfig({ apiId: '', apiHash: '', phoneNumber: '' });
      logout();
      toast.success('All data cleared');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">
          Configure your Telegram connection and manage data
        </p>
      </div>

      {/* Telegram Configuration */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <Key className="h-6 w-6 text-telegram-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Telegram Configuration
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API ID
            </label>
            <input
              type="text"
              value={config.apiId}
              onChange={(e) => setConfig({ ...config, apiId: e.target.value })}
              placeholder="Your Telegram API ID"
              className="input-field"
              disabled={isConnected}
            />
            <p className="mt-1 text-xs text-gray-500">
              Get this from{' '}
              <a
                href="https://my.telegram.org/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-telegram-600 hover:underline"
              >
                my.telegram.org/apps
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Hash
            </label>
            <input
              type="password"
              value={config.apiHash}
              onChange={(e) =>
                setConfig({ ...config, apiHash: e.target.value })
              }
              placeholder="Your Telegram API Hash"
              className="input-field"
              disabled={isConnected}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={config.phoneNumber}
              onChange={(e) =>
                setConfig({ ...config, phoneNumber: e.target.value })
              }
              placeholder="+1234567890"
              className="input-field"
              disabled={isConnected}
            />
            <p className="mt-1 text-xs text-gray-500">
              Include country code (e.g., +1 for US)
            </p>
          </div>

          {/* Verification Code Input */}
          {requiresCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter the code sent to your phone"
                className="input-field"
              />
            </div>
          )}

          {/* Password Input for 2FA */}
          {requiresPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Two-Factor Authentication Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your 2FA password"
                className="input-field"
              />
            </div>
          )}

          <div className="flex space-x-3">
            {!isConnected && !requiresCode && (
              <>
                <button
                  onClick={saveConfig}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </button>
                <button
                  onClick={testConnection}
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>{isLoading ? 'Connecting...' : 'Connect'}</span>
                </button>
              </>
            )}

            {requiresCode && (
              <button
                onClick={verifyCode}
                disabled={isLoading || !verificationCode}
                className="btn-primary flex items-center space-x-2"
              >
                <Key className="h-4 w-4" />
                <span>{isLoading ? 'Verifying...' : 'Verify Code'}</span>
              </button>
            )}

            {isConnected && (
              <button
                onClick={logout}
                className="btn-danger flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {isConnected && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">
                  Connected to Telegram
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Data Management
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Export Data</h4>
              <p className="text-sm text-gray-600">
                Download your group lists and scheduled messages
              </p>
            </div>
            <button
              onClick={exportData}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Import Data</h4>
              <p className="text-sm text-gray-600">
                Restore from a previous backup
              </p>
            </div>
            <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h4 className="font-medium text-red-900">Clear All Data</h4>
              <p className="text-sm text-red-600">
                Remove all group lists, messages, and configuration
              </p>
            </div>
            <button
              onClick={clearAllData}
              className="btn-danger flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Setup Instructions
        </h3>
        <div className="prose prose-sm text-gray-600">
          <ol className="space-y-2">
            <li>
              <strong>Get Telegram API credentials:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>
                  • Go to{' '}
                  <a
                    href="https://my.telegram.org/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-telegram-600 hover:underline"
                  >
                    my.telegram.org/apps
                  </a>
                </li>
                <li>• Log in with your Telegram account</li>
                <li>• Create a new application</li>
                <li>• Copy the API ID and API Hash</li>
              </ul>
            </li>
            <li>
              <strong>Start the backend:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>
                  • Run: <code>python start_backend.py</code>
                </li>
                <li>• Ensure it's running on port 8000</li>
              </ul>
            </li>
            <li>
              <strong>Connect to Telegram:</strong>
              <ul className="mt-1 ml-4 space-y-1">
                <li>• Enter your credentials above</li>
                <li>• Click "Connect"</li>
                <li>• Enter verification code when prompted</li>
                <li>• Enter 2FA password if required</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>

      {/* Privacy & Data Transparency */}
      <PrivacyNotice
        onAccept={() =>
          toast.success('Thanks for reviewing our privacy policy!')
        }
        className="mb-6"
      />

      {/* Local Data Viewer */}
      <DataStorageViewer />
    </div>
  );
}
