import React, { useState } from 'react';
import './ChatDashboardButton.css';
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from 'react-router-dom';
import ChatDashboard from './ChatDashboard';

function ChatDashboardButton() {
  const [showDashboard, setShowDashboard] = useState(false);
  const { isAdmin, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const toggleDashboard = () => {
    if(isLoggedIn){
      if (isAdmin) {
        setShowDashboard(!showDashboard);
      } else {
        navigate('/chat'); // isAdmin이 false면 /chat 페이지로 이동
      }
    }else{
        alert("로그인이 필요한 서비스입니다.");
        navigate('/login');
    }
  };

  return (
    <>
      <button className="chat-dashboard-button" onClick={toggleDashboard}>
        <i className="bi bi-chat-dots"></i>
      </button>
      {showDashboard && <ChatDashboard onClose={() => setShowDashboard(false)} />}
    </>
  );
}

export default ChatDashboardButton;