'use client';

import { useState, useEffect, useRef } from 'react';
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
import GroupListManager from './components/GroupListManager';
import DataStorageViewer from './components/DataStorageViewer';
import PrivacyNotice from './components/PrivacyNotice';

interface Chat {
  id: string;
  name: string;
  type: 'user' | 'group' | 'channel' | 'supergroup';
  username?: string;
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

  // Auth form states
  const [credentials, setCredentials] = useState({
    api_id: '',
    api_hash: '',
    phone_number: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  // App states
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
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

  // Scheduled message states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState<
    ScheduledMessage[]
  >([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // New state for adding to existing lists
  const [selectedExistingList, setSelectedExistingList] = useState<string>('');
  const [isAddingToList, setIsAddingToList] = useState(false);

  // Ref for auto-focusing message textarea
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter chats based on search query
  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.username &&
        chat.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Load group lists from localStorage on component mount
  useEffect(() => {
    const loadGroupLists = () => {
      try {
        const savedLists = localStorage.getItem('telegram-group-lists');
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          // Validate the structure
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
        // Clear corrupted data
        localStorage.removeItem('telegram-group-lists');
      }
    };

    loadGroupLists();
  }, []);

  // Save group lists to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    // Don't save if this is the initial empty state
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
      console.log(
        '📋 Group lists:',
        groupLists.map((list) => ({
          name: list.name,
          groups: list.groups.length,
        }))
      );
    } catch (error) {
      console.error('❌ Error saving group lists to localStorage:', error);
      // Show user notification if save fails
      setError('Warning: Unable to save group lists to browser storage');
    }
  }, [groupLists]);

  // Debug function to check localStorage
  const debugLocalStorage = () => {
    try {
      const stored = localStorage.getItem('telegram-group-lists');
      console.log('🔍 Raw localStorage value:', stored);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🔍 Parsed localStorage value:', parsed);
        console.log(
          '🔍 Type:',
          typeof parsed,
          'Is Array:',
          Array.isArray(parsed)
        );
      }
      console.log('🔍 Current groupLists state:', groupLists);
    } catch (error) {
      console.error('🔍 Debug error:', error);
    }
  };

  // Cleanup image preview URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handlePastedImage(file);
          }
        }
      }
    };

    // Add paste listener to document
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedImages.length]); // Depend on selectedImages.length to check limits

  // Check auth status on load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto-focus message textarea when compose tab is active
  useEffect(() => {
    if (activeTab === 'compose' && messageTextareaRef.current) {
      const timer = setTimeout(() => {
        messageTextareaRef.current?.focus();
      }, 100); // Small delay to ensure DOM is ready

      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const checkAuthStatus = async () => {
    try {
      const status = await apiClient.checkAuthStatus();
      if (status.connected) {
        setIsAuthenticated(true);
        setStep('authenticated');
        loadChats();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

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
        setSuccess('Successfully connected!');
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
        setSuccess('Successfully authenticated!');
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

  const loadChats = async () => {
    try {
      const response = await apiClient.getChats();
      setChats(response.chats || []);
    } catch (error: any) {
      setError(error.message || 'Failed to load chats');
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
      loadScheduledMessages(); // Refresh the list
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
      loadScheduledMessages(); // Refresh the list
    } catch (error: any) {
      setError(error.message || 'Failed to delete message');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    let recipientChats: Chat[] = [];

    if (selectedGroupList) {
      // Use selected group list
      const groupList = groupLists.find(
        (list) => list.id === selectedGroupList
      );
      if (groupList) {
        recipientChats = groupList.groups.map((group) => ({
          id: group.identifier,
          name: group.name,
          type: group.type as 'user' | 'group' | 'channel' | 'supergroup',
          username: group.identifier.startsWith('@')
            ? group.identifier.slice(1)
            : undefined,
        }));
      }
    } else {
      // Use manually selected chats
      recipientChats = chats.filter((chat) => selectedChats.includes(chat.id));
    }

    if (recipientChats.length === 0) {
      setError('Please select chats or a group list');
      return;
    }

    if (!message.trim() && selectedImages.length === 0) {
      setError('Please enter a message or select images');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;

      if (selectedImages.length > 0) {
        // Send message with images using FormData
        const formData = new FormData();

        // Add recipients as JSON string
        formData.append(
          'recipients',
          JSON.stringify(
            recipientChats.map((chat) => ({
              id: chat.id,
              name: chat.name,
              type: chat.type,
              identifier: chat.id,
            }))
          )
        );

        // Add message text
        if (message.trim()) {
          formData.append('message', message.trim());
        }

        // Add scheduling if needed
        if (isScheduled && scheduledDate && scheduledTime) {
          formData.append(
            'schedule_for',
            `${scheduledDate}T${scheduledTime}:00`
          );
          // Add timezone offset in minutes (e.g., -300 for EST, 60 for CET)
          const timezoneOffset = new Date().getTimezoneOffset();
          formData.append('timezone_offset', timezoneOffset.toString());
        }

        // Add images
        selectedImages.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });

        response = await apiClient.sendMessageWithMedia(formData);
      } else {
        // Send text-only message using regular endpoint
        const requestData: any = {
          recipients: recipientChats.map((chat) => ({
            id: chat.id,
            name: chat.name,
            type: chat.type,
            identifier: chat.id,
          })),
          message: message.trim(),
        };

        // Add scheduling with timezone if needed
        if (isScheduled && scheduledDate && scheduledTime) {
          requestData.schedule_for = `${scheduledDate}T${scheduledTime}:00`;
          // Add timezone offset in minutes (e.g., -300 for EST, 60 for CET)
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

        // Clear form
        setMessage('');
        setSelectedImages([]);
        setImagePreviewUrls((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return [];
        });
        setSelectedChats([]);
        setSelectedGroupList('');
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');

        // If message was scheduled, refresh the scheduled messages list
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

  const loadGroupList = (listId: string) => {
    const list = groupLists.find((l) => l.id === listId);
    if (list) {
      // Convert groups back to chat IDs for selection
      const chatIds = list.groups.map((group) => {
        // Try to find matching chat by name or identifier
        const matchingChat = chats.find(
          (chat) =>
            chat.id === group.identifier ||
            chat.name === group.name ||
            (chat.username && `@${chat.username}` === group.identifier)
        );
        return matchingChat?.id || group.identifier;
      });

      setSelectedChats(chatIds);
      setSelectedGroupList(listId);
      setActiveTab('compose');
      setSuccess(`Loaded "${list.name}" with ${list.groups.length} chats`);
    }
  };

  const logout = () => {
    apiClient.clearSession();
    localStorage.removeItem('telegram-config'); // Clear stored credentials
    setIsAuthenticated(false);
    setStep('credentials');
    setChats([]);
    setSelectedChats([]);
    setMessage('');
    setCredentials({ api_id: '', api_hash: '', phone_number: '' });
  };

  const createGroupList = () => {
    if (!newListName.trim() || selectedChats.length === 0) {
      setError('Please enter a list name and select chats');
      return;
    }

    const newList: GroupList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      groups: selectedChats.map((id) => {
        const chat = chats.find((chat) => chat.id === id);
        return {
          id,
          name: chat?.name || '',
          type: chat?.type === 'user' ? 'user' : 'group',
          identifier: chat?.username ? `@${chat.username}` : chat?.id || id,
        };
      }),
      createdAt: new Date().toISOString(),
    };

    setGroupLists((prev) => [...prev, newList]);
    setNewListName('');
    setSelectedChats([]);
    setIsCreatingList(false);
    setSuccess(
      `Created group list "${newList.name}" with ${newList.groups.length} chats`
    );
  };

  const addToExistingList = () => {
    if (!selectedExistingList || selectedChats.length === 0) {
      setError('Please select a list and some chats');
      return;
    }

    const listToUpdate = groupLists.find(
      (list) => list.id === selectedExistingList
    );
    if (!listToUpdate) {
      setError('Selected list not found');
      return;
    }

    // Get the chats to add (avoid duplicates)
    const chatsToAdd: Group[] = selectedChats
      .map((chatId) => {
        const chat = chats.find((c) => c.id === chatId);
        return chat
          ? {
              id: chatId,
              name: chat.name,
              type:
                chat.type === 'user' ? 'user' : ('group' as 'user' | 'group'),
              identifier: chat.username ? `@${chat.username}` : chat.id,
            }
          : null;
      })
      .filter((group): group is Group => group !== null)
      .filter(
        (newGroup) =>
          !listToUpdate.groups.some(
            (existingGroup) =>
              existingGroup.id === newGroup.id ||
              existingGroup.identifier === newGroup.identifier
          )
      );

    if (chatsToAdd.length === 0) {
      setError('All selected chats are already in this list');
      return;
    }

    // Update the group list
    const updatedList = {
      ...listToUpdate,
      groups: [...listToUpdate.groups, ...chatsToAdd],
    };

    setGroupLists((prev) =>
      prev.map((list) =>
        list.id === selectedExistingList ? updatedList : list
      )
    );

    setSuccess(`Added ${chatsToAdd.length} chat(s) to "${listToUpdate.name}"`);
    setSelectedChats([]);
    setSelectedExistingList('');
    setIsAddingToList(false);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter((file) => file.type.startsWith('image/'));

    if (validImages.length !== files.length) {
      setError('Only image files are allowed');
      return;
    }

    // Limit to 10 images max
    if (selectedImages.length + validImages.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviewUrls = validImages.map((file) => URL.createObjectURL(file));

    setSelectedImages((prev) => [...prev, ...validImages]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    // Clear the input value to allow selecting the same file again
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    // Revoke the URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index]);

    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePastedImage = (file: File) => {
    // Check if we've reached the limit
    if (selectedImages.length >= 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    setSelectedImages((prev) => [...prev, file]);
    setImagePreviewUrls((prev) => [...prev, previewUrl]);

    setSuccess('Image pasted successfully!');
    // Clear success message after 2 seconds
    setTimeout(() => setSuccess(''), 2000);
  };

  // Credentials step
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
          @keyframes blink {
            0%,
            50% {
              opacity: 1;
            }
            51%,
            100% {
              opacity: 0;
            }
          }
          @keyframes bounce {
            0%,
            20%,
            50%,
            80%,
            100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
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
        `}</style>

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
              🎉 POWERED BY RETRO TECHNOLOGY 🎉
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
          @keyframes blink {
            0%,
            50% {
              opacity: 1;
            }
            51%,
            100% {
              opacity: 0;
            }
          }
          @keyframes bounce {
            0%,
            20%,
            50%,
            80%,
            100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
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
        `}</style>

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

  // Authenticated - Main app
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
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
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

            {/* Scrolling marquee text */}
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
              ✉️ COMPOSE YOUR MESSAGE ✉️
            </h2>

            <form onSubmit={handleSendMessage} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients
                </label>

                {/* Group List Selection */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Use Group List
                  </label>
                  <select
                    value={selectedGroupList}
                    onChange={(e) => {
                      setSelectedGroupList(e.target.value);
                      if (e.target.value) {
                        setSelectedChats([]); // Clear individual selections when using group list
                      }
                    }}
                    className="retro-input w-full p-2 text-black"
                  >
                    <option value="">Select a group list...</option>
                    {groupLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.groups.length} chats)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Show selected recipients */}
                {selectedGroupList ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">
                      Using group list:{' '}
                      {groupLists.find((l) => l.id === selectedGroupList)?.name}
                    </p>
                    <p className="text-sm text-blue-600">
                      {
                        groupLists.find((l) => l.id === selectedGroupList)
                          ?.groups.length
                      }{' '}
                      recipients
                    </p>
                  </div>
                ) : selectedChats.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedChats.map((chatId) => {
                      const chat = chats.find((c) => c.id === chatId);
                      return (
                        <span
                          key={chatId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-telegram-100 text-telegram-800"
                        >
                          {chat?.name || 'Unknown'}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No recipients selected. Choose a group list or go to "Select
                    Chats" tab.
                  </p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  📝 Message
                </label>
                <div className="relative">
                  <textarea
                    ref={messageTextareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="retro-input w-full p-3 text-black resize-none"
                    rows={4}
                    placeholder="✍️ Type your message here..."
                    style={{
                      fontFamily: 'Courier New, monospace',
                      fontSize: '14px',
                    }}
                  />
                  {/* Character counter */}
                  <div
                    className="absolute bottom-2 right-2 text-xs"
                    style={{
                      color: '#000080',
                      fontFamily: 'Courier New, monospace',
                      fontWeight: 'bold',
                      background: 'rgba(255,255,255,0.8)',
                      padding: '2px 4px',
                      border: '1px solid #000',
                    }}
                  >
                    {message.length} chars
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  📷 Images
                </label>

                {/* File Input */}
                <div className="mb-3">
                  <label
                    className="flex items-center justify-center w-full h-32 retro-border cursor-pointer transition-colors hover:opacity-90"
                    style={{
                      background: 'linear-gradient(45deg, #ffff99, #99ff99)',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-black" />
                      <p
                        className="mb-2 text-sm font-bold"
                        style={{
                          fontFamily: 'Arial Black, sans-serif',
                          color: '#000080',
                        }}
                      >
                        📤 UPLOAD IMAGES 📤
                      </p>
                      <p
                        className="text-xs font-bold"
                        style={{
                          fontFamily: 'Courier New, monospace',
                          color: '#800000',
                        }}
                      >
                        PNG, JPG, GIF up to 10 images • Paste support
                        (Ctrl/Cmd+V)
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Image Previews */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imagePreviewUrls[index]}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                          {(image.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedImages.length > 0 && (
                  <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
                    <span>{selectedImages.length} image(s) selected</span>
                    <button
                      type="button"
                      onClick={() => {
                        imagePreviewUrls.forEach((url) =>
                          URL.revokeObjectURL(url)
                        );
                        setSelectedImages([]);
                        setImagePreviewUrls([]);
                      }}
                      className="retro-button px-3 py-1 text-black text-sm"
                      style={{
                        background: 'linear-gradient(45deg, #ff9999, #ffcccc)',
                      }}
                    >
                      🗑️ REMOVE ALL
                    </button>
                  </div>
                )}
              </div>

              {/* Scheduled Message Section */}
              <div className="border-t pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="scheduled"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="h-4 w-4 text-telegram-600 focus:ring-telegram-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="scheduled"
                    className="ml-2 text-sm font-medium text-gray-700"
                  >
                    Schedule message for later
                  </label>
                </div>

                {isScheduled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    {selectedImages.length > 0 && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                        <div className="text-green-800 font-medium text-sm">
                          ✅ SCHEDULING WITH MEDIA IS NOW SUPPORTED!
                          <br />
                          <span className="text-green-600 text-xs">
                            Your {selectedImages.length} image(s) will be sent
                            at the scheduled time.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📅 Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-telegram-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ⏰ Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-telegram-500"
                        />
                      </div>
                    </div>
                    {scheduledDate && scheduledTime && (
                      <div className="text-sm space-y-1">
                        <div className="text-blue-600 font-medium">
                          📅 Message will be sent at:{' '}
                          {new Date(
                            `${scheduledDate}T${scheduledTime}`
                          ).toLocaleString()}{' '}
                          (your local time)
                        </div>
                        <div className="text-gray-500 text-xs">
                          🌍 Converted to server time (UTC):{' '}
                          {(() => {
                            // Parse as local time components
                            const [datePart, timePart] = [
                              `${scheduledDate}`,
                              `${scheduledTime}:00`,
                            ];
                            const [year, month, day] = datePart
                              .split('-')
                              .map(Number);
                            const [hour, minute, second] = timePart
                              .split(':')
                              .map(Number);

                            // Create local date
                            const localDate = new Date(
                              year,
                              month - 1,
                              day,
                              hour,
                              minute,
                              second
                            );

                            // Convert to UTC using timezone offset (same logic as backend)
                            const timezoneOffset =
                              new Date().getTimezoneOffset();
                            const utcDate = new Date(
                              localDate.getTime() + timezoneOffset * 60000
                            );

                            return (
                              utcDate
                                .toISOString()
                                .replace('T', ' ')
                                .slice(0, 19) + ' UTC'
                            );
                          })()}{' '}
                          (for internal storage)
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          ✅ Your message will be sent exactly at the time you
                          selected in your timezone!
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  (!selectedGroupList && selectedChats.length === 0) ||
                  (!message.trim() && selectedImages.length === 0)
                }
                className="retro-button w-full p-4 text-black text-lg"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  opacity:
                    loading ||
                    (!selectedGroupList && selectedChats.length === 0) ||
                    (!message.trim() && selectedImages.length === 0)
                      ? 0.5
                      : 1,
                }}
              >
                🚀{' '}
                {loading
                  ? '⏳ PROCESSING...'
                  : isScheduled
                  ? selectedImages.length > 0
                    ? `📅 SCHEDULE MESSAGE WITH ${selectedImages.length} IMAGE(S)`
                    : '📅 SCHEDULE MESSAGE'
                  : selectedImages.length > 0
                  ? `📤 SEND MESSAGE WITH ${selectedImages.length} IMAGE(S)`
                  : '📤 SEND MESSAGE'}{' '}
                🚀
              </button>
            </form>
          </div>
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

            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats by name or username..."
                  className="retro-input pl-10"
                />
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="retro-button px-3 py-1 text-black text-sm"
                    style={{
                      background: 'linear-gradient(45deg, #ffcc99, #fff999)',
                    }}
                  >
                    🗑️ CLEAR SEARCH
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-1">
                  Found {filteredChats.length} of {chats.length} chats
                </p>
              )}
            </div>

            {chats.length === 0 ? (
              <p className="text-gray-500">Loading chats...</p>
            ) : filteredChats.length === 0 && searchQuery ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">
                  No chats found for "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="retro-button px-3 py-2 text-black text-sm"
                  style={{
                    background: 'linear-gradient(45deg, #ffcc99, #fff999)',
                  }}
                >
                  🗑️ CLEAR SEARCH
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <label
                    key={chat.id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChats.includes(chat.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChats((prev) => [...prev, chat.id]);
                        } else {
                          setSelectedChats((prev) =>
                            prev.filter((id) => id !== chat.id)
                          );
                        }
                        // Clear group list selection when manually selecting chats
                        if (selectedGroupList) {
                          setSelectedGroupList('');
                        }
                      }}
                      className="h-4 w-4 text-telegram-600 focus:ring-telegram-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {searchQuery ? (
                          <span
                            dangerouslySetInnerHTML={{
                              __html: chat.name.replace(
                                new RegExp(`(${searchQuery})`, 'gi'),
                                '<mark class="bg-yellow-200">$1</mark>'
                              ),
                            }}
                          />
                        ) : (
                          chat.name
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {chat.type}
                        {chat.username && (
                          <>
                            {' • '}
                            {searchQuery ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: `@${chat.username}`.replace(
                                    new RegExp(`(${searchQuery})`, 'gi'),
                                    '<mark class="bg-yellow-200">$1</mark>'
                                  ),
                                }}
                              />
                            ) : (
                              `@${chat.username}`
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-sm text-gray-500">
                {searchQuery ? (
                  <>
                    {selectedChats.length} selected from {filteredChats.length}{' '}
                    filtered results
                  </>
                ) : (
                  <>
                    {selectedChats.length} of {chats.length} chats selected
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedChats([])}
                  className="retro-button px-3 py-2 text-black text-sm"
                >
                  🗑️ CLEAR ALL
                </button>
                <button
                  onClick={() =>
                    setSelectedChats(filteredChats.map((c) => c.id))
                  }
                  className="retro-button px-3 py-2 text-black text-sm"
                >
                  ✅ SELECT {searchQuery ? 'FILTERED' : 'ALL'}
                </button>
                {selectedChats.length > 0 && (
                  <>
                    <button
                      onClick={() => setIsAddingToList(true)}
                      className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      📝 ADD TO LIST
                    </button>
                    <button
                      onClick={() => setIsCreatingList(true)}
                      className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />➕ CREATE LIST
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Add to existing list modal */}
            {isAddingToList && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-900 mb-3">
                  Add to Existing Group List
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      Select Group List
                    </label>
                    <select
                      value={selectedExistingList}
                      onChange={(e) => setSelectedExistingList(e.target.value)}
                      className="retro-input w-full"
                    >
                      <option value="">Choose a list...</option>
                      {groupLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.groups.length} chats)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedExistingList && (
                    <div className="text-sm text-green-700">
                      <p className="font-medium">Selected chats to add:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedChats.map((chatId) => {
                          const chat = chats.find((c) => c.id === chatId);
                          return (
                            <span
                              key={chatId}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {chat?.name || 'Unknown'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={addToExistingList}
                      disabled={!selectedExistingList}
                      className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                      style={{
                        opacity: !selectedExistingList ? 0.5 : 1,
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      📝 ADD TO LIST
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingToList(false);
                        setSelectedExistingList('');
                      }}
                      className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(45deg, #ff9999, #ffcccc)',
                      }}
                    >
                      <X className="h-4 w-4" />❌ CANCEL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create new list modal */}
            {isCreatingList && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">
                  Create New Group List
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name..."
                    className="retro-input flex-1"
                  />
                  <button
                    onClick={createGroupList}
                    className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    💾 SAVE
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingList(false);
                      setNewListName('');
                    }}
                    className="retro-button px-3 py-2 text-black text-sm flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(45deg, #ff9999, #ffcccc)',
                    }}
                  >
                    <X className="h-4 w-4" />❌ CANCEL
                  </button>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {selectedChats.length} chats selected for this list
                </p>
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

            {loadingScheduled ? (
              <div className="text-center py-8">
                <div className="text-lg font-bold text-gray-600">
                  ⏳ Loading scheduled messages...
                </div>
              </div>
            ) : scheduledMessages.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="text-4xl mb-4"
                  style={{
                    fontFamily: 'Impact, sans-serif',
                    color: '#666',
                  }}
                >
                  📭
                </div>
                <div
                  className="text-xl font-bold mb-2"
                  style={{
                    fontFamily: 'Arial Black, sans-serif',
                    color: '#000080',
                  }}
                >
                  NO SCHEDULED MESSAGES
                </div>
                <div
                  className="text-sm"
                  style={{
                    fontFamily: 'Comic Sans MS, cursive',
                    color: '#666',
                  }}
                >
                  Schedule your first message from the Compose tab!
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledMessages.map((message) => {
                  const scheduledDate = new Date(message.scheduled_for);
                  const isOverdue =
                    scheduledDate < new Date() && message.status === 'pending';
                  const isPending = message.status === 'pending';

                  return (
                    <div
                      key={message.id}
                      className="retro-border p-4"
                      style={{
                        background: isPending
                          ? 'linear-gradient(135deg, #fff9e6, #e6f9ff)'
                          : message.status === 'sent'
                          ? 'linear-gradient(135deg, #e6ffe6, #f0fff0)'
                          : 'linear-gradient(135deg, #ffe6e6, #fff0f0)',
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 retro-border text-xs font-bold ${
                              message.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : message.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                            style={{
                              fontFamily: 'Courier New, monospace',
                            }}
                          >
                            {message.status.toUpperCase()}
                          </span>
                          {isOverdue && (
                            <span
                              className="px-3 py-1 retro-border text-xs font-bold bg-orange-100 text-orange-800"
                              style={{
                                fontFamily: 'Courier New, monospace',
                              }}
                            >
                              OVERDUE
                            </span>
                          )}
                        </div>

                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                executeScheduledMessage(message.id)
                              }
                              className="retro-button px-3 py-1 text-black text-xs"
                              style={{
                                background:
                                  'linear-gradient(45deg, #99ff99, #66ff66)',
                              }}
                            >
                              ▶️ SEND NOW
                            </button>
                            <button
                              onClick={() => deleteScheduledMessage(message.id)}
                              className="retro-button px-3 py-1 text-black text-xs"
                              style={{
                                background:
                                  'linear-gradient(45deg, #ff9999, #ff6666)',
                              }}
                            >
                              🗑️ DELETE
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <div
                            className="text-sm font-bold text-gray-700 mb-1"
                            style={{ fontFamily: 'Arial Black, sans-serif' }}
                          >
                            📅 Scheduled For:
                          </div>
                          <div
                            className="text-sm"
                            style={{ fontFamily: 'Courier New, monospace' }}
                          >
                            {scheduledDate.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div
                            className="text-sm font-bold text-gray-700 mb-1"
                            style={{ fontFamily: 'Arial Black, sans-serif' }}
                          >
                            👥 Recipients:
                          </div>
                          <div
                            className="text-sm"
                            style={{ fontFamily: 'Courier New, monospace' }}
                          >
                            {Array.isArray(message.recipients)
                              ? message.recipients.length
                              : 'Unknown'}{' '}
                            recipients
                          </div>
                        </div>
                      </div>

                      <div>
                        <div
                          className="text-sm font-bold text-gray-700 mb-1"
                          style={{ fontFamily: 'Arial Black, sans-serif' }}
                        >
                          📝 Message:
                        </div>
                        <div
                          className="text-sm bg-white p-2 retro-border"
                          style={{
                            fontFamily: 'Courier New, monospace',
                            maxHeight: '100px',
                            overflowY: 'auto',
                          }}
                        >
                          {message.message}
                        </div>
                      </div>

                      {message.executed_at && (
                        <div className="mt-3 text-xs text-gray-500">
                          <strong>Executed:</strong>{' '}
                          {new Date(message.executed_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* Footer with GitHub link */}
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
