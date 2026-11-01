import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firestore } from './firebase';
import type { FirestoreCar } from './firestoreOps';
import { parseServiceRecord, type VehicleServiceRecord } from './vehicle-records';

type VehicleState = {
  key: string;
  car: FirestoreCar | null;
  records: VehicleServiceRecord[];
  loading: boolean;
  recordsLoading: boolean;
  error: boolean;
  recordsError: boolean;
};

export function useVehicleRecords(uid: string | undefined, id: string | undefined) {
  const key = JSON.stringify([uid, id]);
  const [attempt, setAttempt] = useState(0);
  const empty: VehicleState = { key, car: null, records: [], loading: Boolean(uid && id), recordsLoading: Boolean(uid && id), error: false, recordsError: false };
  const [state, setState] = useState<VehicleState>(empty);

  useEffect(() => {
    let active = true;
    setState({ key, car: null, records: [], loading: Boolean(uid && id), recordsLoading: Boolean(uid && id), error: false, recordsError: false });
    if (!uid || !id) return;
    const carRef = doc(firestore, 'users', uid, 'cars', id);
    const update = (patch: Partial<VehicleState>) => {
      if (active) setState((current) => ({ ...current, ...patch }));
    };
    const unsubscribeCar = onSnapshot(carRef, (snapshot) => {
      update({ car: snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as FirestoreCar : null, loading: false, error: false });
    }, () => update({ car: null, loading: false, error: true }));
    const unsubscribeRecords = onSnapshot(
      query(collection(carRef, 'serviceRecords'), orderBy('serviceDate', 'desc'), limit(100)),
      (snapshot) => update({ records: snapshot.docs.map((item) => parseServiceRecord(item.id, item.data())), recordsLoading: false, recordsError: false }),
      () => update({ records: [], recordsLoading: false, recordsError: true }),
    );
    return () => { active = false; unsubscribeCar(); unsubscribeRecords(); };
  }, [uid, id, key, attempt]);

  // Do not render a previous account/vehicle while its effect cleans up.
  return { ...(state.key === key ? state : empty), retry: () => setAttempt((value) => value + 1) };
}
