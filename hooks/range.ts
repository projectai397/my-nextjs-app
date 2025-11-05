// Format amount with 2 decimals if not integer
export const formatAmount = (amount: number): string | number => {
  return Number.isInteger(amount) ? amount : amount.toFixed(2);
};

// Helper: Get current week range (Monday to Sunday)
export const getCurrentWeekRange = (): { startDate: string; endDate: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    startDate: monday.toISOString().split("T")[0],
    endDate: sunday.toISOString().split("T")[0],
  };
};

// Helper: Get today range
export const getTodayRange = (): { startDate: string; endDate: string } => {
  const today = new Date();

  const start = new Date(today);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setUTCHours(23, 59, 59, 999);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
};

/**
 * Format a numeric value based on exchange type.
 * - Integers are shown as-is
 * - Decimals are shown with 2 digits normally
 * - Forex values use 4 digits
 *
 * @param value number
 * @param exchangeName string
 * @returns string | number
 */
export const formatValue = (value: number | null | undefined, exchangeName?: string): string | number => {
  if (value == null || isNaN(value)) return "-"; // safe fallback
  return Number.isInteger(value)
    ? value
    : value.toFixed(exchangeName?.toLowerCase() === "forex" ? 4 : 2);
};

/**
 * Format a date string or Date object into a readable format.
 *
 * Default: DD/MM/YYYY HH:mm:ss (24-hour)
 * Auto-handles ISO strings, timestamps, and nulls.
 *
 * @param dateInput - ISO string | Date | number (timestamp)
 * @param options - Optional format override
 * @returns string - formatted date
 */
export const formatDateTime = (
  dateInput: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return "-";

  let date: Date;
  try {
    date = typeof dateInput === "string" || typeof dateInput === "number"
      ? new Date(dateInput)
      : dateInput;
    if (isNaN(date.getTime())) return "-";
  } catch {
    return "-";
  }

  const fmtOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat("en-IN", fmtOptions).format(date);
};
