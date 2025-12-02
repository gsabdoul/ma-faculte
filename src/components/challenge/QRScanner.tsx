import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (code: string) => void;
    onError: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                setIsScanning(true);
                await scanner.start(
                    { facingMode: "environment" }, // Use back camera on mobile
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    (decodedText) => {
                        // Successfully scanned
                        onScan(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => {
                        // Scanning error (can be ignored, happens frequently)
                        console.log(errorMessage);
                    }
                );
            } catch (err: any) {
                console.error('Error starting scanner:', err);
                setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
                onError("Impossible d'accéder à la caméra");
                setIsScanning(false);
            }
        };

        const stopScanner = async () => {
            if (scanner.isScanning) {
                await scanner.stop();
            }
            setIsScanning(false);
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, [onScan, onError]);

    return (
        <div className="space-y-4">
            <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden"
                style={{ minHeight: '300px' }}
            />
            {cameraError && (
                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm">
                    {cameraError}
                </div>
            )}
            {isScanning && !cameraError && (
                <div className="text-center text-sm text-gray-500">
                    📷 Caméra active - Pointez vers le QR code
                </div>
            )}
        </div>
    );
}
