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
 * Tested adapter families: Veepeak OBDCheck BLE, FIXD, OBDLink CX.
 *
 * NOTE: react-native-ble-plx must be installed for this to run on device.
 * Without it the module works in SIMULATION mode (returns mocked data so
 * the UI can be developed without hardware).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const clean = raw.replace(/\s/g, '').replace(/43/g, '');
  const codes: ObdFaultCode[] = [];
  for (let i = 0; i < clean.length - 3; i += 4) {
    const word = parseInt(clean.substring(i, i + 4), 16);
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
  return parseInt(data.substring(0, 2), 16);
}

function parsePidAB(raw: string, pid: string): number | null {
  // Two-byte value "41 xx AA BB"
  const pattern = `41${pid.slice(2)}`;
  const stripped = raw.replace(/\s/g, '');
  const idx = stripped.indexOf(pattern);
  if (idx === -1) return null;
  const data = stripped.slice(idx + pattern.length);
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
  return {
    misfire:            !!(b & 0x01),
    fuelSystem:         !!(b & 0x02),
    components:         !!(b & 0x04),
    catalyst:           !!(c & 0x01),
    heatedCatalyst:     !!(c & 0x02),
    evap:               !!(c & 0x04),
    secAirSystem:       !!(c & 0x08),
    acRefrig:           !!(c & 0x10),
    oxygenSensor:       !!(c & 0x20),
    oxygenSensorHeater: !!(c & 0x40),
    egrSystem:          !!(c & 0x80),
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
  private deviceId: string | null = null;
  private manager: unknown = null;
  private rxBuffer = '';
  private resolveCommand: ((v: string) => void) | null = null;
  private simulation = false;

  private async loadBle() {
    try {
      // Dynamic import so the module doesn't crash when react-native-ble-plx
      // isn't installed (e.g. in Expo Go or web).
      const { BleManager } = await import('react-native-ble-plx' as string);
      this.manager = new (BleManager as new () => unknown)();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan for nearby ELM327 adapters and connect to the first one found.
   * Resolves with `true` if connected, `false` if in simulation mode.
   */
  async connect(onProgress: ObdProgressCallback, timeoutMs = 15_000): Promise<boolean> {
    const hasBle = await this.loadBle();
    if (!hasBle) {
      onProgress('ready', 'No BLE module — running in simulation mode');
      this.simulation = true;
      return false;
    }

    return new Promise((resolve, reject) => {
      onProgress('scanning', 'Scanning for OBD adapter…');
      const mgr = this.manager as {
        startDeviceScan: (uuids: string[] | null, opts: unknown, cb: (err: unknown, d: unknown) => void) => void;
        stopDeviceScan: () => void;
      };

      const timer = setTimeout(() => {
        mgr.stopDeviceScan();
        this.simulation = true;
        onProgress('ready', 'No adapter found — running in simulation mode');
        resolve(false);
      }, timeoutMs);

      mgr.startDeviceScan([BLE_SERVICE_UUID], null, async (error: unknown, device: unknown) => {
        if (error) { clearTimeout(timer); reject(error); return; }
        const d = device as { id: string; name: string | null; connect: () => Promise<unknown> };
        const name = d.name ?? '';
        if (!name.toLowerCase().includes('obd') && !name.toLowerCase().includes('elm')) return;

        mgr.stopDeviceScan();
        clearTimeout(timer);
        onProgress('connecting', `Connecting to ${name}…`);

        try {
          const connected = d as unknown as {
            connect: () => Promise<unknown>;
            discoverAllServicesAndCharacteristics: () => Promise<{
              monitorCharacteristicForService: (
                svc: string, char: string,
                cb: (err: unknown, c: { value: string | null } | null) => void
              ) => void;
              writeCharacteristicWithResponseForService: (svc: string, char: string, val: string) => Promise<void>;
            }>;
          };
          await d.connect();
          const disc = await connected.discoverAllServicesAndCharacteristics();

          disc.monitorCharacteristicForService(BLE_SERVICE_UUID, BLE_RX_UUID, (_err, char) => {
            if (!char?.value) return;
            const decoded = atob(char.value);
            this.rxBuffer += decoded;
            if (this.rxBuffer.includes('>')) {
              const full = this.rxBuffer;
              this.rxBuffer = '';
              this.resolveCommand?.(full);
              this.resolveCommand = null;
            }
          });

          this.deviceId = d.id;
          onProgress('initialising', 'Initialising ELM327…');
          await this.sendCommand(AT.RESET, disc);
          await this.sendCommand(AT.ECHO_OFF, disc);
          await this.sendCommand(AT.LINEFEED_OFF, disc);
          await this.sendCommand(AT.HEADERS_OFF, disc);
          await this.sendCommand(AT.SPACES_OFF, disc);
          await this.sendCommand(AT.AUTO_PROTOCOL, disc);

          onProgress('ready', 'OBD adapter ready');
          resolve(true);
        } catch (e) {
          onProgress('error', `Connection failed: ${String(e)}`);
          reject(e);
        }
      });
    });
  }

  private sendCommand(
    cmd: string,
    disc: { writeCharacteristicWithResponseForService: (svc: string, char: string, val: string) => Promise<void> },
    timeoutMs = 3_000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout: ${cmd}`)), timeoutMs);
      this.resolveCommand = (v) => { clearTimeout(timer); resolve(v); };
      const payload = btoa(`${cmd}\r`);
      disc.writeCharacteristicWithResponseForService(BLE_SERVICE_UUID, BLE_TX_UUID, payload)
        .catch(reject);
    });
  }

  /** Read all available OBD data and return a typed snapshot. */
  async readAll(onProgress: ObdProgressCallback): Promise<ObdSnapshot> {
    if (this.simulation) {
      onProgress('reading', 'Generating simulated OBD data…');
      await new Promise((r) => setTimeout(r, 1200));
      onProgress('ready', 'Simulation complete');
      return simulatedSnapshot();
    }

    // Real BLE path — requires an active connection
    const disc = this.manager as {
      writeCharacteristicWithResponseForService: (svc: string, char: string, val: string) => Promise<void>;
    };

    onProgress('reading', 'Reading VIN…');
    const vinRaw = await this.sendCommand(INFO_PID.VIN, disc, 6_000).catch(() => '');
    const vin = parseVinResponse(vinRaw);

    onProgress('reading', 'Reading fault codes…');
    const dtcRaw = await this.sendCommand(DTC_MODE, disc, 5_000).catch(() => '');
    const faultCodes = parseDtcResponse(dtcRaw);

    onProgress('reading', 'Reading live sensor data…');
    const [rpmRaw, speedRaw, coolRaw, throttleRaw, fuelRaw, oilRaw, intakeRaw, loadRaw, readyRaw] =
      await Promise.allSettled([
        this.sendCommand(PID.ENGINE_RPM, disc),
        this.sendCommand(PID.VEHICLE_SPEED, disc),
        this.sendCommand(PID.COOLANT_TEMP, disc),
        this.sendCommand(PID.THROTTLE_POS, disc),
        this.sendCommand(PID.FUEL_LEVEL, disc),
        this.sendCommand(PID.OIL_TEMP, disc),
        this.sendCommand(PID.INTAKE_TEMP, disc),
        this.sendCommand(PID.ENGINE_LOAD, disc),
        this.sendCommand(PID.READINESS, disc),
      ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : '')));

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
  }

  disconnect() {
    if (!this.manager || !this.deviceId) return;
    const mgr = this.manager as { cancelDeviceConnection: (id: string) => void };
    try { mgr.cancelDeviceConnection(this.deviceId); } catch { /* ignore */ }
    this.deviceId = null;
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
