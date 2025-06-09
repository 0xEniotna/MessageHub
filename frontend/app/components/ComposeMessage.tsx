'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';

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

interface ComposeMessageProps {
  chats: Chat[];
  groupLists: GroupList[];
  selectedChats: string[];
  setSelectedChats: (chats: string[]) => void;
  selectedGroupList: string;
  setSelectedGroupList: (listId: string) => void;
  onSendMessage: (data: any) => void;
  loading: boolean;
}

export default function ComposeMessage({
  chats,
  groupLists,
  selectedChats,
  setSelectedChats,
  selectedGroupList,
  setSelectedGroupList,
  onSendMessage,
  loading,
}: ComposeMessageProps) {
  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus message textarea
  useEffect(() => {
    if (messageTextareaRef.current) {
      const timer = setTimeout(() => {
        messageTextareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup image preview URLs
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

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedImages.length]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validImages = files.filter((file) => file.type.startsWith('image/'));

    if (validImages.length !== files.length) {
      alert('Only image files are allowed');
      return;
    }

    if (selectedImages.length + validImages.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    const newPreviewUrls = validImages.map((file) => URL.createObjectURL(file));

    setSelectedImages((prev) => [...prev, ...validImages]);
    setImagePreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    event.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePastedImage = (file: File) => {
    if (selectedImages.length >= 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImages((prev) => [...prev, file]);
    setImagePreviewUrls((prev) => [...prev, previewUrl]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    let recipientChats: Chat[] = [];

    if (selectedGroupList) {
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
      recipientChats = chats.filter((chat) => selectedChats.includes(chat.id));
    }

    if (recipientChats.length === 0) {
      alert('Please select chats or a group list');
      return;
    }

    if (!message.trim() && selectedImages.length === 0) {
      alert('Please enter a message or select images');
      return;
    }

    const data = {
      recipientChats,
      message: message.trim(),
      selectedImages,
      isScheduled,
      scheduledDate,
      scheduledTime,
    };

    onSendMessage(data);

    // Clear form after successful send
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
  };

  return (
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
                  setSelectedChats([]);
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
                  groupLists.find((l) => l.id === selectedGroupList)?.groups
                    .length
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
                  PNG, JPG, GIF up to 10 images • Paste support (Ctrl/Cmd+V)
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
                  imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
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
                      Your {selectedImages.length} image(s) will be sent at the
                      scheduled time.
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

                      const localDate = new Date(
                        year,
                        month - 1,
                        day,
                        hour,
                        minute,
                        second
                      );

                      const timezoneOffset = new Date().getTimezoneOffset();
                      const utcDate = new Date(
                        localDate.getTime() + timezoneOffset * 60000
                      );

                      return (
                        utcDate.toISOString().replace('T', ' ').slice(0, 19) +
                        ' UTC'
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
          className="retro-button w-full p-4 text-black text-lg font-bold border-4 border-black bg-gradient-to-r from-yellow-300 to-green-300 hover:from-yellow-400 hover:to-green-400 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
          style={{
            fontFamily: 'Impact, Arial Black, sans-serif',
            textShadow: '1px 1px 0px #fff',
          }}
        >
          {loading ? (
            <>
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
              ⏳ PROCESSING... ⏳
            </>
          ) : isScheduled ? (
            selectedImages.length > 0 ? (
              `🚀 📅 SCHEDULE MESSAGE WITH ${selectedImages.length} IMAGE${
                selectedImages.length > 1 ? 'S' : ''
              } 📅 🚀`
            ) : (
              '🚀 📅 SCHEDULE MESSAGE 📅 🚀'
            )
          ) : selectedImages.length > 0 ? (
            `🚀 📤 SEND MESSAGE WITH ${selectedImages.length} IMAGE${
              selectedImages.length > 1 ? 'S' : ''
            } 📤 🚀`
          ) : (
            '🚀 📤 SEND MESSAGE 📤 🚀'
          )}
        </button>
      </form>
    </div>
  );
}
