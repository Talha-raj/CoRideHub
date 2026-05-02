import { create } from 'zustand';

export const useSession = create(set => ({
  currentLocation: [],
  setCurrentLocation: c => {
    set({ currentLocation: c });
  },
}));
