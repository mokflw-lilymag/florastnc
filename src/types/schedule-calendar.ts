export type ScheduleEventKind = "pickup" | "delivery" | "fixed_cost" | "expense" | "staff" | "note" | "leave";

export type ScheduleCalendarEvent = {
  id: string;
  kind: ScheduleEventKind;
  dateYmd: string;
  title: string;
  subtitle?: string;
  amount?: number;
  href?: string;
  time?: string;
};

export type ScheduleLayerFilters = {
  pickup: boolean;
  delivery: boolean;
  fixed_cost: boolean;
  expense: boolean;
  staff: boolean;
  note: boolean;
  leave: boolean;
};

export const DEFAULT_SCHEDULE_FILTERS: ScheduleLayerFilters = {
  pickup: true,
  delivery: true,
  fixed_cost: true,
  expense: true,
  staff: true,
  note: true,
  leave: true,
};

export type StaffShift = {
  id: string;
  staffName: string;
  dateYmd: string;
  startTime?: string;
  endTime?: string;
  memo?: string;
};

export type ScheduleNote = {
  id: string;
  dateYmd: string;
  content: string;
};

export type DayScheduleSummary = {
  dateYmd: string;
  pickups: number;
  deliveries: number;
  fixedCosts: number;
  expenses: number;
  staff: number;
  notes: number;
  leaves: number;
  events: ScheduleCalendarEvent[];
};
