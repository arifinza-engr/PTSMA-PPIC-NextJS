import { create } from "zustand";
import type { PaginationState, SortingState } from "@tanstack/react-table";

type Line = "brakeshoe" | "discpad" | "handle";
type AppliedFilters = { line: Line; lini: string; from: string; to: string } | null;

interface ProductionReportState {
  line: Line;
  lini: string;
  from: string;
  to: string;
  appliedFilters: AppliedFilters;
  searchQuery: string;
  pagination: PaginationState;
  sorting: SortingState;
  setLine: (line: Line) => void;
  setLini: (lini: string) => void;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
  applyFilters: (filters: NonNullable<AppliedFilters>) => void;
  clearAppliedFilters: () => void;
  setSearchQuery: (searchQuery: string) => void;
  setPagination: (updater: PaginationState | ((current: PaginationState) => PaginationState)) => void;
  setSorting: (updater: SortingState | ((current: SortingState) => SortingState)) => void;
  initialize: (values: { line: Line; lini: string; from: string; to: string }) => void;
}

export const useProductionReportStore = create<ProductionReportState>((set) => ({
  line: "brakeshoe",
  lini: "",
  from: "",
  to: "",
  appliedFilters: null,
  searchQuery: "",
  pagination: { pageIndex: 0, pageSize: 25 },
  sorting: [],
  setLine: (line) => set({ line }),
  setLini: (lini) => set({ lini }),
  setFrom: (from) => set({ from }),
  setTo: (to) => set({ to }),
  applyFilters: (filters) => set({ appliedFilters: filters }),
  clearAppliedFilters: () => set({ appliedFilters: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPagination: (updater) => set((state) => ({
    pagination: typeof updater === "function" ? updater(state.pagination) : updater,
  })),
  setSorting: (updater) => set((state) => ({
    sorting: typeof updater === "function" ? updater(state.sorting) : updater,
  })),
  initialize: (values) => set((state) => ({
    ...values,
    appliedFilters: state.appliedFilters ?? (values.lini ? values : null),
  })),
}));
