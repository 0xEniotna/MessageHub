'use client';

import { useState, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  User,
  Hash,
  Search,
  Download,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface GroupListManagerProps {
  groupLists: GroupList[];
  setGroupLists: (lists: GroupList[]) => void;
}

export default function GroupListManager({
  groupLists,
  setGroupLists,
}: GroupListManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIdentifier, setNewGroupIdentifier] = useState('');
  const [newGroupType, setNewGroupType] = useState<'user' | 'group'>('group');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const individualImportRef = useRef<HTMLInputElement>(null);

  // Add retro styling
  const retroStyles = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-2deg); }
      75% { transform: rotate(2deg); }
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
    .retro-button-red {
      background: linear-gradient(45deg, #ff4757, #ff6b83);
    }
    .retro-button-green {
      background: linear-gradient(45deg, #2ed573, #7bed9f);
    }
    .retro-button-blue {
      background: linear-gradient(45deg, #3742fa, #70a1ff);
    }
    .retro-input {
      border: 2px solid #000;
      background: #ffff99;
      font-family: 'Courier New', monospace;
      box-shadow: inset 2px 2px 4px rgba(0,0,0,0.3);
    }
    .retro-card {
      background: linear-gradient(135deg, #ff99cc, #99ccff);
      border: 3px solid #000;
      box-shadow: 5px 5px 0px #666;
    }
    .retro-list-card {
      background: linear-gradient(45deg, #99ff99, #ffff99);
      border: 3px solid #000;
      box-shadow: 4px 4px 0px #333;
    }
    .retro-group-item {
      background: linear-gradient(90deg, #ffcc99, #ccffcc);
      border: 2px solid #000;
      box-shadow: 2px 2px 0px #333;
    }
  `;

  const createNewList = () => {
    if (!newListName.trim()) {
      toast.error('🚨 PLEASE ENTER A LIST NAME! 🚨');
      return;
    }

    const newList: GroupList = {
      id: Date.now().toString(),
      name: newListName,
      groups: [],
      createdAt: new Date().toISOString(),
    };

    setGroupLists([...groupLists, newList]);
    setNewListName('');
    setIsCreating(false);
    toast.success('🎉 GROUP LIST CREATED! 🎉');
  };

  const deleteList = (listId: string) => {
    if (confirm('⚠️ ARE YOU SURE YOU WANT TO DELETE THIS GROUP LIST? ⚠️')) {
      setGroupLists(groupLists.filter((list) => list.id !== listId));
      toast.success('💥 GROUP LIST DELETED! 💥');
    }
  };

  const addGroupToList = (listId: string) => {
    if (!newGroupName.trim() || !newGroupIdentifier.trim()) {
      toast.error('🚨 PLEASE FILL IN ALL FIELDS! 🚨');
      return;
    }

    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName,
      type: newGroupType,
      identifier: newGroupIdentifier,
    };

    setGroupLists(
      groupLists.map((list) =>
        list.id === listId
          ? { ...list, groups: [...list.groups, newGroup] }
          : list
      )
    );

    setNewGroupName('');
    setNewGroupIdentifier('');
    toast.success('✅ GROUP ADDED! ✅');
  };

  const removeGroupFromList = (listId: string, groupId: string) => {
    setGroupLists(
      groupLists.map((list) =>
        list.id === listId
          ? {
              ...list,
              groups: list.groups.filter((group) => group.id !== groupId),
            }
          : list
      )
    );
    toast.success('🗑️ GROUP REMOVED! 🗑️');
  };

  const duplicateList = (list: GroupList) => {
    const duplicatedList: GroupList = {
      ...list,
      id: Date.now().toString(),
      name: `${list.name} (COPY)`,
      createdAt: new Date().toISOString(),
    };
    setGroupLists([...groupLists, duplicatedList]);
    toast.success('📋 GROUP LIST DUPLICATED! 📋');
  };

  const exportLists = () => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        lists: groupLists,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `messagehub-contact-lists-${
        new Date().toISOString().split('T')[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('💾 CONTACT LISTS EXPORTED SUCCESSFULLY! 💾');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ FAILED TO EXPORT CONTACT LISTS! ❌');
    }
  };

  const importLists = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast.error('🚨 PLEASE SELECT A JSON FILE! 🚨');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        // Validate the imported data structure
        if (!importData.lists || !Array.isArray(importData.lists)) {
          throw new Error('Invalid file format: missing lists array');
        }

        // Validate each list structure
        for (const list of importData.lists) {
          if (!list.id || !list.name || !Array.isArray(list.groups)) {
            throw new Error('Invalid list format: missing required fields');
          }

          // Validate each group in the list
          for (const group of list.groups) {
            if (!group.id || !group.name || !group.type || !group.identifier) {
              throw new Error('Invalid group format: missing required fields');
            }
            if (!['user', 'group'].includes(group.type)) {
              throw new Error('Invalid group type: must be "user" or "group"');
            }
          }
        }

        // Check for existing lists with same names
        const existingNames = groupLists.map((list) => list.name.toLowerCase());
        const importingNames = importData.lists.map((list: GroupList) =>
          list.name.toLowerCase()
        );
        const duplicates = importingNames.filter((name: string) =>
          existingNames.includes(name)
        );

        if (duplicates.length > 0) {
          const proceed = confirm(
            `⚠️ THE FOLLOWING LIST NAMES ALREADY EXIST: ${duplicates
              .join(', ')
              .toUpperCase()}\n\nIMPORTING WILL CREATE DUPLICATES WITH "(IMPORTED)" SUFFIX. CONTINUE? ⚠️`
          );
          if (!proceed) return;
        }

        // Process imported lists
        const processedLists = importData.lists.map((list: GroupList) => ({
          ...list,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new ID
          name: existingNames.includes(list.name.toLowerCase())
            ? `${list.name} (IMPORTED)`
            : list.name,
          createdAt: new Date().toISOString(), // Update creation date
          groups: list.groups.map((group) => ({
            ...group,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate new ID
          })),
        }));

        // Add imported lists to existing ones
        setGroupLists([...groupLists, ...processedLists]);

        toast.success(
          `🎉 SUCCESSFULLY IMPORTED ${processedLists.length} CONTACT LIST(S)! 🎉`
        );
      } catch (error) {
        console.error('Import error:', error);
        toast.error(
          `❌ FAILED TO IMPORT: ${
            error instanceof Error
              ? error.message.toUpperCase()
              : 'INVALID FILE FORMAT'
          } ❌`
        );
      }
    };

    reader.onerror = () => {
      toast.error('❌ FAILED TO READ FILE! ❌');
    };

    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Export individual list
  const exportSingleList = (list: GroupList) => {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        lists: [list], // Only export this one list
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;

      // Clean filename by removing special characters
      const cleanName = list.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      link.download = `messagehub-${cleanName}-${
        new Date().toISOString().split('T')[0]
      }.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `💾 "${list.name.toUpperCase()}" LIST EXPORTED SUCCESSFULLY! 💾`
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`❌ FAILED TO EXPORT "${list.name.toUpperCase()}" LIST! ❌`);
    }
  };

  // Import to specific list (merge contacts)
  const importToList = (
    event: React.ChangeEvent<HTMLInputElement>,
    targetListId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast.error('🚨 PLEASE SELECT A JSON FILE! 🚨');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        // Validate the imported data structure
        if (!importData.lists || !Array.isArray(importData.lists)) {
          throw new Error('Invalid file format: missing lists array');
        }

        // Get all groups from all imported lists
        const allImportedGroups: Group[] = [];
        for (const list of importData.lists) {
          if (!list.groups || !Array.isArray(list.groups)) {
            throw new Error('Invalid list format: missing groups array');
          }

          // Validate each group
          for (const group of list.groups) {
            if (!group.id || !group.name || !group.type || !group.identifier) {
              throw new Error('Invalid group format: missing required fields');
            }
            if (!['user', 'group'].includes(group.type)) {
              throw new Error('Invalid group type: must be "user" or "group"');
            }
          }

          allImportedGroups.push(...list.groups);
        }

        // Find target list and merge groups
        const updatedLists = groupLists.map((list: GroupList) => {
          if (list.id === targetListId) {
            // Filter out duplicates based on identifier
            const existingIdentifiers = list.groups.map(
              (g: Group) => g.identifier
            );
            const uniqueNewGroups = allImportedGroups
              .filter((g: Group) => !existingIdentifiers.includes(g.identifier))
              .map((group: Group) => ({
                ...group,
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substr(2, 9), // Generate new ID
              }));

            if (uniqueNewGroups.length === 0) {
              toast.error(
                '🚨 NO NEW CONTACTS TO IMPORT - ALL ALREADY EXIST! 🚨'
              );
              return list;
            }

            toast.success(
              `✅ IMPORTED ${
                uniqueNewGroups.length
              } CONTACT(S) TO "${list.name.toUpperCase()}"! ✅`
            );

            return {
              ...list,
              groups: [...list.groups, ...uniqueNewGroups],
            };
          }
          return list;
        });

        setGroupLists(updatedLists);
      } catch (error) {
        console.error('Import error:', error);
        toast.error(
          `❌ FAILED TO IMPORT: ${
            error instanceof Error
              ? error.message.toUpperCase()
              : 'INVALID FILE FORMAT'
          } ❌`
        );
      }
    };

    reader.onerror = () => {
      toast.error('❌ FAILED TO READ FILE! ❌');
    };

    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  return (
    <div>
      <style jsx>{retroStyles}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="retro-card p-6">
          <div className="flex justify-between items-center">
            <div>
              <div
                className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#000080',
                  textShadow: '2px 2px 0px #fff',
                }}
              >
                📋 CONTACT MANAGEMENT CENTER 📋
              </div>
              <div
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#800000',
                  fontWeight: 'bold',
                }}
              >
                🔥 ORGANIZE YOUR TELEGRAM UNIVERSE! 🔥
              </div>
            </div>
            <div className="flex space-x-2">
              {/* Import Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="retro-button retro-button-blue px-4 py-2 text-black text-sm"
                title="IMPORT CONTACT LISTS FROM JSON FILE"
              >
                📤 IMPORT
              </button>

              {/* Export Button */}
              <button
                onClick={exportLists}
                className="retro-button retro-button-green px-4 py-2 text-black text-sm"
                title="EXPORT CONTACT LISTS TO JSON FILE"
                disabled={groupLists.length === 0}
                style={{
                  opacity: groupLists.length === 0 ? 0.5 : 1,
                }}
              >
                💾 EXPORT
              </button>

              {/* New List Button */}
              <button
                onClick={() => setIsCreating(true)}
                className="retro-button px-4 py-2 text-black text-sm"
                style={{
                  animation: 'pulse 2s infinite',
                }}
              >
                ⭐ NEW LIST ⭐
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={importLists}
          style={{ display: 'none' }}
        />

        {/* Hidden file input for individual list import */}
        <input
          ref={individualImportRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            const targetListId = e.target.dataset.targetListId;
            if (targetListId) {
              importToList(e, targetListId);
            }
          }}
          style={{ display: 'none' }}
        />

        {/* Create New List Modal */}
        {isCreating && (
          <div className="retro-card p-6">
            <div
              className="text-xl font-bold mb-4"
              style={{
                fontFamily: 'Arial Black, sans-serif',
                color: '#000080',
                textDecoration: 'underline',
              }}
            >
              🆕 CREATE NEW GROUP LIST 🆕
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    color: '#000080',
                  }}
                >
                  📝 LIST NAME:
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., MARKETING TEAM, FRIENDS, etc."
                  className="retro-input w-full p-3 text-black"
                  style={{
                    fontFamily: 'Courier New, monospace',
                  }}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={createNewList}
                  className="retro-button retro-button-green px-6 py-3 text-black"
                >
                  ✅ CREATE LIST
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewListName('');
                  }}
                  className="retro-button retro-button-red px-6 py-3 text-black"
                >
                  ❌ CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help text for import/export */}
        {groupLists.length === 0 && !isCreating && (
          <div
            className="retro-card p-6"
            style={{
              background: 'linear-gradient(45deg, #99ffff, #ffff99)',
              animation: 'wiggle 3s ease-in-out infinite',
            }}
          >
            <div className="text-center">
              <div
                className="text-xl font-bold mb-3"
                style={{
                  fontFamily: 'Impact, sans-serif',
                  color: '#ff0000',
                  textShadow: '2px 2px 0px #000',
                }}
              >
                🚀 GETTING STARTED 🚀
              </div>
              <div
                className="text-sm font-bold"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#000080',
                }}
              >
                📋 CREATE NEW CONTACT LISTS MANUALLY OR IMPORT EXISTING ONES
                FROM A JSON FILE! 📋
                <br />
                💾 YOU CAN EXPORT YOUR LISTS AT ANY TIME TO BACK THEM UP OR
                SHARE WITH OTHERS! 💾
              </div>
            </div>
          </div>
        )}

        {/* Group Lists */}
        <div className="grid gap-6">
          {groupLists.length === 0 && !isCreating ? (
            <div className="retro-card p-12 text-center">
              <Users
                className="h-16 w-16 mx-auto mb-4"
                style={{
                  color: '#ff0000',
                  animation: 'pulse 2s infinite',
                }}
              />
              <div
                className="text-2xl font-bold mb-4"
                style={{
                  fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#000080',
                  textShadow: '2px 2px 0px #fff',
                }}
              >
                🚫 NO GROUP LISTS YET! 🚫
              </div>
              <div
                className="mb-6"
                style={{
                  fontFamily: 'Comic Sans MS, cursive',
                  color: '#800000',
                  fontWeight: 'bold',
                }}
              >
                🌟 CREATE YOUR FIRST GROUP LIST TO GET STARTED! 🌟
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="retro-button px-8 py-4 text-black text-lg"
                style={{
                  animation: 'pulse 2s infinite',
                }}
              >
                🎯 CREATE FIRST LIST 🎯
              </button>
            </div>
          ) : (
            groupLists.map((list) => (
              <div key={list.id} className="retro-list-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div
                      className="text-xl font-bold"
                      style={{
                        fontFamily: 'Arial Black, sans-serif',
                        color: '#000080',
                        textShadow: '1px 1px 0px #fff',
                      }}
                    >
                      📁 {list.name.toUpperCase()}
                    </div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        fontFamily: 'Courier New, monospace',
                        color: '#800000',
                      }}
                    >
                      👥 {list.groups.length} RECIPIENTS • 📅 CREATED{' '}
                      {new Date(list.createdAt)
                        .toLocaleDateString()
                        .toUpperCase()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => duplicateList(list)}
                      className="retro-button retro-button-blue px-3 py-2 text-black text-xs"
                      title="DUPLICATE LIST"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => exportSingleList(list)}
                      className="retro-button retro-button-green px-3 py-2 text-black text-xs"
                      title="EXPORT THIS LIST"
                    >
                      💾
                    </button>
                    <button
                      onClick={() => {
                        if (individualImportRef.current) {
                          individualImportRef.current.dataset.targetListId =
                            list.id;
                          individualImportRef.current.click();
                        }
                      }}
                      className="retro-button retro-button-blue px-3 py-2 text-black text-xs"
                      title="IMPORT TO THIS LIST"
                    >
                      📤
                    </button>
                    <button
                      onClick={() =>
                        setEditingList(editingList === list.id ? null : list.id)
                      }
                      className="retro-button retro-button-green px-3 py-2 text-black text-xs"
                      title="EDIT LIST"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteList(list.id)}
                      className="retro-button retro-button-red px-3 py-2 text-black text-xs"
                      title="DELETE LIST"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Groups in this list */}
                <div className="space-y-2 mb-4">
                  {list.groups.map((group) => (
                    <div
                      key={group.id}
                      className="retro-group-item p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        {group.type === 'user' ? (
                          <User className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Users className="h-5 w-5 text-green-600" />
                        )}
                        <div>
                          <div
                            className="font-bold"
                            style={{
                              fontFamily: 'Arial Black, sans-serif',
                              color: '#000080',
                            }}
                          >
                            {group.name.toUpperCase()}
                          </div>
                          <div
                            className="text-sm font-bold"
                            style={{
                              fontFamily: 'Courier New, monospace',
                              color: '#800000',
                            }}
                          >
                            {group.identifier}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeGroupFromList(list.id, group.id)}
                        className="retro-button retro-button-red px-2 py-1 text-black text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new group form */}
                {editingList === list.id && (
                  <div
                    className="retro-border p-4 mt-4"
                    style={{
                      background: 'linear-gradient(135deg, #ffcc99, #ccffff)',
                    }}
                  >
                    <div
                      className="font-bold mb-3"
                      style={{
                        fontFamily: 'Arial Black, sans-serif',
                        color: '#000080',
                      }}
                    >
                      ➕ ADD NEW RECIPIENT
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <select
                          value={newGroupType}
                          onChange={(e) =>
                            setNewGroupType(e.target.value as 'user' | 'group')
                          }
                          className="retro-input w-full p-2 text-black"
                          style={{
                            fontFamily: 'Courier New, monospace',
                          }}
                        >
                          <option value="group">📢 GROUP</option>
                          <option value="user">👤 USER</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="DISPLAY NAME"
                          className="retro-input w-full p-2 text-black"
                          style={{
                            fontFamily: 'Courier New, monospace',
                          }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newGroupIdentifier}
                          onChange={(e) =>
                            setNewGroupIdentifier(e.target.value)
                          }
                          placeholder="@USERNAME OR ID"
                          className="retro-input w-full p-2 text-black"
                          style={{
                            fontFamily: 'Courier New, monospace',
                          }}
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => addGroupToList(list.id)}
                          className="retro-button retro-button-green w-full px-4 py-2 text-black text-sm"
                        >
                          ➕ ADD
                        </button>
                      </div>
                    </div>
                    <div
                      className="mt-2 text-xs font-bold"
                      style={{
                        fontFamily: 'Courier New, monospace',
                        color: '#800000',
                      }}
                    >
                      📝 EXAMPLES: @USERNAME, 123456789, -1001234567890
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
