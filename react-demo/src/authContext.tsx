import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
  loggedInUsername: string | null;
  setLoggedInUsername: (username: string | null) => void;
  userGroup: string;
  setUserGroup: (group: string) => void;
  isResearcher: boolean;
  setIsResearcher: (group: boolean) => void;
  researcher: string;
  setResearcher: (group: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialState?: {
    username?: string | null;
    group?: string | null;
    researcher?: string | null;
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialState }) => {
  const [loggedInUsername, setLoggedInUsernameState] = useState<string | null>(initialState?.username || null);
  const [userGroup, setUserGroupState] = useState<string>(initialState?.group || 'dev');
  const [isResearcher, setIsResearcherState] = useState<boolean>(false);
  const [researcher, setResearcherState] = useState<string>(initialState?.researcher || 'r');

  const setLoggedInUsername = (username: string | null) => {
    localStorage.setItem('loggedInUsername', username || '');
    setLoggedInUsernameState(username);
  };

  const setUserGroup = (group: string) => {
    localStorage.setItem('userGroup', group);
    setUserGroupState(group);
  };

  const setIsResearcher = (isResearcher: boolean) => {
    localStorage.setItem('isResearcher', String(isResearcher));
    setIsResearcherState(isResearcher);
  };

  const setResearcher = (researcher: string) => {
    localStorage.setItem('researcher', researcher);
    setResearcherState(researcher);
  };

  return (
    <AuthContext.Provider value={{ loggedInUsername, setLoggedInUsername, userGroup, setUserGroup, isResearcher, setIsResearcher, researcher, setResearcher }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
