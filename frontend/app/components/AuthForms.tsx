'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import apiClient from '../lib/api';

interface AuthFormsProps {
  step: 'credentials' | 'verification' | 'authenticated';
  setStep: (step: 'credentials' | 'verification' | 'authenticated') => void;
  setIsAuthenticated: (auth: boolean) => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
  loadChats: () => void;
}

export default function AuthForms({
  step,
  setStep,
  setIsAuthenticated,
  onSuccess,
  onError,
  loadChats,
}: AuthFormsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth form states
  const [credentials, setCredentials] = useState({
    api_id: '',
    api_hash: '',
    phone_number: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.login(credentials);

      if (response.success) {
        // Save only API credentials to localStorage for transparency (NOT phone number)
        localStorage.setItem(
          'telegram-config',
          JSON.stringify({
            apiId: credentials.api_id,
            apiHash: credentials.api_hash,
            // phoneNumber is intentionally NOT stored for privacy
          })
        );

        // Store session token for API calls
        if (response.session_token) {
          localStorage.setItem('session_token', response.session_token);
        }

        setIsAuthenticated(true);
        setStep('authenticated');
        onSuccess('Successfully connected!');
        loadChats();
      } else if (response.requires_code) {
        setStep('verification');
        setSuccess('Verification code sent to your phone!');
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.verifyCode({
        phone_number: credentials.phone_number,
        code: verificationCode,
        password: requiresPassword ? password : undefined,
      });

      if (response.success) {
        // Save only API credentials to localStorage for transparency (NOT phone number)
        localStorage.setItem(
          'telegram-config',
          JSON.stringify({
            apiId: credentials.api_id,
            apiHash: credentials.api_hash,
            // phoneNumber is intentionally NOT stored for privacy
          })
        );

        // Store session token for API calls
        if (response.session_token) {
          localStorage.setItem('session_token', response.session_token);
        }

        setIsAuthenticated(true);
        setStep('authenticated');
        onSuccess('Successfully authenticated!');
        loadChats();
      } else if (response.requires_password) {
        setRequiresPassword(true);
        setError(
          'Two-factor authentication required. Please enter your password.'
        );
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const retroStyles = `
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    .retro-border {
      border: 3px solid #000;
      box-shadow: 3px 3px 0px #666;
    }
    .retro-button {
      background: linear-gradient(45deg, #ff6b6b, #ffd93d);
      border: 2px solid #000;
      box-shadow: 2px 2px 0px #333;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      text-transform: uppercase;
      transition: all 0.1s;
    }
    .retro-button:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0px #333;
    }
    .retro-input {
      border: 2px solid #000;
      background: #ffff99;
      font-family: 'Courier New', monospace;
      box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
  `;

  if (step === 'credentials') {
    return (
      <div
        className="min-h-screen"
        style={{
          background:
            'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff)',
          backgroundSize: '400% 400%',
          animation: 'gradient 3s ease infinite',
        }}
      >
        <style jsx>{retroStyles}</style>

        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          {/* Header with retro styling */}
          <div className="text-center mb-8">
            <div
              className="text-6xl font-bold mb-4"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: '#ff0000',
                textShadow: '3px 3px 0px #000, 6px 6px 0px #666',
                animation: 'bounce 2s infinite',
              }}
            >
              📱 MESSAGEHUB 📱
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#0000ff',
                textShadow: '2px 2px 0px #fff',
                animation: 'blink 1s infinite',
              }}
            >
              ★ TELEGRAM MESSAGING TOOL ★
            </div>
          </div>

          {/* App description section */}
          <div
            className="retro-border p-6 max-w-2xl w-full mb-6"
            style={{
              background: 'linear-gradient(45deg, #ffff99, #99ff99)',
            }}
          >
            <div className="text-center">
              <div
                className="text-lg font-bold mb-3"
                style={{
                  fontFamily: 'Arial Black, sans-serif',
                  color: '#ff0000',
                  textDecoration: 'underline',
                }}
              >
                🌐 WHAT IS MESSAGEHUB? 🌐
              </div>
              <div
                className="text-sm space-y-2"
                style={{
                  fontFamily: 'Verdana, sans-serif',
                  color: '#000080',
                  lineHeight: '1.4',
                }}
              >
                <div className="font-bold">
                  💫 SEND MESSAGES TO MULTIPLE TELEGRAM GROUPS AT ONCE! 💫
                </div>
                <div>
                  ✅ Manage contact lists • ✅ Schedule messages • ✅ Send
                  images
                </div>
                <div>
                  ✅ Perfect for announcements • ✅ No more copy-paste spam!
                </div>
                <div
                  className="mt-3 font-bold"
                  style={{
                    color: '#800080',
                    fontFamily: 'Comic Sans MS, cursive',
                  }}
                >
                  🚀 ONE MESSAGE → HUNDREDS OF RECIPIENTS! 🚀
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice - Get Credentials First */}
          <div
            className="retro-border p-4 max-w-2xl w-full mb-6"
            style={{
              background: 'linear-gradient(45deg, #ffff00, #ff9900)',
              border: '4px solid #ff0000',
              boxShadow: '4px 4px 0px #cc0000',
            }}
          >
            <div className="text-center">
              <div
                className="text-lg font-bold mb-2"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#000080',
                  textShadow: '2px 2px 0px #fff',
                  animation: 'blink 1s infinite',
                }}
              >
                ⚠️ IMPORTANT: GET API CREDENTIALS FIRST! ⚠️
              </div>
              <div
                className="text-sm mb-3"
                style={{
                  fontFamily: 'Arial Black, sans-serif',
                  color: '#000080',
                  fontWeight: 'bold',
                }}
              >
                You MUST create a Telegram app to get your API credentials
                before using MessageHub!
              </div>
              <div
                className="text-base font-bold mb-2"
                style={{
                  fontFamily: 'Courier New, monospace',
                  color: '#ff0000',
                }}
              >
                📍 STEP 1: Visit this website first:
              </div>
              <a
                href="https://my.telegram.org/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="retro-button px-4 py-2 text-black text-base inline-block"
                style={{
                  background: 'linear-gradient(45deg, #00ff00, #99ff99)',
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  fontSize: '16px',
                  textDecoration: 'none',
                  border: '3px solid #000',
                }}
              >
                🚀 GET API CREDENTIALS 🚀
              </a>
              <div
                className="text-xs mt-2"
                style={{
                  fontFamily: 'Verdana, sans-serif',
                  color: '#000080',
                  fontWeight: 'bold',
                }}
              >
                📝 Create an app → Copy API ID & API Hash → Return here!
              </div>
            </div>
          </div>

          {/* Main content area with credentials and privacy */}
          <div className="flex flex-col lg:flex-row gap-6 max-w-5xl w-full">
            {/* Credentials Box */}
            <div
              className="retro-border p-8 flex-1 max-w-md"
              style={{
                background: 'linear-gradient(135deg, #ff99cc, #99ccff)',
              }}
            >
              <div className="text-center mb-6">
                <div
                  className="text-xl font-bold mb-2"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                    textDecoration: 'underline',
                  }}
                >
                  🔐 ENTER YOUR CREDENTIALS 🔐
                </div>
                <div
                  className="text-sm"
                  style={{
                    fontFamily: 'Times New Roman, serif',
                    color: '#800080',
                    fontStyle: 'italic',
                  }}
                >
                  Connect to the Telegram Matrix!
                </div>
              </div>

              {error && (
                <div
                  className="mb-4 p-3 retro-border text-center"
                  style={{
                    background: '#ff6666',
                    color: '#fff',
                    fontFamily: 'Courier New, monospace',
                    fontWeight: 'bold',
                  }}
                >
                  ⚠️ ERROR: {error} ⚠️
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-bold mb-1"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      color: '#000080',
                    }}
                  >
                    📡 API ID:
                  </label>
                  <input
                    type="text"
                    value={credentials.api_id}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        api_id: e.target.value,
                      }))
                    }
                    className="retro-input w-full p-2 text-black"
                    placeholder="Enter your API ID here..."
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-bold mb-1"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      color: '#000080',
                    }}
                  >
                    🔑 API Hash:
                  </label>
                  <input
                    type="text"
                    value={credentials.api_hash}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        api_hash: e.target.value,
                      }))
                    }
                    className="retro-input w-full p-2 text-black"
                    placeholder="Enter your API Hash here..."
                    required
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-bold mb-1"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      color: '#000080',
                    }}
                  >
                    📞 Phone Number:
                  </label>
                  <input
                    type="tel"
                    value={credentials.phone_number}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        phone_number: e.target.value,
                      }))
                    }
                    className="retro-input w-full p-2 text-black"
                    placeholder="+1234567890"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="retro-button w-full p-3 text-black text-lg"
                >
                  {loading ? '⏳ CONNECTING...' : '🚀 CONNECT TO TELEGRAM! 🚀'}
                </button>
              </form>

              <div
                className="mt-6 text-center text-sm"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#800000',
                }}
              >
                <div className="mb-2">🌟 Get your API credentials from: 🌟</div>
                <a
                  href="https://my.telegram.org/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#0000ff',
                    textDecoration: 'underline',
                    fontWeight: 'bold',
                  }}
                >
                  👉 my.telegram.org/apps 👈
                </a>
              </div>
            </div>

            {/* Privacy Policy Box */}
            <div
              className="retro-border p-6 flex-1 max-w-md"
              style={{
                background: 'linear-gradient(135deg, #e6ffe6, #e6f3ff)',
              }}
            >
              <div className="text-center mb-4">
                <div
                  className="text-xl font-bold mb-2"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                    textDecoration: 'underline',
                  }}
                >
                  🔒 YOUR PRIVACY MATTERS 🔒
                </div>
                <div
                  className="text-sm"
                  style={{
                    fontFamily: 'Times New Roman, serif',
                    color: '#800080',
                    fontStyle: 'italic',
                  }}
                >
                  Complete transparency about your data
                </div>
              </div>

              <div className="space-y-4">
                {/* Browser Storage */}
                <div className="bg-white rounded-lg p-3 retro-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'Arial Black, sans-serif',
                        color: '#000080',
                      }}
                    >
                      💻 On Your Device
                    </div>
                  </div>
                  <ul
                    className="text-xs space-y-1 ml-2"
                    style={{
                      fontFamily: 'Verdana, sans-serif',
                      color: '#333',
                    }}
                  >
                    <li>• API credentials (for connection)</li>
                    <li>• Group lists you create</li>
                    <li>• Session token (expires automatically)</li>
                    <li className="font-bold" style={{ color: '#008000' }}>
                      ✓ Stays on your device only
                    </li>
                  </ul>
                </div>

                {/* Server Storage */}
                <div className="bg-white rounded-lg p-3 retro-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'Arial Black, sans-serif',
                        color: '#000080',
                      }}
                    >
                      🖥️ On Our Server
                    </div>
                  </div>
                  <ul
                    className="text-xs space-y-1 ml-2"
                    style={{
                      fontFamily: 'Verdana, sans-serif',
                      color: '#333',
                    }}
                  >
                    <li>• Telegram sessions (encrypted)</li>
                    <li>• Scheduled messages queue</li>
                    <li>• Technical logs (no personal content)</li>
                    <li className="font-bold" style={{ color: '#008000' }}>
                      ✓ Auto-deleted after 30 days
                    </li>
                  </ul>
                </div>

                {/* What we DON'T store */}
                <div
                  className="rounded-lg p-3 retro-border"
                  style={{
                    background: 'linear-gradient(45deg, #ffe6e6, #fff0f0)',
                  }}
                >
                  <div
                    className="text-sm font-bold mb-2"
                    style={{
                      fontFamily: 'Arial Black, sans-serif',
                      color: '#800000',
                    }}
                  >
                    🚫 We DON'T Store:
                  </div>
                  <ul
                    className="text-xs space-y-1 ml-2"
                    style={{
                      fontFamily: 'Verdana, sans-serif',
                      color: '#333',
                    }}
                  >
                    <li>• Your contacts or chat history</li>
                    <li>• Personal information beyond auth</li>
                    <li>• Banking or payment data</li>
                  </ul>
                  <div
                    className="text-xs mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded"
                    style={{
                      fontFamily: 'Verdana, sans-serif',
                      color: '#666',
                    }}
                  >
                    <strong>Note:</strong> Scheduled messages are temporarily
                    stored until sent, then deleted.
                  </div>
                </div>

                <div
                  className="text-center text-xs"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#666',
                  }}
                >
                  <div className="font-bold mb-1">🔓 Open Source</div>
                  <div>All code is transparent & auditable</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with retro elements */}
          <div className="mt-8 text-center">
            <div
              className="text-lg font-bold"
              style={{
                fontFamily: 'Impact, sans-serif',
                color: '#ff0000',
                textShadow: '2px 2px 0px #000',
              }}
            >
              🎉 COMPLETELY FREE 🎉
            </div>
            <div
              className="text-sm mt-2"
              style={{
                fontFamily: 'Courier New, monospace',
                color: '#000080',
              }}
            >
              © 2024 MessageHub - Best viewed in Netscape Navigator
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification step
  if (step === 'verification') {
    return (
      <div
        className="min-h-screen"
        style={{
          background:
            'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff00ff)',
          backgroundSize: '400% 400%',
          animation: 'gradient 3s ease infinite',
        }}
      >
        <style jsx>{retroStyles}</style>

        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          {/* Header with retro styling */}
          <div className="text-center mb-8">
            <div
              className="text-6xl font-bold mb-4"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: '#ff0000',
                textShadow: '3px 3px 0px #000, 6px 6px 0px #666',
                animation: 'bounce 2s infinite',
              }}
            >
              🔐 VERIFICATION 🔐
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#0000ff',
                textShadow: '2px 2px 0px #fff',
                animation: 'blink 1s infinite',
              }}
            >
              ★ ENTER YOUR SECRET CODE ★
            </div>
          </div>

          {/* Main content box */}
          <div
            className="retro-border p-8 max-w-md w-full"
            style={{
              background: 'linear-gradient(135deg, #ff99cc, #99ccff)',
            }}
          >
            <div className="text-center mb-6">
              <div
                className="text-xl font-bold mb-2"
                style={{
                  fontFamily: 'Arial Black, sans-serif',
                  color: '#000080',
                  textDecoration: 'underline',
                }}
              >
                📱 CODE VERIFICATION 📱
              </div>
              <div
                className="text-sm"
                style={{
                  fontFamily: 'Times New Roman, serif',
                  color: '#800080',
                  fontStyle: 'italic',
                }}
              >
                Check your phone for the magic numbers!
              </div>
            </div>

            {error && (
              <div
                className="mb-4 p-3 retro-border text-center"
                style={{
                  background: '#ff6666',
                  color: '#fff',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 'bold',
                }}
              >
                ⚠️ ERROR: {error} ⚠️
              </div>
            )}

            {success && (
              <div
                className="mb-4 p-3 retro-border text-center"
                style={{
                  background: '#66ff66',
                  color: '#000',
                  fontFamily: 'Courier New, monospace',
                  fontWeight: 'bold',
                }}
              >
                ✅ SUCCESS: {success} ✅
              </div>
            )}

            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-bold mb-1"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    color: '#000080',
                  }}
                >
                  🔢 Verification Code:
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="retro-input w-full p-2 text-black"
                  placeholder="Enter the 5-digit code..."
                  required
                />
              </div>

              {requiresPassword && (
                <div>
                  <label
                    className="block text-sm font-bold mb-1"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      color: '#000080',
                    }}
                  >
                    🛡️ 2FA Password:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="retro-input w-full p-2 text-black"
                    placeholder="Your 2FA password..."
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="retro-button w-full p-3 text-black text-lg"
              >
                {loading ? '⏳ VERIFYING...' : '🚀 VERIFY & ENTER! 🚀'}
              </button>
            </form>

            <div
              className="mt-6 text-center text-sm"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#800000',
              }}
            >
              <div className="mb-2">📱 Check your Telegram app! 📱</div>
              <div
                style={{
                  color: '#000080',
                  fontWeight: 'bold',
                }}
              >
                👆 Enter the code you received 👆
              </div>
            </div>
          </div>

          {/* Footer with retro elements */}
          <div className="mt-8 text-center">
            <div
              className="text-lg font-bold"
              style={{
                fontFamily: 'Impact, sans-serif',
                color: '#ff0000',
                textShadow: '2px 2px 0px #000',
              }}
            >
              🔒 SECURE RETRO VERIFICATION 🔒
            </div>
            <div
              className="text-sm mt-2"
              style={{
                fontFamily: 'Courier New, monospace',
                color: '#000080',
              }}
            >
              © 2024 MessageHub - Security Level: MAXIMUM
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
