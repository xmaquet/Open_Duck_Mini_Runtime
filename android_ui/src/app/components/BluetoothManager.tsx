import { useState, useEffect } from 'react';
import { Bluetooth, BluetoothConnected, Info, Wifi, Upload, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

interface BluetoothManagerProps {
  onConnectionChange: (connected: boolean, characteristic: BluetoothRemoteGATTCharacteristic | null) => void;
  logoUrl?: string;
  showTooltips?: boolean;
  onToggleTooltips?: () => void;
}

export function BluetoothManager({ onConnectionChange, logoUrl, showTooltips, onToggleTooltips }: BluetoothManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [customLogo, setCustomLogo] = useState<string>(logoUrl || '');

  useEffect(() => {
    const isSecureContext = window.isSecureContext;
    const hasBluetooth = 'bluetooth' in navigator;
    setIsBluetoothAvailable(hasBluetooth && isSecureContext);
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomLogo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const enableSimulationMode = () => {
    setSimulationMode(true);
    setIsConnected(true);
    setDeviceName('Mode Simulation');
    onConnectionChange(true, null);
  };

  const connectToBluetooth = async () => {
    if (!isBluetoothAvailable) {
      console.warn('Bluetooth not available - use simulation mode instead');
      return;
    }

    try {
      const device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access', 'generic_attribute', '12345678-1234-5678-1234-56789abcdef0']
      });

      if (!device.gatt) {
        console.error('GATT not available');
        return;
      }

      const server = await device.gatt.connect();
      setDeviceName(device.name || 'Unknown Device');
      
      const serviceUUID = '12345678-1234-5678-1234-56789abcdef0';
      let service;
      
      try {
        service = await server.getPrimaryService(serviceUUID);
      } catch (e) {
        console.error('Service not found, trying to list available services...');
        const services = await server.getPrimaryServices();
        console.log('Available services:', services);
        
        if (services.length > 0) {
          service = services[0];
          console.log('Using first available service:', service.uuid);
        } else {
          console.error('No Bluetooth services found on this device');
          return;
        }
      }
      
      const characteristicUUID = '12345678-1234-5678-1234-56789abcdef1';
      let characteristic;
      
      try {
        characteristic = await service.getCharacteristic(characteristicUUID);
      } catch (e) {
        const characteristics = await service.getCharacteristics();
        console.log('Available characteristics:', characteristics);
        
        if (characteristics.length > 0) {
          characteristic = characteristics[0];
          console.log('Using first available characteristic:', characteristic.uuid);
        } else {
          console.error('No characteristics found');
          return;
        }
      }
      
      setIsConnected(true);
      setSimulationMode(false);
      onConnectionChange(true, characteristic);
      
      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDeviceName('');
        setSimulationMode(false);
        onConnectionChange(false, null);
      });
      
    } catch (err: any) {
      if (err.name !== 'SecurityError') {
        console.error('Bluetooth error:', err.message);
      }
      
      setIsConnected(false);
      setSimulationMode(false);
      onConnectionChange(false, null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gray-900 border-b-2 border-gray-700">
      {/* Logo Section - Left */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden flex items-center justify-center group">
          {customLogo ? (
            <img 
              src={customLogo} 
              alt="Robot Logo" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">🤖</span>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-300">Robot Control</span>
          <span className="text-xs text-gray-500">Interface v1.0</span>
        </div>
      </div>

      {/* Connection Section - Center */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          {isConnected ? (
            simulationMode ? (
              <Wifi className="w-6 h-6 text-purple-400" />
            ) : (
              <BluetoothConnected className="w-6 h-6 text-blue-400" />
            )
          ) : (
            <Bluetooth className="w-6 h-6 text-gray-400" />
          )}
          
          {isBluetoothAvailable ? (
            <Button
              onClick={connectToBluetooth}
              disabled={isConnected}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
            >
              {isConnected ? 'Connecté' : 'Connecter Bluetooth'}
            </Button>
          ) : (
            <Button
              onClick={enableSimulationMode}
              disabled={isConnected}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700"
            >
              {isConnected ? 'Connecté (Simulation)' : 'Mode Simulation'}
            </Button>
          )}
        </div>
        
        {isConnected && deviceName && (
          <span className="text-xs text-green-400">
            {simulationMode ? '🔧 ' : '📡 '}{deviceName}
          </span>
        )}
      </div>

      {/* Status/Info Section - Right */}
      <div className="flex items-center gap-2">
        {/* Help Button */}
        <Button
          onClick={onToggleTooltips}
          variant="ghost"
          size="sm"
          className={`h-10 w-10 p-0 rounded-full ${showTooltips ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          title="Afficher/Masquer l'aide"
        >
          <HelpCircle className={`w-5 h-5 ${showTooltips ? 'text-white' : 'text-gray-300'}`} />
        </Button>
        
        {simulationMode && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-950/50 border border-purple-700 rounded-md">
            <Info className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-purple-300">Simulation</span>
          </div>
        )}
        
        {!isConnected && !isBluetoothAvailable && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-950/50 border border-blue-700 rounded-md">
            <Info className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-blue-300">BT non dispo</span>
          </div>
        )}
      </div>
    </div>
  );
}