import { useState, useCallback } from 'react';

interface ModalInfo {
  title: string;
  message: string;
  onConfirm?: () => void;
  isDestructive?: boolean;
}

export const useModal = () => {
  const [modalState, setModalState] = useState<{ isOpen: boolean } & Partial<ModalInfo>>({
    isOpen: false,
  });

  const showModal = useCallback((info: ModalInfo) => {
    setModalState({ isOpen: true, ...info });
  }, []);

  const hideModal = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  return {
    modalProps: { ...modalState, onClose: hideModal },
    showModal,
    hideModal,
  };
};
