import React, { useState, useEffect } from 'react';
import { useModal } from './ModalContext';
import { useAuth } from './authContext';
import { addChatMessage, onChatMessagesSnapshot } from './firebaseConfig';

const ChatModal: React.FC = () => {
  const { modalStates, setModalState } = useModal();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const authContext = useAuth();
  if (!authContext) return null;
  const { loggedInUsername, userGroup } = authContext;

  useEffect(() => {
    let unsubscribe: Function;
    if (userGroup) {
      unsubscribe = onChatMessagesSnapshot(userGroup, setMessages);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userGroup]);

  const handleSubmit = async () => {
    if (message.trim() !== '' && loggedInUsername && userGroup) {
      try {
        await addChatMessage(userGroup, message, loggedInUsername);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  return (
    <>
      {modalStates.chatModal && (
        <div style={{ position: 'fixed', top: '20%', right: '20%', backgroundColor: 'white', padding: '20px', border: '1px solid black', zIndex: 1000 }}>
          <div>
            <button onClick={() => setModalState('chatModal', false)}>Close</button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '10px 0' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                backgroundColor: msg.user === loggedInUsername ? 'lightblue' : 'lightgrey',
                textAlign: msg.user === loggedInUsername ? 'right' : 'left',
                margin: '5px 0',
                padding: '5px',
                borderBottom: '1px solid #ddd'
              }}>
                <div>{msg.text}</div>
                <small style={{ opacity: 0.6 }}>{msg.user}</small>
              </div>
            ))}
          </div>
          <div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '80%', marginRight: '5px' }}
            />
            <button onClick={handleSubmit}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatModal;
