/**
 * OBD-II BLE reader via ELM327 adapters.
 *
 * Hardware flow:
 *   Car OBD-II port → ELM327 Bluetooth adapter → BLE → this module
 *
 * This module is a pure protocol implementation. It is decoupled from React
 * so it can be unit-tested. UI calls `ObdSession.connect()` then
 * `session.readAll()` and receives a typed `ObdSnapshot`.
 *
 * Adapter compatibility: any ELM327 clone that exposes a BLE UART service
 * (Nordic UART: TX 6e400002, RX 6e400003, service 6e400001).
 * Physical adapter compatibility must be verified in a native development build.
 *
 * Requires native react-native-ble-plx; unavailable hardware fails explicitly.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

import { createBleManager } from './ble-manager';

export type ObdFaultCode = {
  code: string;       // e.g. "P0300"
  description: string;
  severity: 'critical' | 'warning' | 'info';
};

export type ObdSnapshot = {
  vin: string | null;
  faultCodes: ObdFaultCode[];
  engineRpm: number | null;        // rpm
  vehicleSpeed: number | null;     // km/h
  coolantTemp: number | null;      // °C
  batteryVoltage: number | null;   // V
  fuelLevel: number | null;        // %
  throttlePosition: number | null; // %
  oilTemp: number | null;          // °C
  intakeAirTemp: number | null;    // °C
  engineLoad: number | null;       // %
  readinessMonitors: ReadinessMonitors;
  healthScore: number;             // 0-100 derived from DTCs + monitors
  simulationMode: boolean;
};

export type ReadinessMonitors = {
  misfire: boolean;
  fuelSystem: boolean;
  components: boolean;
  catalyst: boolean;
  heatedCatalyst: boolean;
  evap: boolean;
  secAirSystem: boolean;
  acRefrig: boolean;
  oxygenSensor: boolean;
  oxygenSensorHeater: boolean;
  egrSystem: boolean;
};

export type ObdConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'initialising'
  | 'ready'
  | 'reading'
  | 'disconnected'
  | 'error';

export type ObdProgressCallback = (state: ObdConnectionState, message: string) => void;

// ─── ELM327 AT command constants ──────────────────────────────────────────────

const AT = {
  RESET:         'ATZ',
  ECHO_OFF:      'ATE0',
  LINEFEED_OFF:  'ATL0',
  HEADERS_OFF:   'ATH0',
  SPACES_OFF:    'ATS0',
  AUTO_PROTOCOL: 'ATSP0',
  DESCRIBE_PROTO:'ATDP',
} as const;

// OBD-II Mode 01 PIDs (current data)
const PID = {
  ENGINE_LOAD:    '0104',
  COOLANT_TEMP:   '0105',
  FUEL_PRESSURE:  '010A',
  INTAKE_PRESSURE:'010B',
  ENGINE_RPM:     '010C',
  VEHICLE_SPEED:  '010D',
  INTAKE_TEMP:    '010F',
  THROTTLE_POS:   '0111',
  FUEL_LEVEL:     '012F',
  FUEL_TYPE:      '0151',
  OIL_TEMP:       '015C',
  READINESS:      '0101',
} as const;

// Mode 09 — vehicle info
const INFO_PID = {
  VIN: '0902',
  CALIBRATION_ID: '0904',
} as const;

// Mode 03 — stored DTCs
const DTC_MODE = '03';

// ─── Nordic UART BLE UUIDs (used by most ELM327 BLE adapters) ─────────────────

const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_TX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write → adapter
const BLE_RX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify → us

// ─── DTC database (subset — extend as needed) ─────────────────────────────────

const DTC_DB: Record<string, { description: string; severity: ObdFaultCode['severity'] }> = {
  P0100: { description: 'Mass Air Flow sensor circuit malfunction', severity: 'warning' },
  P0101: { description: 'Mass Air Flow sensor range/performance', severity: 'warning' },
  P0110: { description: 'Intake Air Temperature sensor circuit', severity: 'info' },
  P0115: { description: 'Engine Coolant Temperature sensor circuit', severity: 'warning' },
  P0120: { description: 'Throttle Position sensor circuit A', severity: 'warning' },
  P0130: { description: 'O2 Sensor Circuit (Bank 1, Sensor 1)', severity: 'info' },
  P0171: { description: 'System too lean (Bank 1)', severity: 'warning' },
  P0172: { description: 'System too rich (Bank 1)', severity: 'warning' },
  P0200: { description: 'Injector circuit malfunction', severity: 'critical' },
  P0300: { description: 'Random/multiple cylinder misfire detected', severity: 'critical' },
  P0301: { description: 'Cylinder 1 misfire detected', severity: 'critical' },
  P0302: { description: 'Cylinder 2 misfire detected', severity: 'critical' },
  P0303: { description: 'Cylinder 3 misfire detected', severity: 'critical' },
  P0304: { description: 'Cylinder 4 misfire detected', severity: 'critical' },
  P0340: { description: 'Camshaft position sensor circuit', severity: 'critical' },
  P0400: { description: 'EGR flow malfunction', severity: 'info' },
  P0420: { description: 'Catalyst system efficiency below threshold (Bank 1)', severity: 'warning' },
  P0430: { description: 'Catalyst system efficiency below threshold (Bank 2)', severity: 'warning' },
  P0440: { description: 'Evaporative emission system malfunction', severity: 'info' },
  P0442: { description: 'Evaporative emission system leak detected (small)', severity: 'info' },
  P0455: { description: 'Evaporative emission system leak detected (large)', severity: 'warning' },
  P0500: { description: 'Vehicle Speed Sensor malfunction', severity: 'warning' },
  P0600: { description: 'Serial communication link malfunction', severity: 'warning' },
  P0700: { description: 'Transmission control system malfunction', severity: 'critical' },
  P0720: { description: 'Output shaft speed sensor circuit', severity: 'warning' },
  B0001: { description: 'Frontal airbag deployment loop open', severity: 'critical' },
  C0035: { description: 'Right front wheel speed sensor circuit', severity: 'warning' },
  U0001: { description: 'High speed CAN communication bus fault', severity: 'critical' },
  U0100: { description: 'Lost communication with ECM/PCM', severity: 'critical' },
};

function lookupDtc(code: string): ObdFaultCode {
  const entry = DTC_DB[code];
  return entry
    ? { code, ...entry }
    : { code, description: 'Unknown fault code', severity: 'info' };
}

// ─── Hex parsing helpers ──────────────────────────────────────────────────────

function hexByte(raw: string, pos: number): number {
  return parseInt(raw.substring(pos * 2, pos * 2 + 2), 16);
}

function parseVinResponse(raw: string): string | null {
  // ELM327 returns VIN across multiple frames: "49 02 01 xx xx xx ..."
  const clean = raw.replace(/[\r\n\s]/g, '').replace(/49020[0-9]/g, '');
  if (clean.length < 34) return null;
  try {
    let vin = '';
    for (let i = 0; i < clean.length - 1; i += 2) {
      const c = parseInt(clean.substring(i, i + 2), 16);
      if (c >= 32 && c <= 127) vin += String.fromCharCode(c);
    }
    return vin.length === 17 ? vin : vin.substring(0, 17) || null;
  } catch {
    return null;
  }
}

function parseDtcResponse(raw: string): ObdFaultCode[] {
  // Mode 03 response: "43 xx xx xx xx ..."  — pairs of bytes = one DTC each
  const clean = raw.replace(/\s/g, '').replace(/^43/i, '').replace(/>$/, '');
  const codes: ObdFaultCode[] = [];
  for (let i = 0; i < clean.length - 3; i += 4) {
    const chunk = clean.substring(i, i + 4);
    if (!/^[0-9A-F]{4}$/i.test(chunk)) continue;
    const word = parseInt(chunk, 16);
    if (word === 0) continue;
    const type = (word >> 14) & 0x03;
    const prefix = ['P', 'C', 'B', 'U'][type];
    const digits = (word & 0x3FFF).toString(16).toUpperCase().padStart(4, '0');
    codes.push(lookupDtc(`${prefix}${digits}`));
  }
  return codes;
}

function parsePidA(raw: string, pid: string): number | null {
  // Single-frame response "41 xx AA" — value in byte A
  const pattern = `41${pid.slice(2)}`;
  const idx = raw.replace(/\s/g, '').indexOf(pattern);
  if (idx === -1) return null;
  const data = raw.replace(/\s/g, '').slice(idx + pattern.length);
  return /^[0-9A-F]{2}/i.test(data) ? parseInt(data.substring(0, 2), 16) : null;
}

function parsePidAB(raw: string, pid: string): number | null {
  // Two-byte value "41 xx AA BB"
  const pattern = `41${pid.slice(2)}`;
  const stripped = raw.replace(/\s/g, '');
  const idx = stripped.indexOf(pattern);
  if (idx === -1) return null;
  const data = stripped.slice(idx + pattern.length);
  if (!/^[0-9A-F]{4}/i.test(data)) return null;
  const a = parseInt(data.substring(0, 2), 16);
  const b = parseInt(data.substring(2, 4), 16);
  return (a * 256 + b) / 4; // RPM formula
}

function parseReadiness(raw: string): ReadinessMonitors {
  const stripped = raw.replace(/\s/g, '');
  const idx = stripped.indexOf('4101');
  if (idx === -1) return defaultReadiness();
  const b = hexByte(stripped.slice(idx + 4), 1);
  const c = hexByte(stripped.slice(idx + 4), 2);
  const d = hexByte(stripped.slice(idx + 4), 3);
  // Unsupported monitors are neutral; a supported, incomplete monitor fails.
  const complete = (supported: number, incomplete: number, bit: number) => !(supported & bit) || !(incomplete & bit);
  return {
    misfire:            complete(b, b >> 4, 0x01),
    fuelSystem:         complete(b, b >> 4, 0x02),
    components:         complete(b, b >> 4, 0x04),
    catalyst:           complete(c, d, 0x01),
    heatedCatalyst:     complete(c, d, 0x02),
    evap:               complete(c, d, 0x04),
    secAirSystem:       complete(c, d, 0x08),
    acRefrig:           complete(c, d, 0x10),
    oxygenSensor:       complete(c, d, 0x20),
    oxygenSensorHeater: complete(c, d, 0x40),
    egrSystem:          complete(c, d, 0x80),
  };
}

function defaultReadiness(): ReadinessMonitors {
  return {
    misfire: true, fuelSystem: true, components: true,
    catalyst: true, heatedCatalyst: false, evap: true,
    secAirSystem: false, acRefrig: false, oxygenSensor: true,
    oxygenSensorHeater: true, egrSystem: false,
  };
}

// ─── Health score algorithm ───────────────────────────────────────────────────

function deriveHealthScore(dtcs: ObdFaultCode[], monitors: ReadinessMonitors, battery: number | null): number {
  let score = 100;
  for (const dtc of dtcs) {
    if (dtc.severity === 'critical') score -= 18;
    else if (dtc.severity === 'warning') score -= 8;
    else score -= 3;
  }
  const monitorValues = Object.values(monitors);
  const failedMonitors = monitorValues.filter((v) => !v).length;
  score -= failedMonitors * 4;
  if (battery !== null) {
    if (battery < 11.5) score -= 20;
    else if (battery < 12.0) score -= 10;
    else if (battery < 12.4) score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

// ─── Simulation mode (no BLE hardware) ───────────────────────────────────────

function simulatedSnapshot(): ObdSnapshot {
  const dtcs: ObdFaultCode[] = [
    lookupDtc('P0420'),
  ];
  const monitors = defaultReadiness();
  const battery = 12.6;
  return {
    vin: null,
    faultCodes: dtcs,
    engineRpm: 820,
    vehicleSpeed: 0,
    coolantTemp: 88,
    batteryVoltage: battery,
    fuelLevel: 62,
    throttlePosition: 12,
    oilTemp: 95,
    intakeAirTemp: 32,
    engineLoad: 18,
    readinessMonitors: monitors,
    healthScore: deriveHealthScore(dtcs, monitors, battery),
    simulationMode: true,
  };
}

// ─── ObdSession ───────────────────────────────────────────────────────────────

export class ObdSession {
  private manager: import('react-native-ble-plx').BleManager | null = null;
  private device: import('react-native-ble-plx').Device | null = null;
  private monitor: { remove(): void } | null = null;
  private cancelScan: (() => void) | null = null;
  private rxBuffer = '';
  private resolveCommand: ((v: string) => void) | null = null;
  private rejectCommand: ((error: Error) => void) | null = null;
  private generation = 0;
  private reading = false;

  async connect(onProgress: ObdProgressCallback, timeoutMs = 15_000): Promise<boolean> {
    this.disconnect();
    const generation = this.generation;
    const manager = await createBleManager();
    if (generation !== this.generation) {
      await manager.destroy();
      throw new Error('Connection cancelled.');
    }
    this.manager = manager;
    try {
      onProgress('scanning', 'Scanning for OBD adapter...');
      const device = await new Promise<import('react-native-ble-plx').Device>((resolve, reject) => {
        let settled = false;
        const finish = (error?: Error, device?: import('react-native-ble-plx').Device) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          void manager.stopDeviceScan().catch(() => {});
          this.cancelScan = null;
          if (device) resolve(device);
          else reject(error ?? new Error('No compatible OBD adapter found.'));
        };
        const timer = setTimeout(() => finish(), timeoutMs);
        this.cancelScan = () => finish(new Error('Connection cancelled.'));
        void manager.startDeviceScan([BLE_SERVICE_UUID], null, (error, device) => {
          if (error) finish(error);
          else if (device) finish(undefined, device);
        }).catch((error) => finish(error));
      });
      onProgress('connecting', 'Connecting to OBD adapter...');
      const connected = await device.connect({ timeout: timeoutMs });
      if (generation !== this.generation) {
        await connected.cancelConnection().catch(() => {});
        throw new Error('Connection cancelled.');
      }
      this.device = connected;
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      if (generation !== this.generation) throw new Error('Connection cancelled.');
      this.device = discovered;
      this.monitor = discovered.monitorCharacteristicForService(BLE_SERVICE_UUID, BLE_RX_UUID, (error, characteristic) => {
        if (generation !== this.generation) return;
        if (error) { this.rejectCommand?.(error); return; }
        if (!characteristic?.value || !this.resolveCommand) return;
        try {
          this.rxBuffer += atob(characteristic.value);
          if (this.rxBuffer.length > 16384) throw new Error('Invalid OBD response size.');
          if (this.rxBuffer.includes('>')) this.resolveCommand(this.rxBuffer);
        } catch (error) {
          this.rejectCommand?.(error instanceof Error ? error : new Error('Invalid OBD response.'));
        }
      });
      onProgress('initialising', 'Initialising ELM327...');
      for (const command of [AT.RESET, AT.ECHO_OFF, AT.LINEFEED_OFF, AT.HEADERS_OFF, AT.SPACES_OFF, AT.AUTO_PROTOCOL]) {
        await this.sendCommand(command, discovered);
      }
      onProgress('ready', 'OBD adapter ready');
      return true;
    } catch (error) {
      if (generation === this.generation) this.disconnect();
      onProgress('error', 'Unable to connect to the OBD adapter.');
      throw error;
    }
  }

  private sendCommand(cmd: string, device: import('react-native-ble-plx').Device, timeoutMs = 3_000): Promise<string> {
    if (this.resolveCommand) return Promise.reject(new Error('An OBD command is already in progress.'));
    if (this.device !== device) return Promise.reject(new Error('OBD adapter is disconnected.'));
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.resolveCommand = null;
        this.rejectCommand = null;
        this.rxBuffer = '';
      };
      const fail = (error: Error) => {
        cleanup();
        reject(error);
        // A late response after timeout cannot be correlated safely.
        this.disconnect();
      };
      const timer = setTimeout(() => fail(new Error(`Timeout: ${cmd}`)), timeoutMs);
      this.rxBuffer = '';
      this.rejectCommand = fail;
      this.resolveCommand = (value) => { cleanup(); resolve(value); };
      void device.writeCharacteristicWithResponseForService(BLE_SERVICE_UUID, BLE_TX_UUID, btoa(`${cmd}\r`))
        .catch((error) => { if (this.rejectCommand === fail) fail(error); });
    });
  }

  /** Read all available OBD data and return a typed snapshot. */
  async readAll(onProgress: ObdProgressCallback): Promise<ObdSnapshot> {
    if (!this.device) throw new Error('Connect an OBD adapter before reading.');
    if (this.reading) throw new Error('An OBD scan is already in progress.');
    this.reading = true;
    try {
    const disc = this.device;

    onProgress('reading', 'Reading VIN…');
    const vinRaw = await this.sendCommand(INFO_PID.VIN, disc, 6_000).catch(() => '');
    const vin = parseVinResponse(vinRaw);

    onProgress('reading', 'Reading fault codes…');
    const dtcRaw = await this.sendCommand(DTC_MODE, disc, 5_000);
    if (!/^43[0-9A-F\s]*>\s*$/i.test(dtcRaw.trim())) throw new Error('The adapter did not return valid fault-code data.');
    const faultCodes = parseDtcResponse(dtcRaw);

    onProgress('reading', 'Reading live sensor data…');
    const [rpmRaw, speedRaw, coolRaw, throttleRaw, fuelRaw, oilRaw, intakeRaw, loadRaw, readyRaw] =
      await this.readPids(disc);
    if (!/4101[0-9A-F]{8}/i.test(readyRaw.replace(/\s/g, ''))) throw new Error('Readiness data is unavailable. Please retry the scan.');

    const coolantRaw2 = typeof coolRaw === 'string' ? coolRaw : '';
    const coolant = parsePidA(coolantRaw2, PID.COOLANT_TEMP);
    const oilTempRaw = typeof oilRaw === 'string' ? oilRaw : '';
    const oilT = parsePidA(oilTempRaw, PID.OIL_TEMP);

    // ELM327 voltage — send dedicated command
    const voltRaw = await this.sendCommand('ATRV', disc).catch(() => '');
    const batteryVoltage = parseFloat(voltRaw.replace(/[^0-9.]/g, '')) || null;

    const monitors = parseReadiness(typeof readyRaw === 'string' ? readyRaw : '');

    const snapshot: ObdSnapshot = {
      vin,
      faultCodes,
      engineRpm:       parsePidAB(typeof rpmRaw === 'string' ? rpmRaw : '', PID.ENGINE_RPM),
      vehicleSpeed:    parsePidA(typeof speedRaw === 'string' ? speedRaw : '', PID.VEHICLE_SPEED),
      coolantTemp:     coolant !== null ? coolant - 40 : null,
      batteryVoltage,
      fuelLevel:       parsePidA(typeof fuelRaw === 'string' ? fuelRaw : '', PID.FUEL_LEVEL) !== null
                         ? Math.round((parsePidA(typeof fuelRaw === 'string' ? fuelRaw : '', PID.FUEL_LEVEL)! * 100) / 255)
                         : null,
      throttlePosition: parsePidA(typeof throttleRaw === 'string' ? throttleRaw : '', PID.THROTTLE_POS) !== null
                         ? Math.round((parsePidA(typeof throttleRaw === 'string' ? throttleRaw : '', PID.THROTTLE_POS)! * 100) / 255)
                         : null,
      oilTemp:         oilT !== null ? oilT - 40 : null,
      intakeAirTemp:   parsePidA(typeof intakeRaw === 'string' ? intakeRaw : '', PID.INTAKE_TEMP) !== null
                         ? (parsePidA(typeof intakeRaw === 'string' ? intakeRaw : '', PID.INTAKE_TEMP)! - 40)
                         : null,
      engineLoad:      parsePidA(typeof loadRaw === 'string' ? loadRaw : '', PID.ENGINE_LOAD) !== null
                         ? Math.round((parsePidA(typeof loadRaw === 'string' ? loadRaw : '', PID.ENGINE_LOAD)! * 100) / 255)
                         : null,
      readinessMonitors: monitors,
      healthScore:     deriveHealthScore(faultCodes, monitors, batteryVoltage),
      simulationMode:  false,
    };

    onProgress('ready', 'OBD read complete');
    return snapshot;
    } finally {
      this.reading = false;
    }
  }

  private async readPids(device: import('react-native-ble-plx').Device): Promise<string[]> {
    const responses: string[] = [];
    for (const pid of [PID.ENGINE_RPM, PID.VEHICLE_SPEED, PID.COOLANT_TEMP, PID.THROTTLE_POS, PID.FUEL_LEVEL, PID.OIL_TEMP, PID.INTAKE_TEMP, PID.ENGINE_LOAD, PID.READINESS]) {
      responses.push(await this.sendCommand(pid, device));
    }
    return responses;
  }

  disconnect() {
    this.generation += 1;
    this.cancelScan?.();
    this.cancelScan = null;
    const reject = this.rejectCommand;
    this.rejectCommand = null;
    reject?.(new Error('OBD adapter disconnected.'));
    this.monitor?.remove();
    this.monitor = null;
    const manager = this.manager;
    this.manager = null;
    this.device = null;
    if (manager) void manager.destroy().catch(() => {});
  }
}

// ─── Convenience singleton for the onboarding screen ─────────────────────────

export let activeObdSession: ObdSession | null = null;

export function startObdSession(): ObdSession {
  if (activeObdSession) activeObdSession.disconnect();
  activeObdSession = new ObdSession();
  return activeObdSession;
}

export function endObdSession() {
  activeObdSession?.disconnect();
  activeObdSession = null;
}
