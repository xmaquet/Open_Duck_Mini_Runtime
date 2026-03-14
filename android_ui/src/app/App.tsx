import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { VirtualJoystick } from './components/VirtualJoystick';
import { ButtonPad } from './components/ButtonPad';
import { DPad } from './components/DPad';
import { Triggers } from './components/Triggers';
import { BluetoothManager } from './components/BluetoothManager';
import { VideoFeed } from './components/VideoFeed';
import { LogViewer } from './components/LogViewer';
import { ControlTooltip } from './components/ControlTooltip';
import tooltipsConfig from '../config/tooltips.json';
import type { LogLevel, UiControllerState } from '../transport/types';
import { uiToControllerFrame } from '../transport/convert';
import { AndroidBleTransport } from '../transport/androidBleTransport';
import { MockTransport } from '../transport/mockTransport';
import type { Transport } from '../transport/transport';
import { Capacitor } from '@capacitor/core';

interface LogEntry {
  timestamp: string;
  message: string;
  type: LogLevel;
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showTooltips, setShowTooltips] = useState(false);
  const [controllerState, setControllerState] = useState<UiControllerState>({
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    buttons: {
      A: false,
      B: false,
      X: false,
      Y: false,
      LB: false,
      RB: false,
      Start: false,
      Select: false,
    },
    dpad: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    triggers: {
      LT: 0,
      RT: 0,
    },
  });
  
  const stateRef = useRef(controllerState);
  stateRef.current = controllerState;

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLogs(prev => [...prev, { timestamp, message, type }]);
  }, []);

  const canUseNativeBle = Capacitor.isNativePlatform();

  const transport: Transport = useMemo(() => {
    return canUseNativeBle ? new AndroidBleTransport() : new MockTransport();
  }, [canUseNativeBle]);

  useEffect(() => {
    transport.setListener((event) => {
      if (event.type === 'status') {
        setIsConnected(event.status.connected);
      } else if (event.type === 'log') {
        addLog(event.log.message, event.log.level);
      }
    });
    return () => transport.setListener(null);
  }, [transport, addLog]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (!connected) addLog('Connexion terminée', 'warning');
  }, [addLog]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const handleLeftStickMove = useCallback((x: number, y: number) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        leftStick: { x, y },
      };
      return newState;
    });
  }, []);

  const handleRightStickMove = useCallback((x: number, y: number) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        rightStick: { x, y },
      };
      return newState;
    });
  }, []);

  const handleButtonPress = useCallback((button: string, pressed: boolean) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        buttons: {
          ...prev.buttons,
          [button]: pressed,
        },
      };
      return newState;
    });
  }, []);

  const handleDirectionPress = useCallback((direction: string, pressed: boolean) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        dpad: {
          ...prev.dpad,
          [direction]: pressed,
        },
      };
      return newState;
    });
  }, []);

  const handleTriggerChange = useCallback((trigger: string, value: number) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        triggers: {
          ...prev.triggers,
          [trigger]: value,
        },
      };
      return newState;
    });
  }, []);

  const handleBumperPress = useCallback((bumper: string, pressed: boolean) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        buttons: {
          ...prev.buttons,
          [bumper]: pressed,
        },
      };
      return newState;
    });
  }, []);

  const handleSystemButton = useCallback((button: 'Start' | 'Select', pressed: boolean) => {
    setControllerState(prev => {
      const newState = {
        ...prev,
        buttons: {
          ...prev.buttons,
          [button]: pressed,
        },
      };
      return newState;
    });
  }, []);

  // Envoi à fréquence fixe (alignement runtime: command_freq=20 Hz).
  // Important BLE: éviter d’envoyer à chaque micro-mouvement.
  useEffect(() => {
    let seq = 0;
    const interval = setInterval(() => {
      if (!transport.getStatus().connected) return;
      const frame = uiToControllerFrame(stateRef.current, seq++);
      transport.send(frame).catch((err) => {
        addLog(`Erreur transport: ${err instanceof Error ? err.message : String(err)}`, 'error');
      });
    }, 50);
    return () => clearInterval(interval);
  }, [transport, addLog]);

  useEffect(() => {
    if (isConnected && transport.getStatus().mode === 'simulation') {
      const interval = setInterval(() => {
        const messages = [
          'Système moteur opérationnel',
          'Capteurs gyroscope OK',
          'Batterie: 87%',
          'Position stable détectée',
          'Calibration des servos...',
        ];
        const types: LogEntry['type'][] = ['info', 'success', 'info', 'success', 'warning'];
        const randomIndex = Math.floor(Math.random() * messages.length);
        addLog(messages[randomIndex], types[randomIndex]);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, transport, addLog]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col">
      {/* Header with Logo and Bluetooth Connection */}
      <BluetoothManager 
        onConnectionChange={handleConnectionChange}
        showTooltips={showTooltips}
        onToggleTooltips={() => setShowTooltips(!showTooltips)}
        canUseNativeBle={canUseNativeBle}
        onConnectNativeBle={() => transport.connect()}
        onDisconnectNativeBle={() => transport.disconnect()}
      />
      
      {/* Main Layout - Landscape optimized for tablet */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 p-2 sm:p-3 md:p-4">
        {/* Left Controls */}
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 md:w-1/4">
          <ControlTooltip
            label={tooltipsConfig.controls.bumpers.label}
            description={tooltipsConfig.controls.bumpers.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.bumpers.position as any}
          >
            <div />
          </ControlTooltip>
          
          <ControlTooltip
            label={tooltipsConfig.controls.triggers.label}
            description={tooltipsConfig.controls.triggers.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.triggers.position as any}
          >
            <Triggers 
              onTriggerChange={handleTriggerChange}
              onBumperPress={handleBumperPress}
            />
          </ControlTooltip>
          
          <ControlTooltip
            label={tooltipsConfig.controls.dpad.label}
            description={tooltipsConfig.controls.dpad.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.dpad.position as any}
          >
            <DPad onDirectionPress={handleDirectionPress} />
          </ControlTooltip>
          
          <ControlTooltip
            label={tooltipsConfig.controls.leftStick.label}
            description={tooltipsConfig.controls.leftStick.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.leftStick.position as any}
          >
            <VirtualJoystick 
              onMove={handleLeftStickMove}
              label="L"
            />
          </ControlTooltip>
        </div>

        {/* Center - Video and Logs */}
        <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-[300px] md:min-h-0">
          <div className="flex-1 min-h-[150px] sm:min-h-[180px] md:min-h-[200px]">
            <VideoFeed isConnected={isConnected} />
          </div>
          
          <div className="flex-1 min-h-[150px] sm:min-h-[180px] md:min-h-[200px]">
            <LogViewer logs={logs} onClearLogs={handleClearLogs} />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 md:w-1/4">
          <ControlTooltip
            label={tooltipsConfig.controls.systemButtons.label}
            description={tooltipsConfig.controls.systemButtons.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.systemButtons.position as any}
          >
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-md active:scale-95 transition-transform touch-none select-none text-xs"
                onMouseDown={() => handleSystemButton('Select', true)}
                onMouseUp={() => handleSystemButton('Select', false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleSystemButton('Select', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSystemButton('Select', false);
                }}
              >
                SELECT
              </button>
              
              <button
                className="px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-md active:scale-95 transition-transform touch-none select-none text-xs"
                onMouseDown={() => handleSystemButton('Start', true)}
                onMouseUp={() => handleSystemButton('Start', false)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleSystemButton('Start', true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSystemButton('Start', false);
                }}
              >
                START
              </button>
            </div>
          </ControlTooltip>
          
          <ControlTooltip
            label={tooltipsConfig.controls.buttons.label}
            description={tooltipsConfig.controls.buttons.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.buttons.position as any}
          >
            <ButtonPad onButtonPress={handleButtonPress} />
          </ControlTooltip>
          
          <ControlTooltip
            label={tooltipsConfig.controls.rightStick.label}
            description={tooltipsConfig.controls.rightStick.description}
            visible={showTooltips}
            position={tooltipsConfig.controls.rightStick.position as any}
          >
            <VirtualJoystick 
              onMove={handleRightStickMove}
              label="R"
            />
          </ControlTooltip>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="hidden sm:block fixed bottom-2 right-2 sm:bottom-4 sm:right-4 max-w-[200px] sm:max-w-xs p-2 sm:p-3 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 text-[10px] sm:text-xs">
        <div className="font-mono text-gray-400">
          <div>L: ({controllerState.leftStick.x.toFixed(2)}, {controllerState.leftStick.y.toFixed(2)})</div>
          <div>R: ({controllerState.rightStick.x.toFixed(2)}, {controllerState.rightStick.y.toFixed(2)})</div>
          <div>LT: {controllerState.triggers.LT.toFixed(2)} | RT: {controllerState.triggers.RT.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}