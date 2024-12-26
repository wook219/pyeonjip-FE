import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import ChatMessage from './ChatMessage';
import ChatRoomList from './ChatRoomList';
import WaitingRoom from './WaitingRoom';
import ActiveChatRoom from './ActiveChatRoom';
import useWebSocket from './UseWebSocket';
import { getUserEmail, isLoggedIn } from '../../utils/authUtils';
import ChatDashboard from '../../components/Chat/ChatDashboard';
import { getUserRole } from '../../utils/authUtils';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Chat.css';

const ChatPage = () => {
  const [chatRoomId, setChatRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [category, setCategory] = useState('');
  const [chatRoomCategories, setChatRoomCategories] = useState({});
  const [showNoHistoryMessage, setShowNoHistoryMessage] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [showSetup, setShowSetup] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [chatRooms, setChatRooms] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isViewingChatRoom, setIsViewingChatRoom] = useState(false);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showChatDashboard, setShowChatDashboard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  const navigate = useNavigate();
  const isAdmin = useCallback(() => userRole === 'ADMIN', [userRole]);
  const location = useLocation();
  const contextMenuRef = useRef(null);
  const chatBodyRef = useRef(null);

  const categories = [
    { name: "주문/환불 문의", icon: "bi-cash-stack" },
    { name: "배송 문의", icon: "bi-truck" },
    { name: "파손 문의", icon: "bi-hammer" },
    { name: "기타 문의", icon: "bi-person-raised-hand" },
    { name: "이전 문의 내역", icon: "bi-hourglass-bottom" }
  ];

 

  const handleOpenChatDashboard = useCallback(() => {
    if (isAdmin()) {
      setShowChatDashboard(true);
    } else {
      navigate('/chat');
    }
  }, [isAdmin, navigate]);

  const handleCloseChatDashboard = useCallback(() => {
    setShowChatDashboard(false);
  }, []);

  const handleCategorySelect = async (selectedCategory) => {
    setCategory(selectedCategory);

    if (selectedCategory === '이전 문의 내역') {
      const userId = userEmail; // 실제 사용자 ID로 변경 필요
      try {
        const response = await fetch(`http://43.202.33.182:8080/api/chat/chat-room-list/${userId}`,{
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
        });
        const chatRoomsData = await response.json();
        const closedChatRooms = chatRoomsData.filter(room => room.status === 'CLOSED');
        setChatRooms(closedChatRooms);
        
        // 채팅방 ID와 카테고리를 매핑
        const categories = {};
        chatRoomsData.forEach(room => {
          categories[room.id] = room.category;
        }); 
        setChatRoomCategories(categories);

        setShowSetup(false);
        setChatRoomId(null);
        setSelectedRoomId(null);
        setMessages([]);
        
        if (chatRoomsData.length === 0) {
          setShowNoHistoryMessage(true);
        } else {
          setShowNoHistoryMessage(false);
        }
      } catch (error) {
        console.error('Error fetching chat room list:', error);
      }
    } else {
      try {
        setIsLoading(true);  // 로딩 상태 추가
        const response = await fetch('http://43.202.33.182:8080/api/chat/waiting-room', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access')}`
          },
          body: JSON.stringify({ category: selectedCategory }),
        });
        if (!response.ok) throw new Error('Failed to create waiting room');
        const data = await response.json();
        setCurrentRoom(data);
        setShowSetup(false);
        setIsViewingChatRoom(true);
      } catch (error) {
        alert('대기방 생성에 실패했습니다.');
      } finally {
        setIsLoading(false);  // 로딩 상태 해제
      }
    }
  };

  const handleMessageReceived = useCallback((message) => {
    setMessages((prevMessages) => {
      // 임시 메시지 찾기
      const tempIndex = prevMessages.findIndex(msg => 
        msg.isTemp && msg.text === message.message
      );
      
      if (tempIndex !== -1) {
        // 임시 메시지를 서버 응답으로 업데이트
        const updatedMessages = [...prevMessages];
        updatedMessages[tempIndex] = {
          ...message,
          id: message.id,
          text: message.message,
          sent: true,
          received: false,
          isTemp: false
        };
        return updatedMessages;
      } else {
        // 새로운 메시지 추가 (서버에서 시작된 메시지의 경우)
        return [...prevMessages, {
          id: message.id,
          text: message.message,
          sent: false,
          received: true,
          fromServer: true
        }];
      }
    });
  }, []);

  const handleMessageUpdated = useCallback((updatedMessage) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === updatedMessage.id ? { ...msg, text: updatedMessage.message } : msg
      )
    );
  }, []);

  const handleMessageDeleted = useCallback((deletedMessageId) => {
    setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== deletedMessageId));
  }, []);

  const { sendMessage, updateMessage, deleteMessage } = useWebSocket(
    chatRoomId,
    handleMessageReceived, 
    handleMessageUpdated, 
    handleMessageDeleted,
    userEmail  
  );

  
  const loadChatMessages = useCallback(async (roomId) => {
    try {
      const response = await fetch(`http://43.202.33.182:8080/api/chat/chat-message-history/${roomId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
      });
      if (!response.ok) throw new Error('Failed to load chat messages');
      const chatMessages = await response.json();
      const formattedMessages = chatMessages.map(msg => ({
        id: msg.id,
        text: msg.message,
        sent: msg.senderEmail === userEmail,
        received: msg.senderEmail !== userEmail,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(formattedMessages);
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, [userEmail]);

  const handleRoomSelect = useCallback(async (roomId) => {
    try {
      console.log('Selecting room:', roomId);
      const response = await fetch(`http://43.202.33.182:8080/api/chat/chat-room/${roomId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch chat room');
      const roomData = await response.json();
      setCurrentRoom(roomData);
      setChatRoomId(roomId);
      setCategory(roomData.category);
      setIsViewingChatRoom(true);
      await loadChatMessages(roomId);
      window.history.pushState(null, '', `/chat?chatRoomId=${roomId}`);
    } catch (error) {
      alert('채팅방 정보를 불러오는데 실패했습니다.');
    }
  }, [loadChatMessages]);

  

  const handleRoomActivated = useCallback((roomId) => {
    if (roomId) {
      setCurrentRoom(prevRoom => {
        if (prevRoom && prevRoom.id === roomId) return prevRoom;
        return { id: roomId, status: 'ACTIVE' };
      });
      setIsViewingChatRoom(true);
      setShowSetup(false);
      handleRoomSelect(roomId);
      setShowChatDashboard(false);
    } else {
      console.error('Invalid roomId received in handleRoomActivated');
    }
  }, [handleRoomSelect]);

  const handleHomeClick = () => {
    if (currentRoom && currentRoom.status === 'ACTIVE') {
      handleCloseChatRoom(currentRoom.id);
    } else {
      navigate('/');
    }
  };

  const handleCloseChatRoom = async (roomId) => {
    try {
      const response = await fetch(`http://43.202.33.182:8080/api/chat/close-room/${roomId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to close chat room');
      }
  
      // 채팅방 상태 업데이트
      setCurrentRoom(prev => ({...prev, status: 'CLOSED'}));
      // 메시지 초기화
      setMessages([]);
      // 홈으로 이동
      navigate('/');
    } catch (error) {
      alert('채팅방 종료에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
  
    const token = localStorage.getItem('access');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserEmail(decodedToken.email);
        setUserRole(decodedToken.role);
      } catch (error) {
        console.error('토큰 디코딩 에러:', error);
      }
    } else {
    }
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomId = params.get('chatRoomId');
    if (roomId) {
      setShowSetup(false);
      handleRoomSelect(roomId);
    } else {
      setShowSetup(true);
    }
  }, [location.search, handleRoomSelect]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  useEffect(() => {
    console.log('handleRoomActivated updated:', handleRoomActivated);
  }, [handleRoomActivated]);

  const handleBackToList = () => {
    setIsViewingChatRoom(false);
    setSelectedRoomId(null);
    setChatRoomId(null);
    setMessages([]);

    if (category === '이전 문의 내역') {
      window.location.href = '/chat';
    } else if(category !== '이전 문의 내역' && currentRoom.status === 'CLOSED'){
      setCategory('이전 문의 내역');
    } else {
      handleCloseChatRoom(currentRoom.id);
    }
  };

  const handleSendMessage = () => {
    const newMessage = messageInput.trim();
    if (newMessage !== "") {
      const tempMessage = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        sent: true,
        received: false,
        isTemp: true
      };
      
      // 임시 메시지를 messages 상태에 즉시 추가
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // WebSocket을 통해 메시지 전송
      sendMessage({
        chatRoomId: chatRoomId,
        message: newMessage,
        senderEmail: userEmail
      });
      
      setMessageInput("");
    }
  };

  const handleEditMessage = async (newMessage) => {
    if (selectedMessageId && newMessage.trim()) {
      try {
        await updateMessage(selectedMessageId, newMessage);
        setShowContextMenu(false);
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  };

  const handleDeleteMessage = async () => {
    if (selectedMessageId) {
      try {
        await deleteMessage(selectedMessageId);
        setShowContextMenu(false);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    const message = messages.find(msg => msg.id === messageId);
    if (message && message.sent) {
      setSelectedMessageId(messageId);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  const shouldShowInputContainer = () => {
    return isViewingChatRoom && currentRoom && currentRoom.status === 'ACTIVE';
  };

  useEffect(() => {
    console.log('Current state:', {
      category,
      showSetup,
      currentRoom,
      isViewingChatRoom
    });
  }, [category, showSetup, currentRoom, isViewingChatRoom]);

  useEffect(() => {
    if (currentRoom && currentRoom.status === 'ACTIVE') {
      setShowSetup(false);
      setIsViewingChatRoom(true);
      loadChatMessages(currentRoom.id);
    }
  }, [currentRoom, loadChatMessages]);

  return (
    <div className='chat-page-container'>
    {userRole === 'ADMIN' && (
      <button onClick={handleOpenChatDashboard}>채팅 대시보드 열기</button>
    )}
    {showChatDashboard && (
      <ChatDashboard 
        onClose={handleCloseChatDashboard} 
        onRoomActivated={handleRoomActivated}
      />
    )}
    {isLoading ? (
      <div>Loading...</div>
    ) : showSetup ? (
      <div className="chat-setup">
        <h2>문의 카테고리를 선택해주세요</h2>
        <div className="chat-category-buttons">
          {categories.map((cat, index) => (
            <button
              key={index}
              onClick={() => handleCategorySelect(cat.name)}
              className="chat-category-button"
            >
              <i className={`bi ${cat.icon}`}></i>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    ) : currentRoom || category === '이전 문의 내역' ? (
      <div className="chat-container">
        <div className="chat-header">
          <button className="chat-back-button" onClick={handleBackToList}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span>{category}</span>
          <button className="chat-home-button" onClick={handleHomeClick} aria-label="홈으로 이동">
            <i className="bi bi-house-fill"></i>
          </button>
        </div>

        <div className="chat-body" ref={chatBodyRef}>
          {!isViewingChatRoom && category === '이전 문의 내역' ? (
            <div className="chat-history-list">
              {chatRooms.map((room) => (
                <div key={room.id} className="chat-history-item" onClick={() => handleRoomSelect(room.id)}>
                  <div className="chat-history-category">{room.category}</div>
                  <div className="chat-history-date">{new Date(room.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {showNoHistoryMessage && <div className="no-history-message">이전 문의 내역이 없습니다.</div>}
            </div>
          ) : currentRoom && currentRoom.status === 'WAITING' ? (
            <WaitingRoom room={currentRoom} onRoomActivated={handleRoomActivated} />
          ) : (
            <ActiveChatRoom
              room={currentRoom}
              messages={messages}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onContextMenu={handleContextMenu}
            />
          )}
        </div>
          
          {shouldShowInputContainer() && (
            <div className="chat-input-container">
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage} 
                className="chat-send-button"
                aria-label="메시지 전송"
              >
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>Loading...</div>
      )}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="chat-context-menu"
          style={{
            position: 'fixed',
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
            background: 'white',
            border: '1px solid black',
            padding: '5px',
            zIndex: 1000,
          }}
        >
          <button onClick={() => {
            const newMessage = prompt('수정할 메시지를 입력하세요:');
            if (newMessage) handleEditMessage(newMessage);
          }}>
            메시지 수정
          </button>
          <button onClick={handleDeleteMessage}>메시지 삭제</button>
        </div>
      )}
    </div>
  );
};

export default ChatPage;