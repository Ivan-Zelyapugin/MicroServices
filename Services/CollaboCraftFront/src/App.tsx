import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './components/LoginAndRegister/Login';
import { Register } from './components/LoginAndRegister/Register';
import { DocumentList } from './components/ProfileAndDocument/DocumentList';
import { DocumentEditor } from './components/Editor/DocumentEditor';
import * as authApi from './api/auth';
import { 
  documentHub, blockHub, participantHub, 
  startDocumentHub, startBlockHub, startParticipantHub, 
  sendDocumentMessage, sendBlockMessage, sendParticipantMessage
} from './api/signalr';
import { LoginModel, RegisterModel, AuthResponse } from './models/auth';
import { UserProfile } from './components/ProfileAndDocument/UserProfile';

const startAllHubs = async () => {
  await Promise.all([
    startDocumentHub(),
    startBlockHub(),
    startParticipantHub()
  ]);
};

const stopAllHubs = async () => {
  await Promise.all([
    documentHub.connection.stop(),
    blockHub.connection.stop(),
    participantHub.connection.stop()
  ]);
};

const AppContent: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      setToken(savedToken);
      startAllHubs()
        .then(() => {
          documentHub.connection.on('DocumentCreated', (document) => console.log('DocumentCreated received:', document));
          participantHub.connection.on('AddedToDocument', (userIds) => console.log('AddedToDocument received:', userIds));
          blockHub.connection.on('ReceiveBlock', (block) => console.log('ReceiveBlock received:', block));
          blockHub.connection.on('BlockEdited', (block) => console.log('BlockEdited received:', block));
        })
        .catch(err => console.error('SignalR Start Error:', err));
    } else {
      stopAllHubs().catch(err => console.error('SignalR Stop Error:', err));
    }

    return () => {
      // Очистка всех подписок и остановка хабов при размонтировании
      documentHub.connection.off('DocumentCreated');
      participantHub.connection.off('AddedToDocument');
      blockHub.connection.off('ReceiveBlock');
      blockHub.connection.off('BlockEdited');
      stopAllHubs().catch(err => console.error('SignalR Stop Error:', err));
    };
  }, []);

  const handleLogin = async (loginModel: LoginModel) => {
    try {
      const response = await authApi.login(loginModel);
      const { accessToken, refreshToken } = response;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      await new Promise((r) => setTimeout(r, 1000));
      await startAllHubs();
      navigate('/document');
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (registerModel: RegisterModel) => {
    try {
      await authApi.register(registerModel);
      // токены появятся только после подтверждения email
    } catch (error) {
      throw error;
    }
  };

  // После подтверждения email
  const handleRegisterSuccess = async (authResponse: AuthResponse) => {
    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('refreshToken', authResponse.refreshToken);
    setToken(authResponse.accessToken);
    await startAllHubs();
    navigate('/document');
  };

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    await stopAllHubs();
    navigate('/login');
};

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route
          path="/login"
          element={!token ? (
            <div className="flex items-center justify-center h-screen">
              <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">CollaboCraft</h1>
                <Login onLogin={handleLogin} />
              </div>
            </div>
          ) : <Navigate to="/document" />}
        />
        <Route
          path="/register"
          element={!token ? (
            <div className="flex items-center justify-center h-screen">
              <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-center">CollaboCraft</h1>
                <Register
                  onRegisterSuccess={handleRegisterSuccess}
                  onRegister={handleRegister}
                />
              </div>
            </div>
          ) : <Navigate to="/document" />}
        />
        <Route
          path="/document"
          element={token ? <DocumentList onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/document/:documentId"
          element={token ? <DocumentEditor /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={token ? "/document" : "/login"} />} />
        <Route
          path="/profile"
          element={token ? <UserProfile /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
};


const App: React.FC = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
