import type { FirestoreCar } from './firestoreOps';

export type VehicleServiceRecord = {
  id: string;
  serviceType: string;
  serviceDate: string;
  serviceDescription: string;
  mileageAtService: number | null;
  cost: number | null;
};

export function recordedHealth(car: Pick<FirestoreCar, 'health' | 'obdDiagnostics'>): number | null {
  const scan = car.obdDiagnostics;
  // Legacy manual and simulated scores are not measurements.
  if (!scan || scan.simulationMode !== false || !Number.isFinite(Date.parse(scan.scannedAt))) return null;
  return typeof car.health === 'number' && Number.isFinite(car.health) && car.health >= 0 && car.health <= 100
    ? car.health : null;
}

export function parseServiceRecord(id: string, data: Record<string, unknown>): VehicleServiceRecord {
  return {
    id,
    serviceType: typeof data.serviceType === 'string' ? data.serviceType : 'Service record',
    serviceDate: typeof data.serviceDate === 'string' ? data.serviceDate : '',
    serviceDescription: typeof data.serviceDescription === 'string' ? data.serviceDescription : '',
    mileageAtService: typeof data.mileageAtService === 'number' && Number.isFinite(data.mileageAtService) && data.mileageAtService >= 0 ? data.mileageAtService : null,
    cost: typeof data.cost === 'number' && Number.isFinite(data.cost) && data.cost >= 0 ? data.cost : null,
  };
}

export function recordedServiceCost(records: VehicleServiceRecord[]): number {
  return records.reduce((total, record) => total + Math.round((record.cost ?? 0) * 100), 0) / 100;
}

export function vehicleDate(value: string | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Date(value).toLocaleDateString('en-QA', { year: 'numeric', month: 'short', day: 'numeric' });
}
