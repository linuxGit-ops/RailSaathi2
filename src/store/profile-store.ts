/**
 * profile-store.ts — Demo user profiles + saved passengers (§4)
 * Stores demo accounts (§34.1) and pre-filled passenger data.
 */
import { create } from 'zustand';

export interface Passenger {
  passengerId: string;
  name: string;
  nameHi?: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  seatPreference: 'LOWER' | 'UPPER' | 'SIDE_LOWER' | 'NO_PREFERENCE';
  idType: 'DEMO_ID';   // Never a real ID format
  idNumber: string;    // Clearly fictional e.g. "DEMO-XXXX"
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  preferredLanguage: 'en' | 'hi';
  savedPassengers: Passenger[];
  walletBalance: number;
  isAdmin: boolean;
}

// --- Seeded demo accounts (§34.1) ---
export const DEMO_CITIZEN: UserProfile = {
  userId: 'USR-DEMO-001',
  name: 'Priya Sharma',
  email: 'demo.user@example.test',
  phone: '+91 98765 00000',
  preferredLanguage: 'en',
  walletBalance: 5000,
  isAdmin: false,
  savedPassengers: [
    {
      passengerId: 'PAX-001',
      name: 'Priya Sharma',
      nameHi: 'प्रिया शर्मा',
      age: 32,
      gender: 'F',
      seatPreference: 'LOWER',
      idType: 'DEMO_ID',
      idNumber: 'DEMO-PAX-001',
    },
    {
      passengerId: 'PAX-002',
      name: 'Rohan Sharma',
      nameHi: 'रोहन शर्मा',
      age: 35,
      gender: 'M',
      seatPreference: 'LOWER',
      idType: 'DEMO_ID',
      idNumber: 'DEMO-PAX-002',
    },
  ],
};

export const DEMO_ADMIN: UserProfile = {
  userId: 'USR-ADMIN-001',
  name: 'Admin User',
  email: 'demo.admin@example.test',
  phone: '+91 98765 00001',
  preferredLanguage: 'en',
  walletBalance: 0,
  isAdmin: true,
  savedPassengers: [],
};

// --- Store ---
interface ProfileState {
  currentUser: UserProfile | null;
  language: 'en' | 'hi';
  login: (email: string, password: string) => boolean;
  logout: () => void;
  setLanguage: (lang: 'en' | 'hi') => void;
  addWallet: (amount: number) => void;
  deductWallet: (amount: number) => boolean;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  currentUser: null,
  language: 'en',

  login: (email, password) => {
    // Demo accounts (§34.1) — no real auth
    if (email === DEMO_CITIZEN.email && password === 'Demo@1234') {
      set({ currentUser: DEMO_CITIZEN });
      return true;
    }
    if (email === DEMO_ADMIN.email && password === 'Admin@1234') {
      set({ currentUser: DEMO_ADMIN });
      return true;
    }
    return false;
  },

  logout: () => set({ currentUser: null }),

  setLanguage: (lang) => set({ language: lang }),

  addWallet: (amount) => {
    const user = get().currentUser;
    if (user) {
      set({ currentUser: { ...user, walletBalance: user.walletBalance + amount } });
    }
  },

  deductWallet: (amount) => {
    const user = get().currentUser;
    if (!user || user.walletBalance < amount) return false;
    set({ currentUser: { ...user, walletBalance: user.walletBalance - amount } });
    return true;
  },
}));
