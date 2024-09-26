// ModalContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface ModalState {
  [key: string]: boolean;
}

interface ModalContextType {
  modalStates: ModalState;
  setModalState: (modalName: string, value: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC = ({ children }) => {
  const [modalStates, setModalStates] = useState<ModalState>({});

  const setModalState = (modalName: string, value: boolean) => {
    setModalStates((prevState) => ({
      ...prevState,
      [modalName]: value,
    }));
  };

  return (
    <ModalContext.Provider value={{ modalStates, setModalState }}>
      {children}
    </ModalContext.Provider>
  );
};
