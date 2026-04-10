import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingsState = {
  appName: string;
  setAppName: (name: string) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appName: 'Talica Investments Admin',
      setAppName: (name) => set({ appName: name }),
    }),
    {
      name: 'app-settings',
    }
  )
);
