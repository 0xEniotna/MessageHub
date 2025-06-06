'use client';

import { useState } from 'react';
import {
  Info,
  Shield,
  Server,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PrivacyNoticeProps {
  onAccept: () => void;
  className?: string;
}

export default function PrivacyNotice({
  onAccept,
  className = '',
}: PrivacyNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start space-x-3">
        <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            🔒 Your Data & Privacy
          </h3>

          <p className="text-sm text-blue-800 mb-3">
            We believe in complete transparency. Here's exactly where your data
            is stored:
          </p>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-blue-700 hover:text-blue-900 font-medium mb-3"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span>{isExpanded ? 'Show Less' : 'Show Details'}</span>
          </button>

          {isExpanded && (
            <div className="space-y-4 mb-4">
              {/* Browser Storage */}
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">
                    On Your Device (Browser)
                  </h4>
                </div>
                <ul className="text-xs text-blue-700 space-y-1 ml-6">
                  <li>
                    • <strong>API Credentials</strong>: Your Telegram API ID &
                    Hash (for connection)
                  </li>
                  <li>
                    • <strong>Group Lists</strong>: Contact groups you create
                    (never shared)
                  </li>
                  <li>
                    • <strong>Session Token</strong>: Keeps you logged in
                    (expires automatically)
                  </li>
                  <li>
                    • <strong>Draft Messages</strong>: Scheduled messages before
                    sending
                  </li>
                  <li className="text-green-700 font-medium">
                    ✓ Stays on your device only
                  </li>
                </ul>
              </div>

              {/* VPS Storage */}
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">
                    On Our Server (VPS)
                  </h4>
                </div>
                <ul className="text-xs text-blue-700 space-y-1 ml-6">
                  <li>
                    • <strong>Telegram Sessions</strong>: Authentication with
                    Telegram (encrypted)
                  </li>
                  <li>
                    • <strong>Message Queue</strong>: Scheduled messages waiting
                    to be sent
                  </li>
                  <li>
                    • <strong>Logs</strong>: Technical logs for debugging (no
                    personal content)
                  </li>
                  <li className="text-green-700 font-medium">
                    ✓ Encrypted & automatically deleted after 30 days
                  </li>
                </ul>
              </div>

              {/* Telegram Servers */}
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">
                    Telegram's Servers
                  </h4>
                </div>
                <ul className="text-xs text-blue-700 space-y-1 ml-6">
                  <li>
                    • <strong>Your Messages</strong>: Sent through Telegram's
                    API (same as mobile app)
                  </li>
                  <li>
                    • <strong>Contact Lists</strong>: We only read, never store
                    your contacts
                  </li>
                  <li className="text-green-700 font-medium">
                    ✓ Same security as official Telegram app
                  </li>
                </ul>
              </div>

              {/* What We DON'T Store */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">
                  🚫 What We DON'T Store:
                </h4>
                <ul className="text-xs text-green-700 space-y-1 ml-2">
                  <li>• Your message content (sent directly to Telegram)</li>
                  <li>• Your contacts or chat history</li>
                  <li>
                    • Personal information beyond what's needed for
                    authentication
                  </li>
                  <li>• Banking or payment information</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600">
              <strong>Open Source:</strong> All code is transparent and
              auditable
            </p>

            <button
              onClick={onAccept}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              I Understand & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
