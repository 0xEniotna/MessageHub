'use client';

import { useState, useEffect } from 'react';
import {
  Send,
  Users,
  Settings,
  MessageSquare,
  Phone,
  Key,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  UserPlus,
  Image,
  Upload,
} from 'lucide-react';
import apiClient from './lib/api';
import AuthForms from './components/AuthForms';
import ComposeMessage from './components/ComposeMessage';
import GroupListManager from './components/GroupListManager';
import DataStorageViewer from './components/DataStorageViewer';
import PrivacyNotice from './components/PrivacyNotice';

interface Chat {
  id: string;
  name: string;
  type: 'user' | 'group' | 'channel' | 'supergroup';
  username?: string;
  is_admin?: boolean | null;
}

interface Group {
  id: string;
  name: string;
  type: 'user' | 'group';
  identifier: string;
}

interface GroupList {
  id: string;
  name: string;
  groups: Group[];
  createdAt: string;
}

interface MediaFile {
  original_filename: string;
  saved_path: string;
  file_size: number;
  content_type: string;
}

interface ScheduledMessage {
  id: string;
  phone_number: string;
  recipients: Group[];
  message: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  executed_at?: string;
  media_files?: MediaFile[];
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<
    'credentials' | 'verification' | 'authenticated'
  >('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // App states
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    'compose' | 'chats' | 'lists' | 'scheduled' | 'privacy'
  >('compose');

  // Group list states
  const [groupLists, setGroupLists] = useState<GroupList[]>([]);
  const [selectedGroupList, setSelectedGroupList] = useState<string>('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdminOnly, setShowAdminOnly] = useState(false);

  // Rename states
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamePermissions, setRenamePermissions] = useState<{
    [chatId: string]: { can_rename: boolean | null; reason: string };
  }>({});

  // Scheduled message states
  const [scheduledMessages, setScheduledMessages] = useState<
    ScheduledMessage[]
  >([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // New state for adding to existing lists
  const [selectedExistingList, setSelectedExistingList] = useState<string>('');
  const [isAddingToList, setIsAddingToList] = useState(false);

  // Filter chats based on search query and admin status
  const filteredChats = chats.filter((chat) => {
    // Search filter
    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.username &&
        chat.username.toLowerCase().includes(searchQuery.toLowerCase()));

    // Admin filter
    const matchesAdminFilter =
      !showAdminOnly ||
      (chat.is_admin === true &&
        (chat.type === 'group' ||
          chat.type === 'supergroup' ||
          chat.type === 'channel'));

    return matchesSearch && matchesAdminFilter;
  });

  // Load group lists from localStorage on component mount
  useEffect(() => {
    const loadGroupLists = () => {
      try {
        const savedLists = localStorage.getItem('telegram-group-lists');
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          if (Array.isArray(parsedLists)) {
            setGroupLists(parsedLists);
            console.log(
              'Loaded group lists from localStorage:',
              parsedLists.length,
              'lists'
            );
          } else {
            console.warn('Invalid group lists structure in localStorage');
            localStorage.removeItem('telegram-group-lists');
          }
        }
      } catch (error) {
        console.error('Error loading group lists from localStorage:', error);
        localStorage.removeItem('telegram-group-lists');
      }
    };

    loadGroupLists();
  }, []);

  // Save group lists to localStorage whenever they change
  useEffect(() => {
    if (groupLists.length === 0) {
      return;
    }

    try {
      const serializedLists = JSON.stringify(groupLists);
      localStorage.setItem('telegram-group-lists', serializedLists);
      console.log(
        '✅ Saved group lists to localStorage:',
        groupLists.length,
        'lists'
      );
    } catch (error) {
      console.error('❌ Error saving group lists to localStorage:', error);
      setError('Warning: Unable to save group lists to browser storage');
    }
  }, [groupLists]);

  // Check auth status on load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      let status = await apiClient.checkAuthStatus();

      // If not connected, try development auto-auth
      if (!status.connected) {
        try {
          const devAuthResponse = await fetch(
            'http://localhost:8000/api/dev/auto-auth'
          );
          if (devAuthResponse.ok) {
            const devAuth = await devAuthResponse.json();
            if (devAuth.success && devAuth.session_token) {
              localStorage.setItem('session_token', devAuth.session_token);
              console.log('🔧 DEV: Auto-authenticated successfully');
              status = { connected: true, phone_number: devAuth.phone_number };
            }
          }
        } catch (devError) {
          console.log(
            '🔧 DEV: Auto-auth not available (normal for production)'
          );
        }
      }

      if (status.connected) {
        setIsAuthenticated(true);
        setStep('authenticated');
        loadChats();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await apiClient.getChats();
      setChats(response.chats || []);

      // Load admin status for groups/supergroups/channels
      loadAdminStatusForChats(response.chats || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load chats');
    }
  };

  const loadAdminStatusForChats = async (chatList: Chat[]) => {
    // Filter to only groups, supergroups, and channels
    const groupChats = chatList.filter(
      (chat) =>
        chat.type === 'group' ||
        chat.type === 'supergroup' ||
        chat.type === 'channel'
    );

    // Load admin status and rename permissions for each group (with delay to avoid rate limits)
    for (const chat of groupChats) {
      try {
        // Load admin status
        const adminResponse = await fetch(
          `http://localhost:8000/api/chats/${chat.id}/admin-status`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem('session_token') || ''
              }`,
            },
          }
        );

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();

          // Update the chat with admin status
          setChats((prevChats) =>
            prevChats.map((c) =>
              c.id === chat.id ? { ...c, is_admin: adminData.is_admin } : c
            )
          );
        }

        // Load rename permissions
        const renameResponse = await fetch(
          `http://localhost:8000/api/chats/${chat.id}/can-rename`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem('session_token') || ''
              }`,
            },
          }
        );

        if (renameResponse.ok) {
          const renameData = await renameResponse.json();

          // Update rename permissions
          setRenamePermissions((prev) => ({
            ...prev,
            [chat.id]: {
              can_rename: renameData.can_rename,
              reason: renameData.reason,
            },
          }));
        }
      } catch (error) {
        console.error(`Failed to load permissions for chat ${chat.id}:`, error);
      }

      // Add a small delay to avoid overwhelming Telegram's API
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  };

  const loadScheduledMessages = async () => {
    setLoadingScheduled(true);
    try {
      const response = await fetch(
        'https://141-136-35-8.sslip.io/api/messages/scheduled',
        {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem('session_token') || ''
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load scheduled messages');
      }

      const data = await response.json();
      setScheduledMessages(data.messages || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load scheduled messages');
    } finally {
      setLoadingScheduled(false);
    }
  };

  const executeScheduledMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `https://141-136-35-8.sslip.io/api/messages/execute/${messageId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem('session_token') || ''
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to execute message');
      }

      setSuccess('Message executed successfully!');
      loadScheduledMessages();
    } catch (error: any) {
      setError(error.message || 'Failed to execute message');
    }
  };

  const deleteScheduledMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled message?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://141-136-35-8.sslip.io/api/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem('session_token') || ''
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setSuccess('Message deleted successfully!');
      loadScheduledMessages();
    } catch (error: any) {
      setError(error.message || 'Failed to delete message');
    }
  };

  const handleSendMessage = async (data: any) => {
    const {
      recipientChats,
      message,
      selectedImages,
      isScheduled,
      scheduledDate,
      scheduledTime,
    } = data;

    setLoading(true);
    setError('');

    try {
      let response;

      if (selectedImages.length > 0) {
        // Send message with images using FormData
        const formData = new FormData();

        formData.append(
          'recipients',
          JSON.stringify(
            recipientChats.map((chat: Chat) => ({
              id: chat.id,
              name: chat.name,
              type: chat.type,
              identifier: chat.id,
            }))
          )
        );

        if (message.trim()) {
          formData.append('message', message.trim());
        }

        if (isScheduled && scheduledDate && scheduledTime) {
          formData.append(
            'schedule_for',
            `${scheduledDate}T${scheduledTime}:00`
          );
          const timezoneOffset = new Date().getTimezoneOffset();
          formData.append('timezone_offset', timezoneOffset.toString());
        }

        selectedImages.forEach((image: File, index: number) => {
          formData.append(`images[${index}]`, image);
        });

        response = await apiClient.sendMessageWithMedia(formData);
      } else {
        // Send text-only message
        const requestData: any = {
          recipients: recipientChats.map((chat: Chat) => ({
            id: chat.id,
            name: chat.name,
            type: chat.type,
            identifier: chat.id,
          })),
          message: message.trim(),
        };

        if (isScheduled && scheduledDate && scheduledTime) {
          requestData.schedule_for = `${scheduledDate}T${scheduledTime}:00`;
          requestData.timezone_offset = new Date().getTimezoneOffset();
        }

        response = await apiClient.sendMessage(requestData);
      }

      if (response.success) {
        const mediaText =
          selectedImages.length > 0
            ? ` with ${selectedImages.length} image(s)`
            : '';
        setSuccess(
          isScheduled
            ? `Message${mediaText} scheduled for ${recipientChats.length} recipients`
            : `Message${mediaText} sent to ${recipientChats.length} recipients`
        );

        if (isScheduled) {
          loadScheduledMessages();
        }
      } else {
        setError('Failed to send message');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    const currentChat = chats.find((chat) => chat.id === chatId);
    if (!currentChat) return;

    // Trim the new title
    const trimmedTitle = newTitle.trim();

    // Check if the name actually changed
    if (trimmedTitle === currentChat.name) {
      // No change, just cancel editing
      setRenamingChatId(null);
      setNewChatName('');
      return;
    }

    // Final confirmation before making the API call
    const confirmed = window.confirm(
      `🔄 Final confirmation - Rename group on Telegram?\n\n` +
        `From: "${currentChat.name}"\n` +
        `To: "${trimmedTitle}"\n\n` +
        `This will be visible to ALL group members immediately.\n\n` +
        `Proceed with the rename?`
    );

    if (!confirmed) {
      return; // User cancelled, keep editing mode active
    }

    setIsRenaming(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/chats/${chatId}/rename`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              localStorage.getItem('session_token') || ''
            }`,
          },
          body: JSON.stringify({ new_title: trimmedTitle }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the chat name in the local state
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === chatId ? { ...chat, name: data.new_title } : chat
          )
        );
        setSuccess(
          `✅ Group renamed successfully! All members can now see the new name: "${data.new_title}"`
        );
        setRenamingChatId(null);
        setNewChatName('');
      } else {
        setError(data.error || 'Failed to rename chat');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to rename chat');
    } finally {
      setIsRenaming(false);
    }
  };

  const startRename = (chat: Chat) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to rename this group?\n\n` +
        `This will change the group name "${chat.name}" on Telegram for ALL members.\n\n` +
        `Current name: ${chat.name}\n\n` +
        `Click OK to proceed with renaming, or Cancel to abort.`
    );

    if (confirmed) {
      setRenamingChatId(chat.id);
      setNewChatName(chat.name);
    }
  };

  const cancelRename = () => {
    setRenamingChatId(null);
    setNewChatName('');
  };

  const logout = () => {
    apiClient.clearSession();
    localStorage.removeItem('telegram-config');
    setIsAuthenticated(false);
    setStep('credentials');
    setChats([]);
    setSelectedChats([]);
    setSelectedGroupList('');
  };

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthForms
        step={step}
        setStep={setStep}
        setIsAuthenticated={setIsAuthenticated}
        onSuccess={setSuccess}
        onError={setError}
        loadChats={loadChats}
      />
    );
  }

  // Main authenticated app
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
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
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
        .retro-card {
          background: linear-gradient(135deg, #ff99cc, #99ccff);
          border: 3px solid #000;
          box-shadow: 5px 5px 0px #666;
        }
        .retro-nav-button {
          background: linear-gradient(45deg, #99ff99, #ffff99);
          border: 2px solid #000;
          box-shadow: 2px 2px 0px #333;
          font-family: 'Arial Black', sans-serif;
          font-weight: bold;
          transition: all 0.1s;
        }
        .retro-nav-button.active {
          background: linear-gradient(45deg, #ff99ff, #99ffff);
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #333;
        }
        .retro-nav-button:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0px #333;
        }
        .scrolling-text {
          animation: scroll 10s linear infinite;
          white-space: nowrap;
        }
      `}</style>

      {/* Header */}
      <header
        className="retro-border"
        style={{
          background:
            'linear-gradient(90deg, #ff6666, #66ff66, #6666ff, #ff6666)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div
                className="p-2 retro-border"
                style={{
                  background: 'linear-gradient(45deg, #ffff00, #ff00ff)',
                  animation: 'bounce 2s infinite',
                }}
              >
                <Send className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: 'Impact, Arial Black, sans-serif',
                    color: '#000080',
                    textShadow: '2px 2px 0px #fff',
                  }}
                >
                  📱 MESSAGEHUB 📱
                </h1>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#800000',
                    fontWeight: 'bold',
                  }}
                >
                  🔥 {chats.length} chats • {groupLists.length} lists loaded! 🔥
                </p>
              </div>
            </div>

            <div className="hidden md:block overflow-hidden w-64">
              <div
                className="scrolling-text text-sm font-bold"
                style={{
                  fontFamily: 'Courier New, monospace',
                  color: '#000080',
                }}
              >
                ★ IMPROVED TELEGRAM EXPERIENCE ★ SEND TO MULTIPLE GROUPS ★
                SCHEDULE MESSAGES ★
              </div>
            </div>

            <button
              onClick={logout}
              className="retro-button px-4 py-2 text-black"
            >
              🚪 LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        className="retro-border"
        style={{
          background:
            'linear-gradient(90deg, #99ffcc, #ffcc99, #cc99ff, #99ffcc)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 py-3">
            <button
              onClick={() => setActiveTab('compose')}
              className={`retro-nav-button px-4 py-2 text-black text-sm ${
                activeTab === 'compose' ? 'active' : ''
              }`}
            >
              ✉️ COMPOSE MESSAGE
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`retro-nav-button px-4 py-2 text-black text-sm ${
                activeTab === 'chats' ? 'active' : ''
              }`}
            >
              👥 SELECT CHATS ({selectedChats.length})
            </button>
            <button
              onClick={() => setActiveTab('lists')}
              className={`retro-nav-button px-4 py-2 text-black text-sm ${
                activeTab === 'lists' ? 'active' : ''
              }`}
            >
              📋 GROUP LISTS ({groupLists.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('scheduled');
                loadScheduledMessages();
              }}
              className={`retro-nav-button px-4 py-2 text-black text-sm ${
                activeTab === 'scheduled' ? 'active' : ''
              }`}
            >
              📅 SCHEDULED ({scheduledMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`retro-nav-button px-4 py-2 text-black text-sm ${
                activeTab === 'privacy' ? 'active' : ''
              }`}
            >
              🔒 PRIVACY
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div
            className="mb-6 p-4 retro-border text-center"
            style={{
              background: 'linear-gradient(45deg, #ff6666, #ff9999)',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              color: '#000',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>⚠️ ERROR: {error} ⚠️</span>
              <button
                onClick={() => setError('')}
                className="ml-auto retro-button px-2 py-1 text-xs"
              >
                ❌
              </button>
            </div>
          </div>
        )}

        {success && (
          <div
            className="mb-6 p-4 retro-border text-center"
            style={{
              background: 'linear-gradient(45deg, #66ff66, #99ff99)',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              color: '#000',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>✅ SUCCESS: {success} ✅</span>
              <button
                onClick={() => setSuccess('')}
                className="ml-auto retro-button px-2 py-1 text-xs"
              >
                ❌
              </button>
            </div>
          </div>
        )}

        {activeTab === 'compose' && (
          <ComposeMessage
            chats={chats}
            groupLists={groupLists}
            selectedChats={selectedChats}
            setSelectedChats={setSelectedChats}
            selectedGroupList={selectedGroupList}
            setSelectedGroupList={setSelectedGroupList}
            onSendMessage={handleSendMessage}
            loading={loading}
          />
        )}

        {activeTab === 'chats' && (
          <div className="retro-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#000080',
                  textShadow: '2px 2px 0px #fff',
                  textDecoration: 'underline',
                }}
              >
                👥 SELECT YOUR CHATS 👥
              </h2>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <label
                className="block text-sm font-bold mb-2"
                style={{
                  fontFamily: 'Arial Black, sans-serif',
                  color: '#000080',
                }}
              >
                🔍 SEARCH CHATS
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search for chats..."
                className="retro-input w-full p-3 text-black"
                style={{
                  fontFamily: 'Courier New, monospace',
                }}
              />

              {/* Admin Filter Toggle */}
              <div className="mt-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`w-5 h-5 retro-border flex items-center justify-center ${
                      showAdminOnly ? 'bg-yellow-500 text-white' : 'bg-white'
                    }`}
                    onClick={() => setShowAdminOnly(!showAdminOnly)}
                  >
                    {showAdminOnly && '✓'}
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{
                      fontFamily: 'Arial Black, sans-serif',
                      color: showAdminOnly ? '#d97706' : '#000080',
                    }}
                  >
                    👑 SHOW ADMIN GROUPS ONLY
                  </span>
                </label>
              </div>
            </div>

            {/* Filter Status */}
            {showAdminOnly && (
              <div
                className="mb-4 p-3 retro-border"
                style={{
                  background: 'linear-gradient(45deg, #fef3c7, #fde68a)',
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#d97706',
                  }}
                >
                  👑 ADMIN FILTER ACTIVE - Showing {filteredChats.length} admin
                  group{filteredChats.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Bulk Actions */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={() =>
                  setSelectedChats(filteredChats.map((chat) => chat.id))
                }
                className="retro-button px-4 py-2 text-black text-sm"
                style={{
                  background: 'linear-gradient(45deg, #99ff99, #66ff66)',
                }}
              >
                ✅ SELECT ALL ({filteredChats.length})
              </button>
              <button
                onClick={() => setSelectedChats([])}
                className="retro-button px-4 py-2 text-black text-sm"
                style={{
                  background: 'linear-gradient(45deg, #ff9999, #ff6666)',
                }}
              >
                ❌ CLEAR ALL
              </button>
            </div>

            {/* Selected Count */}
            {selectedChats.length > 0 && (
              <div
                className="mb-4 p-3 retro-border"
                style={{
                  background: 'linear-gradient(45deg, #ffff99, #ffcc99)',
                }}
              >
                <p
                  className="text-sm font-bold"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  🎯 {selectedChats.length} CHAT
                  {selectedChats.length !== 1 ? 'S' : ''} SELECTED!
                </p>
              </div>
            )}

            {/* Chat List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="text-center p-8">
                  <p
                    className="text-gray-600"
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontStyle: 'italic',
                    }}
                  >
                    {showAdminOnly && searchQuery
                      ? 'No admin groups found matching your search...'
                      : showAdminOnly
                      ? 'No admin groups found. You may not be an admin in any groups yet.'
                      : searchQuery
                      ? 'No chats found matching your search...'
                      : 'No chats available. Make sure you are authenticated.'}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 retro-border cursor-pointer transition-all ${
                      selectedChats.includes(chat.id)
                        ? 'bg-gradient-to-r from-green-200 to-green-300'
                        : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-100 hover:to-blue-200'
                    }`}
                    onClick={() => {
                      if (selectedChats.includes(chat.id)) {
                        setSelectedChats(
                          selectedChats.filter((id) => id !== chat.id)
                        );
                      } else {
                        setSelectedChats([...selectedChats, chat.id]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div
                          className={`w-6 h-6 retro-border flex items-center justify-center ${
                            selectedChats.includes(chat.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-white'
                          }`}
                        >
                          {selectedChats.includes(chat.id) && '✓'}
                        </div>
                        <div className="flex-1">
                          {/* Chat name - editable for groups/channels */}
                          {renamingChatId === chat.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newChatName}
                                onChange={(e) => setNewChatName(e.target.value)}
                                className="retro-input flex-1 p-1 text-sm text-black"
                                style={{
                                  fontFamily: 'Arial Black, sans-serif',
                                }}
                                maxLength={255}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    renameChat(chat.id, newChatName.trim());
                                  } else if (e.key === 'Escape') {
                                    cancelRename();
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  renameChat(chat.id, newChatName.trim());
                                }}
                                disabled={isRenaming || !newChatName.trim()}
                                className="retro-button px-2 py-1 text-xs text-black"
                                style={{
                                  background:
                                    'linear-gradient(45deg, #99ff99, #66ff66)',
                                  opacity:
                                    isRenaming || !newChatName.trim() ? 0.5 : 1,
                                }}
                              >
                                {isRenaming ? '⏳' : '✓'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelRename();
                                }}
                                className="retro-button px-2 py-1 text-xs text-black"
                                style={{
                                  background:
                                    'linear-gradient(45deg, #ff9999, #ff6666)',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              className="font-bold text-black flex items-center gap-2"
                              style={{
                                fontFamily: 'Arial Black, sans-serif',
                              }}
                            >
                              <span>{chat.name}</span>
                              {/* Admin indicator for groups/supergroups/channels */}
                              {(chat.type === 'group' ||
                                chat.type === 'supergroup' ||
                                chat.type === 'channel') && (
                                <>
                                  {chat.is_admin === true && (
                                    <div className="relative group">
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-yellow-600"
                                      >
                                        <path
                                          d="M5 16L3 21L12 18L21 21L19 16H5Z"
                                          fill="currentColor"
                                          stroke="currentColor"
                                          strokeWidth="1"
                                        />
                                        <path
                                          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                          fill="currentColor"
                                          stroke="currentColor"
                                          strokeWidth="1"
                                        />
                                      </svg>
                                    </div>
                                  )}
                                  {chat.is_admin === null && (
                                    <div
                                      className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
                                      title="Checking admin status..."
                                    />
                                  )}
                                </>
                              )}
                              {/* Rename button for groups/channels - only show if we can rename */}
                              {(chat.type === 'group' ||
                                chat.type === 'supergroup' ||
                                chat.type === 'channel') &&
                                (() => {
                                  const permission = renamePermissions[chat.id];

                                  // If we're still loading permissions, show a loading indicator
                                  if (!permission) {
                                    return (
                                      <div
                                        className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
                                        title="Checking rename permissions..."
                                      />
                                    );
                                  }

                                  // Show button if we can rename (true) or if it's unclear (null) for regular groups
                                  const canShow =
                                    permission.can_rename === true ||
                                    (permission.can_rename === null &&
                                      chat.type === 'group');

                                  if (!canShow) return null;

                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startRename(chat);
                                      }}
                                      className="retro-button px-2 py-1 text-xs text-black hover:bg-blue-200"
                                      style={{
                                        background:
                                          'linear-gradient(45deg, #e6f3ff, #cce7ff)',
                                      }}
                                      title={
                                        permission?.reason || 'Rename group'
                                      }
                                    >
                                      ✏️
                                    </button>
                                  );
                                })()}
                            </div>
                          )}
                          <div
                            className="text-xs"
                            style={{
                              fontFamily: 'Courier New, monospace',
                              color: '#666',
                            }}
                          >
                            {chat.type.toUpperCase()}
                            {chat.username && ` • @${chat.username}`}
                            {chat.is_admin === true &&
                              (chat.type === 'group' ||
                                chat.type === 'supergroup' ||
                                chat.type === 'channel') && (
                                <span className="text-yellow-600 font-bold">
                                  {' '}
                                  • ADMIN
                                </span>
                              )}
                            {chat.is_admin === null &&
                              (chat.type === 'group' ||
                                chat.type === 'supergroup' ||
                                chat.type === 'channel') && (
                                <span className="text-gray-500 font-bold">
                                  {' '}
                                  • CHECKING...
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="text-2xl"
                        style={{
                          fontFamily: 'Arial Black, sans-serif',
                        }}
                      >
                        {chat.type === 'user'
                          ? '👤'
                          : chat.type === 'group'
                          ? '👥'
                          : chat.type === 'channel'
                          ? '📢'
                          : '🏢'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            {selectedChats.length > 0 && (
              <div
                className="mt-6 p-4 retro-border"
                style={{
                  background: 'linear-gradient(45deg, #e6f3ff, #cce7ff)',
                }}
              >
                <p
                  className="text-sm font-bold mb-3"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  🚀 QUICK ACTIONS:
                </p>

                {/* Add to Existing List */}
                {groupLists.length > 0 && (
                  <div
                    className="mb-4 p-3 retro-border"
                    style={{
                      background: 'linear-gradient(45deg, #fff9e6, #ffe6cc)',
                    }}
                  >
                    <p
                      className="text-sm font-bold mb-2"
                      style={{
                        fontFamily: 'Arial Black, sans-serif',
                        color: '#000080',
                      }}
                    >
                      📋 ADD TO EXISTING LIST:
                    </p>
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedExistingList}
                        onChange={(e) =>
                          setSelectedExistingList(e.target.value)
                        }
                        className="retro-input flex-1 p-2 text-black text-sm"
                        style={{
                          fontFamily: 'Courier New, monospace',
                        }}
                      >
                        <option value="">Choose a list to add to...</option>
                        {groupLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name} ({list.groups.length} chats)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!selectedExistingList) {
                            setError('Please select a list to add to');
                            return;
                          }

                          const selectedChatObjects = chats.filter((chat) =>
                            selectedChats.includes(chat.id)
                          );
                          const newGroups = selectedChatObjects.map((chat) => ({
                            id: chat.id,
                            name: chat.name,
                            type: chat.type as 'user' | 'group',
                            identifier: chat.username
                              ? `@${chat.username}`
                              : chat.id,
                          }));

                          setGroupLists((prevLists) =>
                            prevLists.map((list) => {
                              if (list.id === selectedExistingList) {
                                // Filter out duplicates based on identifier
                                const existingIdentifiers = list.groups.map(
                                  (g) => g.identifier
                                );
                                const uniqueNewGroups = newGroups.filter(
                                  (g) =>
                                    !existingIdentifiers.includes(g.identifier)
                                );

                                if (uniqueNewGroups.length === 0) {
                                  setError(
                                    'All selected chats are already in this list'
                                  );
                                  return list;
                                }

                                setSuccess(
                                  `Added ${uniqueNewGroups.length} chat${
                                    uniqueNewGroups.length !== 1 ? 's' : ''
                                  } to "${list.name}"`
                                );
                                setSelectedChats([]);
                                setSelectedExistingList('');

                                return {
                                  ...list,
                                  groups: [...list.groups, ...uniqueNewGroups],
                                };
                              }
                              return list;
                            })
                          );
                        }}
                        disabled={!selectedExistingList || isAddingToList}
                        className="retro-button px-4 py-2 text-black text-sm"
                        style={{
                          background:
                            'linear-gradient(45deg, #99ff99, #66ff66)',
                          opacity:
                            !selectedExistingList || isAddingToList ? 0.5 : 1,
                        }}
                      >
                        {isAddingToList
                          ? '⏳ ADDING...'
                          : `➕ ADD ${selectedChats.length} CHAT${
                              selectedChats.length !== 1 ? 'S' : ''
                            }`}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="retro-button px-4 py-2 text-black text-sm"
                    style={{
                      background: 'linear-gradient(45deg, #99ff99, #66ff66)',
                    }}
                  >
                    ✉️ COMPOSE MESSAGE
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGroupList('');
                      setActiveTab('lists');
                    }}
                    className="retro-button px-4 py-2 text-black text-sm"
                    style={{
                      background: 'linear-gradient(45deg, #ffcc99, #ff9966)',
                    }}
                  >
                    📋 CREATE NEW LIST
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lists' && (
          <div className="retro-card p-6">
            <h2
              className="text-2xl font-bold mb-6"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: '#000080',
                textShadow: '2px 2px 0px #fff',
                textDecoration: 'underline',
              }}
            >
              📋 MANAGE GROUP LISTS 📋
            </h2>
            <GroupListManager
              groupLists={groupLists}
              setGroupLists={setGroupLists}
            />
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="retro-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#000080',
                  textShadow: '2px 2px 0px #fff',
                  textDecoration: 'underline',
                }}
              >
                📅 SCHEDULED MESSAGES 📅
              </h2>
              <button
                onClick={loadScheduledMessages}
                disabled={loadingScheduled}
                className="retro-button px-4 py-2 text-black text-sm"
              >
                {loadingScheduled ? '⏳ LOADING...' : '🔄 REFRESH'}
              </button>
            </div>

            {/* Scheduled messages UI would go here - keeping existing implementation for now */}
            <div className="text-center p-8">
              <p className="text-gray-600">
                Scheduled messages interface will be moved to a separate
                component next...
              </p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="retro-card p-6">
            <h2
              className="text-2xl font-bold mb-6"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: '#000080',
                textShadow: '2px 2px 0px #fff',
                textDecoration: 'underline',
              }}
            >
              🔒 PRIVACY & DATA STORAGE 🔒
            </h2>

            <div className="space-y-6">
              <div
                className="retro-border p-1"
                style={{
                  background: 'linear-gradient(135deg, #e6ffe6, #e6f3ff)',
                }}
              >
                <PrivacyNotice
                  onAccept={() => setSuccess('✅ Privacy notice acknowledged!')}
                  className=""
                />
              </div>

              <div
                className="retro-border p-4"
                style={{
                  background: 'linear-gradient(135deg, #fff9e6, #ffe6f3)',
                }}
              >
                <DataStorageViewer />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="retro-border p-4 text-center"
            style={{
              background: 'linear-gradient(45deg, #e6f3ff, #ffe6f3, #f3ffe6)',
            }}
          >
            <div
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: 'Impact, Arial Black, sans-serif',
                color: '#000080',
                textShadow: '2px 2px 0px #fff',
              }}
            >
              🚀 OPEN SOURCE PROJECT 🚀
            </div>
            <div
              className="text-sm font-bold mb-3"
              style={{
                fontFamily: 'Comic Sans MS, cursive',
                color: '#800080',
              }}
            >
              ⭐ Check out the source code and contribute! ⭐
            </div>
            <a
              href="https://github.com/0xEniotna/MessageHub"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button px-6 py-3 text-black font-bold inline-flex items-center gap-3"
              style={{
                background: 'linear-gradient(45deg, #ff99ff, #99ffff)',
                textDecoration: 'none',
                fontSize: '16px',
              }}
            >
              <span>💻</span>
              <span>VIEW ON GITHUB</span>
              <span>⭐</span>
            </a>
            <div
              className="text-xs mt-3"
              style={{
                fontFamily: 'Courier New, monospace',
                color: '#666666',
              }}
            >
              🌟 Star the repo if you find it useful! 🌟
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
