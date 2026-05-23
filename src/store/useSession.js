import { create } from 'zustand';

export const useSession = create(set => ({
  currentLocation: [],
  setCurrentLocation: c => set({ currentLocation: c }),

  // ID of the route currently in "isLeaving" state — survives navigation.
  // Set when driver confirms departure; cleared on Complete.
  activeTrackingRouteId: null,
  setActiveTrackingRouteId: id => set({ activeTrackingRouteId: id }),
}));
