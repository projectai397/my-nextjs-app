// utils/dateUtils.ts
import moment from "moment";

/**
 * Format a date to a given format (default: DD/MM/YYYY)
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  dateFormat: string = "DD/MM/YYYY"
): string => {
  if (!date) return "";
  try {
    const formattedDate = moment(date).format(dateFormat);
    return formattedDate;
  } catch (error) {
    console.error("Invalid Date:", date);
    return "";
  }
};

/**
 * Format a date for input fields (default: YYYY-MM-DD)
 */
export const formatDateInput = (
  date: Date | string | number | null | undefined,
  dateFormat: string = "YYYY-MM-DD"
): string => {
  if (!date) return "";
  try {
    const formattedDate = moment(date).format(dateFormat);
    return formattedDate;
  } catch (error) {
    console.error("Invalid Date:", date);
    return "";
  }
};

/**
 * Format a date with time (default: DD/MM/YYYY h:mm:ss a)
 */
export const formatDateTime = (
  date: Date | string | number | null | undefined,
  dateFormat: string = "DD/MM/YYYY h:mm:ss a"
): string => {
  if (!date) return "";
  try {
    const formattedDate = moment(date).format(dateFormat);
    return formattedDate;
  } catch (error) {
    console.error("Invalid Date:", date);
    return "";
  }
};

/**
 * Format expiry date for symbols (default: DD-MMM)
 */
export const formatSymbolExpiryDate = (
  date: Date | string | number | null | undefined,
  dateFormat: string = "DD-MMM"
): string => {
  if (!date) return "";
  try {
    const formattedDate = moment(date).format(dateFormat);
    return formattedDate;
  } catch (error) {
    console.error("Invalid Date:", date);
    return "";
  }
};

/**
 * Format a Date object to string for Excel export filenames
 * Example: 18102024153045
 */
export const formatDateForExportExcelName = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1); // Months are 0-based
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}${month}${year}${hours}${minutes}${seconds}`;
};
// utils/dateAndNumber.ts

// Reusable types
export type DateRange = {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
};

/**
 * Formats a number:
 * - If integer -> returns the number
 * - Else -> returns string with 2 decimals
 *
 * Note: This mirrors your original behavior (number | string).
 */
export const formatAmount = (amount: number): number | string => {
  return Number.isInteger(amount) ? amount : amount.toFixed(2);
};

/**
 * Get the current week range (Monday..Sunday), using UTC day boundaries.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export const getCurrentWeekRange = (): DateRange => {
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // Sunday = 0, Monday = 1, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0
    )
  );

  const sunday = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + 6,
      23,
      59,
      59,
      999
    )
  );

  return {
    startDate: monday.toISOString().split("T")[0],
    endDate: sunday.toISOString().split("T")[0],
  };
};

/**
 * Get today's range (00:00:00.000..23:59:59.999 UTC).
 * Returns ISO date strings (YYYY-MM-DD).
 */
export const getTodayRange = (): DateRange => {
  const now = new Date();

  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
};

/**
 * Format a numeric value based on exchange type.
 * - Integers return as number
 * - Decimals return as string with 2 digits (or 4 for "forex")
 *
 * @param value         Number to format
 * @param exchangeName  Exchange label; "forex" (case-insensitive) uses 4 decimals
 * @returns number | string
 */
export const formatValue = (
  value: any,
  exchangeName?: string | null
): number | string => {
  if (value == null || Number.isNaN(value)) return "-";
  return Number.isInteger(value)
    ? value
    : value.toFixed(exchangeName?.toLowerCase() === "forex" ? 4 : 2);
};
