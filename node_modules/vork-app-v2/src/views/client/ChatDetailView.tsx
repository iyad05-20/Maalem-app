
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, MoreVertical, Send, Image as ImageIcon, Smile, Phone, Plus, Mic, Check, CheckCheck, Info, UserCircle } from 'lucide-react';
import { Chat, Message } from '../../types';
import { db, auth } from '../../services/firebase.config';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { sanitizeFirestoreData } from '../../utils';

interface Props {
  chat: Chat;
  onBack: () => void;
  onOpenProfile?: (id: string) => void;
}

export const ChatDetailView: React.FC<Props> = ({ chat, onBack, onOpenProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine current user role in this chat
  const currentUserId = auth.currentUser?.uid;
  const isArtisan = currentUserId === chat.artisanId;
  const myRole = isArtisan ? 'artisan' : 'user';

  // Dynamic state for counterpart info (allows self-correction if data missing)
  const [dynamicUserName, setDynamicUserName] = useState(chat.userName);
  const [dynamicUserImage, setDynamicUserImage] = useState(chat.userImage);

  // Effect: If I am an Artisan and the user name is "Client" (generic) or missing, fetch the real profile.
  useEffect(() => {
    if (isArtisan && (!dynamicUserName || dynamicUserName === 'Client') && chat.userId) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", chat.userId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const realName = data.name || 'Client';
            const realImage = data.avatar || data.image || '';

            setDynamicUserName(realName);
            setDynamicUserImage(realImage);

            // Update Firestore so list view also gets fixed
            await updateDoc(doc(db, "chats", chat.id), {
              userName: realName,
              userImage: realImage
            });
          }
        } catch (e) {
          console.error("Error fetching user details for chat", e);
        }
      };
      fetchUser();
    } else {
      // Update local state if props change (e.g. from list view update)
      if (chat.userName && chat.userName !== dynamicUserName) setDynamicUserName(chat.userName);
      if (chat.userImage && chat.userImage !== dynamicUserImage) setDynamicUserImage(chat.userImage);
    }
  }, [chat.id, isArtisan, chat.userId, chat.userName, chat.userImage]);

  // Determine Display Name/Image of the COUNTERPART
  const counterpartName = isArtisan ? (dynamicUserName || 'Client') : chat.artisanName;
  const counterpartImage = isArtisan ? (dynamicUserImage || '') : chat.artisanImage;
  const counterpartId = isArtisan ? chat.userId : chat.artisanId;

  // Sync messages from Firestore sub-collection
  useEffect(() => {
    const messagesRef = collection(db, "chats", chat.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        ...sanitizeFirestoreData(doc.data()),
        id: doc.id
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageData = {
      text: inputText,
      sender: myRole, // Dynamic sender
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    };

    setInputText('');

    try {
      // 1. Add message to Firestore
      const msgRef = await addDoc(collection(db, "chats", chat.id, "messages"), messageData);

      // 2. Update parent chat doc for the list view
      await updateDoc(doc(db, "chats", chat.id), {
        lastMessage: inputText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0 // Resetting unread count might need more logic in real app (only if I read it)
      });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const isNextFromSameSender = (index: number) => {
    if (index === messages.length - 1) return false;
    return messages[index].sender === messages[index + 1].sender;
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#0a0a0c] flex flex-col animate-in slide-in-from-right duration-500">
      {/* Improved Header with Profile Link and Native Call */}
      <header className="px-4 pt-12 pb-4 flex items-center justify-between bg-[#0a0a0c]/90 backdrop-blur-xl z-20 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="p-2 text-white hover:bg-white/5 rounded-full transition-colors active:scale-90"><ChevronLeft size={24} /></button>

          <div
            onClick={() => onOpenProfile?.(counterpartId)}
            className="flex items-center gap-3 active:scale-95 transition-transform cursor-pointer hover:bg-white/5 p-1 rounded-2xl pr-3"
          >
            <div className="relative">
              <div className="size-10 rounded-full overflow-hidden border border-white/10 shadow-lg">
                <SmartAvatar src={counterpartImage} name={counterpartName} initialsClassName="text-[10px] font-black text-white" />
              </div>
              {chat.isOnline && <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0c]"></div>}
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">{counterpartName}</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                {chat.isOnline ? 'En ligne' : 'Inactif'}
                <span className="size-1 bg-slate-800 rounded-full"></span>
                Voir Profil
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Native Phone Link */}
          <a
            href={`tel:+221770000000`}
            className="p-2.5 text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors active:scale-90"
            title="Appeler"
          >
            <Phone size={20} />
          </a>

          {/* Profile Info Button */}
          <button
            onClick={() => onOpenProfile?.(counterpartId)}
            className="p-2.5 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors active:scale-90"
            title="Informations"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar pb-32 flex flex-col pt-6">
        {/* Thread Header Card */}
        <div
          onClick={() => onOpenProfile?.(counterpartId)}
          className="text-center py-10 flex flex-col items-center gap-4 cursor-pointer group"
        >
          <div className="size-20 rounded-[2rem] overflow-hidden border-4 border-white/5 shadow-2xl group-hover:scale-105 transition-transform duration-500">
            <SmartAvatar src={counterpartImage} name={counterpartName} initialsClassName="text-3xl font-black text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-black text-xl uppercase tracking-tighter">{counterpartName}</h3>
            <p className="text-[10px] text-purple-500/60 font-black uppercase tracking-[0.2em]">{isArtisan ? 'Client VORK' : 'Expert certifié VORK'}</p>
          </div>
          <button className="px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:bg-white/10 transition-colors">
            Ouvrir le profil complet
          </button>
        </div>

        {messages.map((msg, idx) => {
          const sameSender = isNextFromSameSender(idx);
          const isMe = msg.sender === myRole;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${sameSender ? 'mb-0.5' : 'mb-4'}`}>
              <div className={`group relative max-w-[85%] px-4 py-2.5 text-sm font-medium leading-relaxed transition-all active:scale-[0.98] ${isMe
                  ? `bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg ${sameSender ? 'rounded-2xl' : 'rounded-2xl rounded-tr-none'}`
                  : `bg-[#1a1a20] text-slate-200 border border-white/5 ${sameSender ? 'rounded-2xl' : 'rounded-2xl rounded-tl-none'}`
                }`}>
                {msg.text}
              </div>

              {!sameSender && (
                <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{formatTime(msg.timestamp)}</span>
                  {isMe && msg.status && (
                    <div className="flex items-center animate-in zoom-in duration-300">
                      {msg.status === 'read' ? <CheckCheck size={12} className="text-purple-400" /> : <Check size={12} className="text-slate-600" />}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Improved Input Area */}
      <div className="p-4 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c] to-transparent sticky bottom-0 z-30">
        <div className="flex items-center gap-2">
          <button className="size-11 shrink-0 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 active:scale-90"><Plus size={20} /></button>

          <div className="flex-1 bg-[#121214] rounded-[2rem] border border-white/10 flex items-center gap-2 px-2 py-1.5 shadow-2xl focus-within:border-purple-500/30 transition-all">
            <button className="size-10 shrink-0 flex items-center justify-center text-slate-500 hover:text-purple-400 transition-colors"><Smile size={22} /></button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className="flex-1 bg-transparent text-sm text-white focus:outline-none py-2 min-w-0 placeholder:text-slate-700"
            />

            {inputText.trim() ? (
              <button
                onClick={handleSend}
                className="size-10 shrink-0 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30 active:scale-90 transition-all animate-in zoom-in duration-200"
              >
                <Send size={18} />
              </button>
            ) : (
              <div className="flex items-center">
                <button className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><ImageIcon size={20} /></button>
                <button className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Mic size={20} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
