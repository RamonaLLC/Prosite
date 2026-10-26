import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Job, WorkerProfile, JobSiteTimeLog, DirectMessage, CompanySettings } from '../types';

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return null as any;
  }

  function cleanRecursively(val: any): any {
    if (val === undefined) {
      return null;
    }
    if (val === null || typeof val !== 'object') {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(item => cleanRecursively(item));
    }
    const cleanedObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const v = val[key];
      if (v !== undefined) {
        cleanedObj[key] = cleanRecursively(v);
      }
    }
    return cleanedObj;
  }

  try {
    const recursivelyCleaned = cleanRecursively(data);
    const serialized = JSON.stringify(recursivelyCleaned);
    if (!serialized) return null as any;
    return JSON.parse(serialized);
  } catch (err) {
    return cleanRecursively(data);
  }
}

// -------------------------------------------------------------
// 1. JOBS FIRESTORE SYNC
// -------------------------------------------------------------

export function subscribeToJobs(
  onData: (jobs: Job[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const jobsRef = collection(db, 'jobs');
    return onSnapshot(
      jobsRef,
      (snapshot) => {
        const jobsList: Job[] = [];
        snapshot.forEach((docSnap) => {
          jobsList.push(docSnap.data() as Job);
        });
        onData(jobsList);
      },
      (error) => {
        console.warn('Firestore Jobs subscription notice:', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('subscribeToJobs failed initialization:', err.message);
    return () => {};
  }
}

export async function syncJobToFirestore(job: Job): Promise<void> {
  try {
    const jobDoc = doc(db, 'jobs', job.id);
    const cleaned = sanitizeForFirestore({
      ...job,
      updatedAt: new Date().toISOString()
    });
    await setDoc(jobDoc, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `jobs/${job.id}`);
  }
}

export async function removeJobFromFirestore(jobId: string): Promise<void> {
  try {
    const jobDoc = doc(db, 'jobs', jobId);
    await deleteDoc(jobDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jobs/${jobId}`);
  }
}

// -------------------------------------------------------------
// 2. WORKERS FIRESTORE SYNC
// -------------------------------------------------------------

export function subscribeToWorkers(
  onData: (workers: WorkerProfile[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const workersRef = collection(db, 'workers');
    return onSnapshot(
      workersRef,
      (snapshot) => {
        const workerList: WorkerProfile[] = [];
        snapshot.forEach((docSnap) => {
          workerList.push(docSnap.data() as WorkerProfile);
        });
        onData(workerList);
      },
      (error) => {
        console.warn('Firestore Workers subscription notice:', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('subscribeToWorkers initialization notice:', err.message);
    return () => {};
  }
}

export async function syncWorkerToFirestore(worker: WorkerProfile): Promise<void> {
  try {
    const workerDoc = doc(db, 'workers', worker.id);
    const cleaned = sanitizeForFirestore({
      ...worker,
      updatedAt: new Date().toISOString()
    });
    await setDoc(workerDoc, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `workers/${worker.id}`);
  }
}

// -------------------------------------------------------------
// 3. TIME LOGS FIRESTORE SYNC
// -------------------------------------------------------------

export function subscribeToTimeLogs(
  onData: (logs: JobSiteTimeLog[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const logsRef = collection(db, 'timeLogs');
    return onSnapshot(
      logsRef,
      (snapshot) => {
        const logsList: JobSiteTimeLog[] = [];
        snapshot.forEach((docSnap) => {
          logsList.push(docSnap.data() as JobSiteTimeLog);
        });
        onData(logsList);
      },
      (error) => {
        console.warn('Firestore TimeLogs notice:', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    return () => {};
  }
}

export async function syncTimeLogToFirestore(log: JobSiteTimeLog): Promise<void> {
  try {
    const logDoc = doc(db, 'timeLogs', log.id);
    await setDoc(logDoc, sanitizeForFirestore(log), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `timeLogs/${log.id}`);
  }
}

// -------------------------------------------------------------
// 4. DIRECT MESSAGES FIRESTORE SYNC
// -------------------------------------------------------------

export function subscribeToMessages(
  onData: (messages: DirectMessage[]) => void,
  onError?: (error: Error) => void
) {
  try {
    const msgsRef = collection(db, 'messages');
    return onSnapshot(
      msgsRef,
      (snapshot) => {
        const msgsList: DirectMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgsList.push(docSnap.data() as DirectMessage);
        });
        onData(msgsList);
      },
      (error) => {
        console.warn('Firestore Messages notice:', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    return () => {};
  }
}

export async function syncMessageToFirestore(message: DirectMessage): Promise<void> {
  try {
    const msgDoc = doc(db, 'messages', message.id);
    await setDoc(msgDoc, sanitizeForFirestore(message), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `messages/${message.id}`);
  }
}

// -------------------------------------------------------------
// 5. DATABASE INITIALIZATION & RESET
// -------------------------------------------------------------

// Automatic test data seeding has been permanently disabled to prevent repopulating test records
export async function seedInitialFirestoreData(): Promise<void> {
  // Deliberately no-op: prevents test jobs and bids from repopulating Firestore
}

export async function resetAllFirestoreTestData(): Promise<void> {
  try {
    const jobsSnap = await getDocs(collection(db, 'jobs'));
    for (const jobDoc of jobsSnap.docs) {
      await deleteDoc(doc(db, 'jobs', jobDoc.id));
    }
    const msgsSnap = await getDocs(collection(db, 'messages'));
    for (const msgDoc of msgsSnap.docs) {
      await deleteDoc(doc(db, 'messages', msgDoc.id));
    }
    const timeSnap = await getDocs(collection(db, 'timeLogs'));
    for (const timeDoc of timeSnap.docs) {
      await deleteDoc(doc(db, 'timeLogs', timeDoc.id));
    }
    const txSnap = await getDocs(collection(db, 'transactions'));
    for (const txDoc of txSnap.docs) {
      await deleteDoc(doc(db, 'transactions', txDoc.id));
    }
  } catch (e) {
    console.warn('Firestore reset warning:', e);
  }
}
