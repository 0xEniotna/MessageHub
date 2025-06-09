'use client';

import { useState } from 'react';
import { Send, Clock, Users, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

interface GroupList {
  id: string;
  name: string;
  groups: Array<{
    id: string;
    name: string;
    type: 'user' | 'group';
    identifier: string;
  }>;
}

interface MessageComposerProps {
  groupLists: GroupList[];
  selectedGroupList: string;
  setSelectedGroupList: (id: string) => void;
  onScheduleMessage: (message: {
    content: string;
    scheduledFor: string;
  }) => void;
}

export default function MessageComposer({
  groupLists,
  selectedGroupList,
  setSelectedGroupList,
  onScheduleMessage,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSending, setIsSending] = useState(false);

  const selectedList = groupLists.find((list) => list.id === selectedGroupList);

  const handleSendNow = async () => {
    if (!selectedGroupList) {
      toast.error('Please select a group list');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const selectedList = groupLists.find(
      (list) => list.id === selectedGroupList
    );
    if (!selectedList || selectedList.groups.length === 0) {
      toast.error('No recipients in selected group list');
      return;
    }

    setIsSending(true);
    try {
      // Convert frontend group format to backend format
      const recipients = selectedList.groups.map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        identifier: group.identifier,
      }));

      const result = await apiClient.sendMessage({
        recipients: recipients,
        message: message.trim(),
      });

      if (result.success) {
        const sentCount = result.sent_count || 0;
        const failedCount = result.failed_count || 0;

        if (sentCount > 0) {
          toast.success(
            `Message sent successfully! ${sentCount} sent${
              failedCount > 0 ? `, ${failedCount} failed` : ''
            }`
          );
        } else {
          toast.error('Failed to send to any recipients');
        }

        // Show detailed results if available
        if (result.results && result.results.length > 0) {
          const failedRecipients = result.results.filter(
            (r: any) => !r.success
          );
          if (failedRecipients.length > 0) {
            console.warn('Failed recipients:', failedRecipients);
          }
        }

        setMessage('');
      } else {
        toast.error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(`Failed to send message: ${error}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = () => {
    if (!selectedGroupList) {
      toast.error('Please select a group list');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select date and time');
      return;
    }

    const scheduledFor = `${scheduledDate}T${scheduledTime}`;
    onScheduleMessage({ content: message, scheduledFor });
    setMessage('');
    setScheduledDate('');
    setScheduledTime('');
    setIsScheduled(false);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <MessageSquare className="h-6 w-6 text-telegram-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Compose Message
          </h2>
        </div>

        {/* Group List Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Group List
          </label>
          <select
            value={selectedGroupList}
            onChange={(e) => setSelectedGroupList(e.target.value)}
            className="input-field"
          >
            <option value="">Choose a group list...</option>
            {groupLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.groups.length} recipients)
              </option>
            ))}
          </select>

          {selectedList && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>
                  {selectedList.groups.length} recipients:{' '}
                  {selectedList.groups
                    .slice(0, 3)
                    .map((g) => g.name)
                    .join(', ')}
                  {selectedList.groups.length > 3 &&
                    ` +${selectedList.groups.length - 3} more`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            rows={6}
            className="input-field resize-none"
          />
          <div className="mt-2 text-sm text-gray-500">
            {message.length} characters
          </div>
        </div>

        {/* Schedule Toggle */}
        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="h-4 w-4 text-telegram-600 focus:ring-telegram-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Schedule for later
            </span>
          </label>
        </div>

        {/* Schedule Inputs */}
        {isScheduled && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {isScheduled ? (
            <button
              onClick={handleSchedule}
              disabled={
                !selectedGroupList ||
                !message.trim() ||
                !scheduledDate ||
                !scheduledTime
              }
              className="bg-telegram-600 hover:bg-telegram-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Schedule Message</span>
            </button>
          ) : (
            <button
              onClick={handleSendNow}
              disabled={!selectedGroupList || !message.trim() || isSending}
              className="bg-telegram-600 hover:bg-telegram-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>Send Now</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              setMessage('');
              setScheduledDate('');
              setScheduledTime('');
              setIsScheduled(false);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Preview */}
      {message && selectedList && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">
              Will be sent to {selectedList.groups.length} recipients
            </div>
            <div className="bg-white rounded p-3 border">
              <div className="whitespace-pre-wrap text-gray-900">{message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
