import { create } from 'zustand';

export type TenantSelection = 'all' | string;
export const useTenantStore = create<{
  selectedTenantId: TenantSelection;
  selectTenant: (id: TenantSelection) => void;
}>((set) => ({
  selectedTenantId: 'all',
  selectTenant: (selectedTenantId) => set({ selectedTenantId }),
}));
