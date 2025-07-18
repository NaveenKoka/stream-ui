import React from "react";

interface ChatListProps {
  sessions: { id: string; title: string; messages: { content: string }[] }[];
  currentId: string;
  onSelect: (id: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ sessions, currentId, onSelect }) => (
  <div className="h-full w-full bg-white dark:bg-[#23232b] border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
    <div className="p-4 text-lg font-bold text-gray-900 dark:text-gray-100">Chats</div>
    <ul className="space-y-1">
      {sessions.map((s) => {
        const lastMsg = s.messages[s.messages.length - 1];
        return (
          <li
            key={s.id}
            className={`px-4 py-3 cursor-pointer rounded-lg transition-colors text-base font-medium
              ${currentId === s.id
                ? "bg-gray-200/60 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"}
            `}
            onClick={() => onSelect(s.id)}
          >
            <span className="truncate text-gray-900 dark:text-gray-100">{s.title}</span>
            <div className="text-xs text-gray-500 dark:text-gray-300 truncate">
              {lastMsg ? lastMsg.content : "No messages yet"}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

export default ChatList; 