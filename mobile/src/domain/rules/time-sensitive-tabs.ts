/**
 * Time-sensitive tab activation logic for the home screen.
 * 
 * Requirements (from original-requirements.md):
 * - 05:00 → 1h before open (09:00 if open is 10:00): Receive tab active
 * - 09:00 → 30min before close (22:30 if close is 23:00): Commands tab active  
 * - 22:30 → 05:00: Requisition tab active
 */

export type TabName = 'receive' | 'commands' | 'requisition';

export interface TimeWindow {
  start: { hour: number; minute: number };
  end: { hour: number; minute: number };
}

export interface TabActivationInput {
  /** Current time in HH:MM format (24-hour) */
  currentTime: string;
  /** Kitchen opening time in HH:MM format (24-hour) */
  openingTime: string;
  /** Kitchen closing time in HH:MM format (24-hour) */
  closingTime: string;
}

/** Convert HH:MM string to minutes since midnight */
function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return hour * 60 + minute;
}

/** Check if current time falls within a window, handling midnight wrap */
function isInWindow(currentMinutes: number, start: number, end: number): boolean {
  if (start <= end) {
    // Normal case: 09:00 to 22:30
    return currentMinutes >= start && currentMinutes < end;
  } else {
    // Midnight wrap: 22:30 to 05:00 (next day)
    return currentMinutes >= start || currentMinutes < end;
  }
}

/**
 * Determine which tab should be active based on current time and service hours.
 * 
 * Example: If service is 10:00 AM - 11:00 PM:
 * - 05:00 - 09:00: Receive (1h before open)
 * - 09:00 - 22:30: Commands (until 30min before close)
 * - 22:30 - 05:00: Requisition (wraps midnight)
 * 
 * @throws Error if time formats are invalid
 */
export function getActiveTab(input: TabActivationInput): TabName {
  const currentMinutes = timeToMinutes(input.currentTime);
  const openingMinutes = timeToMinutes(input.openingTime);
  const closingMinutes = timeToMinutes(input.closingTime);

  // Calculate window boundaries
  const receiveStart = 5 * 60; // 05:00
  const receiveEnd = openingMinutes - 60; // 1h before opening
  
  const commandsStart = receiveEnd; // End of receive
  const commandsEnd = closingMinutes - 30; // 30min before closing
  
  const requisitionStart = commandsEnd; // End of commands
  const requisitionEnd = receiveStart; // Until receive starts (wraps midnight)

  // Check windows in order
  if (isInWindow(currentMinutes, receiveStart, receiveEnd)) {
    return 'receive';
  }
  
  if (isInWindow(currentMinutes, commandsStart, commandsEnd)) {
    return 'commands';
  }
  
  // Everything else is requisition (handles midnight wrap)
  return 'requisition';
}

/**
 * Get the time windows for each tab (useful for display/debugging)
 */
export function getTabWindows(openingTime: string, closingTime: string): Record<TabName, TimeWindow> {
  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);
  
  const receiveEnd = openingMinutes - 60;
  const commandsEnd = closingMinutes - 30;
  
  return {
    receive: {
      start: { hour: 5, minute: 0 },
      end: { hour: Math.floor(receiveEnd / 60), minute: receiveEnd % 60 },
    },
    commands: {
      start: { hour: Math.floor(receiveEnd / 60), minute: receiveEnd % 60 },
      end: { hour: Math.floor(commandsEnd / 60), minute: commandsEnd % 60 },
    },
    requisition: {
      start: { hour: Math.floor(commandsEnd / 60), minute: commandsEnd % 60 },
      end: { hour: 5, minute: 0 },
    },
  };
}
