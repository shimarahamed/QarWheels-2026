import { ObdSession } from '@/lib/obd-reader';
import { createBleManager } from '@/lib/ble-manager';

jest.mock('@/lib/ble-manager', () => ({ createBleManager: jest.fn() }));
let listener: (error: Error | null, value: { value: string }) => void;
let responses: Record<string, string>;
let commands: string[];
let inFlight: number;
let maxInFlight: number;
const remove = jest.fn();
const manager = { startDeviceScan: jest.fn(), stopDeviceScan: jest.fn(async () => {}), destroy: jest.fn(async () => {}) };
const device = {
  connect: jest.fn(), discoverAllServicesAndCharacteristics: jest.fn(), cancelConnection: jest.fn(async () => {}),
  monitorCharacteristicForService: jest.fn((_service, _char, callback) => { listener = callback; return { remove }; }),
  writeCharacteristicWithResponseForService: jest.fn(async (_service, _char, value) => {
    const command = atob(value).trim();
    commands.push(command);
    inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
    await Promise.resolve();
    inFlight -= 1;
    listener(null, { value: btoa(responses[command] ?? 'OK>') });
  }),
};

beforeEach(() => {
  jest.clearAllMocks();
  commands = []; inFlight = 0; maxInFlight = 0;
  responses = {
    '0902': 'NO DATA>', '03': '430000>', '0101': '410100070000>',
    '010C': '410C0CD0>', '010D': '410D00>', '0105': '410580>',
    '0111': '411120>', '012F': '412F80>', '015C': '415C80>',
    '010F': '410F50>', '0104': '410420>', ATRV: '12.6V>',
  };
  device.connect.mockResolvedValue(device);
  device.discoverAllServicesAndCharacteristics.mockResolvedValue(device);
  manager.startDeviceScan.mockImplementation(async (_uuids, _opts, callback) => { callback(null, device); });
  jest.mocked(createBleManager).mockResolvedValue(manager as never);
});

it('sends initialization and sensor commands serially to the discovered device', async () => {
  const session = new ObdSession();
  expect(await session.connect(jest.fn())).toBe(true);
  const snapshot = await session.readAll(jest.fn());
  expect(maxInFlight).toBe(1);
  expect(snapshot).toMatchObject({ simulationMode: false, engineRpm: 820, coolantTemp: 88, batteryVoltage: 12.6 });
  expect(commands.slice(0, 6)).toEqual(['ATZ', 'ATE0', 'ATL0', 'ATH0', 'ATS0', 'ATSP0']);
  session.disconnect();
  expect(remove).toHaveBeenCalled();
  expect(manager.destroy).toHaveBeenCalled();
});

it('never substitutes a simulation when native Bluetooth is unavailable', async () => {
  jest.mocked(createBleManager).mockRejectedValue(new Error('Unavailable'));
  const session = new ObdSession();
  await expect(session.connect(jest.fn())).rejects.toThrow('Unavailable');
  await expect(session.readAll(jest.fn())).rejects.toThrow('Connect an OBD');
});

it('fails rather than reporting a healthy vehicle when fault data is missing', async () => {
  responses['03'] = 'NO DATA>';
  const session = new ObdSession();
  await session.connect(jest.fn());
  await expect(session.readAll(jest.fn())).rejects.toThrow('fault-code data');
  session.disconnect();
});

it('rejects an overlapping scan', async () => {
  const session = new ObdSession();
  await session.connect(jest.fn());
  const first = session.readAll(jest.fn());
  await expect(session.readAll(jest.fn())).rejects.toThrow('already in progress');
  await first;
  session.disconnect();
});

it('preserves fault-code bytes equal to the response header and rejects incomplete PID bytes', async () => {
  responses['03'] = '4301430000>';
  responses['010C'] = '410C>';
  const session = new ObdSession();
  await session.connect(jest.fn());
  const snapshot = await session.readAll(jest.fn());
  expect(snapshot.faultCodes[0].code).toBe('P0143');
  expect(snapshot.engineRpm).toBeNull();
  session.disconnect();
});

it('does not count unsupported monitors as failed', async () => {
  const session = new ObdSession();
  await session.connect(jest.fn());
  expect((await session.readAll(jest.fn())).healthScore).toBe(100);
  responses['0101'] = '410100170000>';
  expect((await session.readAll(jest.fn())).readinessMonitors.misfire).toBe(false);
  session.disconnect();
});
