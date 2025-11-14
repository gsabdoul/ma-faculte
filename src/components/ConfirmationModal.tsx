import { Modal } from './Modal';

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
    title,
    message,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    isDestructive = false,
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    const confirmButtonClass = isDestructive
        ? "bg-red-600 hover:bg-red-700"
        : "bg-blue-600 hover:bg-blue-700";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title ?? ''}>
            <div className="space-y-4">
                <p className="text-gray-600">{message ?? ''}</p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                {onConfirm && (
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                        {cancelText}
                    </button>
                )}
                <button type="button" onClick={handleConfirm} className={`text-white px-4 py-2 rounded-md ${onConfirm ? confirmButtonClass : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {onConfirm ? confirmText : "OK"}
                </button>
            </div>
        </Modal>
    );
};