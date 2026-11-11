import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Flashlight, Keyboard } from 'lucide-react';
import * as React from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QrCameraScannerProps {
  scannerId: string;
  label: string;
  instructions: string;
  onScan: (rawToken: string) => void;
  isSubmitting?: boolean;
}

export function QrCameraScanner({
  scannerId,
  label,
  instructions,
  onScan,
  isSubmitting = false,
}: QrCameraScannerProps) {
  const [cameraActive, setCameraActive] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [manualToken, setManualToken] = React.useState('');
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  const stopCamera = React.useCallback(async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {
        // Ignore cleanup errors if stream already ended
      }
      try {
        instance.clear();
      } catch {
        // Ignore DOM cleanup errors
      }
    }
  }, []);

  React.useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const instance = new Html5Qrcode(scannerId);
      scannerRef.current = instance;
      setCameraActive(true);

      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void stopCamera().then(() => {
            onScan(decodedText);
          });
        },
        () => {
          // Ignore per-frame decode misses
        },
      );

      try {
        const capabilities = instance.getRunningTrackCameraCapabilities();
        if (capabilities.torchFeature().isSupported()) {
          setTorchSupported(true);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err) {
      setCameraActive(false);
      scannerRef.current = null;
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera permission denied or unavailable on this device.';
      setCameraError(
        `${msg} Use the approved manual QR code entry below to continue.`,
      );
    }
  };

  const toggleTorch = async () => {
    const instance = scannerRef.current;
    if (!instance || !torchSupported) return;
    try {
      const next = !torchOn;
      await instance.applyVideoConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualToken.trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm text-slate-700 font-medium">{instructions}</p>

        <div className="flex flex-wrap gap-2">
          {!cameraActive ? (
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => void startCamera()}
              disabled={isSubmitting}
            >
              <Camera className="h-5 w-5" />
              Start Camera Scanner
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void stopCamera()}
              >
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </Button>
              {torchSupported && (
                <Button
                  type="button"
                  variant={torchOn ? 'default' : 'outline'}
                  onClick={() => void toggleTorch()}
                >
                  <Flashlight className="h-4 w-4" />
                  {torchOn ? 'Flashlight On' : 'Flashlight Off'}
                </Button>
              )}
            </>
          )}
        </div>

        {cameraError && <Alert variant="warning">{cameraError}</Alert>}

        <div
          id={scannerId}
          className={
            cameraActive
              ? 'mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-teal-300 bg-black min-h-[260px]'
              : 'hidden'
          }
        />
      </div>

      <form
        onSubmit={handleManualSubmit}
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Keyboard className="h-4 w-4 text-teal-700" />
          <Label htmlFor={`${scannerId}-manual`}>{label} (Manual / USB Wedge Fallback)</Label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${scannerId}-manual`}
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste or type QR token (e.g. MT1:OUT:...)"
            className="font-mono"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="lg"
            disabled={!manualToken.trim() || isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Verify QR Token'}
          </Button>
        </div>
      </form>
    </div>
  );
}

