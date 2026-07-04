export type LeaseDeviceType = "pos" | "label";

export type PrinterLeaseRow = {
  tenant_id: string;
  tenant_name: string;
  device_type: LeaseDeviceType;
  model_name: string;
  leased: boolean;
  lease_start: string | null;
  lease_end: string | null;
  courier: string | null;
  tracking_number: string | null;
  return_completed: boolean;
  returned_at: string | null;
  contact_email: string | null;
  contact_name: string | null;
};

export const PRINTER_COURIERS = ["CJ대한통운", "우체국택배", "로젠택배", "한진택배", "기타"] as const;

export function logisticsFieldPrefix(deviceType: LeaseDeviceType): "pos_printer" | "label_printer" {
  return deviceType === "pos" ? "pos_printer" : "label_printer";
}
