import React from 'react';
import { Modal } from './Modal';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "",
    message = "",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    isDestructive = false,
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    const confirmButtonClass = isDestructive
        ? "bg-red-600 hover:bg-red-700"
        : "bg-blue-600 hover:bg-blue-700";

    const Icon = isDestructive ? ExclamationTriangleIcon : InformationCircleIcon;
    const iconColor = isDestructive ? "text-red-500" : "text-blue-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex items-start space-x-4">
                <Icon className={`h-8 w-8 flex-shrink-0 ${iconColor}`} />
                <p className="text-gray-600 mt-1">{message}</p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-300">
                    {cancelText}
                </button>
                <button type="button" onClick={handleConfirm} className={`text-white font-bold px-4 py-2 rounded-lg ${confirmButtonClass}`}>
                    {confirmText}
                </button>
            </div>
        </Modal>
    );
};