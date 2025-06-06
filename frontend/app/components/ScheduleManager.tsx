'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ScheduledMessage {
  id: string;
  groupListId: string;
  message: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

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

interface ScheduleManagerProps {
  scheduledMessages: ScheduledMessage[];
  setScheduledMessages: (messages: ScheduledMessage[]) => void;
  groupLists: GroupList[];
}

export default function ScheduleManager({
  scheduledMessages,
  setScheduledMessages,
  groupLists,
}: ScheduleManagerProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>(
    'all'
  );

  const filteredMessages = scheduledMessages.filter((message) => {
    if (filter === 'all') return true;
    return message.status === filter;
  });

  const deleteMessage = (messageId: string) => {
    if (confirm('Are you sure you want to delete this scheduled message?')) {
      setScheduledMessages(
        scheduledMessages.filter((msg) => msg.id !== messageId)
      );
      toast.success('Scheduled message deleted');
    }
  };

  const executeMessage = async (messageId: string) => {
    const message = scheduledMessages.find((msg) => msg.id === messageId);
    if (!message) return;

    try {
      // Here you would integrate with your Python backend
      // For now, we'll simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setScheduledMessages(
        scheduledMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'sent' as const } : msg
        )
      );
      toast.success('Message sent successfully!');
    } catch (error) {
      setScheduledMessages(
        scheduledMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' as const } : msg
        )
      );
      toast.error('Failed to send message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Scheduled Messages
          </h2>
          <p className="text-gray-600">Manage your scheduled messages</p>
        </div>
        <div className="flex space-x-2">
          {(['all', 'pending', 'sent', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-telegram-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <span className="ml-1">
                  (
                  {
                    scheduledMessages.filter((msg) => msg.status === status)
                      .length
                  }
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? 'No scheduled messages'
                : `No ${filter} messages`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Schedule your first message from the Compose tab'
                : `No messages with ${filter} status found`}
            </p>
          </div>
        ) : (
          filteredMessages.map((message) => {
            const groupList = groupLists.find(
              (list) => list.id === message.groupListId
            );
            const scheduledDate = new Date(message.scheduledFor);
            const isOverdue =
              scheduledDate < new Date() && message.status === 'pending';

            return (
              <div key={message.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(message.status)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          message.status
                        )}`}
                      >
                        {message.status.toUpperCase()}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          Scheduled For
                        </div>
                        <div className="text-gray-900">
                          {format(scheduledDate, 'PPP')} at{' '}
                          {format(scheduledDate, 'p')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          Recipients
                        </div>
                        <div className="text-gray-900">
                          {groupList
                            ? `${groupList.name} (${groupList.groups.length} recipients)`
                            : 'Unknown list'}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Message
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {message.message.length > 200
                            ? `${message.message.substring(0, 200)}...`
                            : message.message}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {message.status === 'pending' && (
                      <button
                        onClick={() => executeMessage(message.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Send now"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 border-t pt-3">
                  Created {format(new Date(message.createdAt), 'PPp')}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stats */}
      {scheduledMessages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">
              {scheduledMessages.length}
            </div>
            <div className="text-sm text-gray-600">Total Messages</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {
                scheduledMessages.filter((msg) => msg.status === 'pending')
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {scheduledMessages.filter((msg) => msg.status === 'sent').length}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">
              {
                scheduledMessages.filter((msg) => msg.status === 'failed')
                  .length
              }
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      )}
    </div>
  );
}
