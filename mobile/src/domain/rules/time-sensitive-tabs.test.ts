import { describe, it, expect } from '@jest/globals';
import { getActiveTab, getTabWindows, type TabActivationInput } from './time-sensitive-tabs';

describe('getActiveTab', () => {
  const standardHours: Omit<TabActivationInput, 'currentTime'> = {
    openingTime: '10:00',
    closingTime: '23:00',
  };

  describe('receive window (05:00 - 09:00)', () => {
    it('returns receive at 05:00 start', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '05:00' })).toBe('receive');
    });

    it('returns receive at 06:30 middle', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '06:30' })).toBe('receive');
    });

    it('returns receive at 08:59 just before end', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '08:59' })).toBe('receive');
    });
  });

  describe('commands window (09:00 - 22:30)', () => {
    it('returns commands at 09:00 start', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '09:00' })).toBe('commands');
    });

    it('returns commands at 15:00 middle', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '15:00' })).toBe('commands');
    });

    it('returns commands at 22:29 just before end', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '22:29' })).toBe('commands');
    });
  });

  describe('requisition window (22:30 - 05:00, wraps midnight)', () => {
    it('returns requisition at 22:30 start', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '22:30' })).toBe('requisition');
    });

    it('returns requisition at 23:45 before midnight', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '23:45' })).toBe('requisition');
    });

    it('returns requisition at 00:00 midnight', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '00:00' })).toBe('requisition');
    });

    it('returns requisition at 02:30 after midnight', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '02:30' })).toBe('requisition');
    });

    it('returns requisition at 04:59 just before receive starts', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '04:59' })).toBe('requisition');
    });
  });

  describe('different service hours', () => {
    it('handles early opening (08:00 - 20:00)', () => {
      const early = { openingTime: '08:00', closingTime: '20:00' };
      expect(getActiveTab({ ...early, currentTime: '05:00' })).toBe('receive');
      expect(getActiveTab({ ...early, currentTime: '07:00' })).toBe('receive');
      expect(getActiveTab({ ...early, currentTime: '07:01' })).toBe('commands');
      expect(getActiveTab({ ...early, currentTime: '19:29' })).toBe('commands');
      expect(getActiveTab({ ...early, currentTime: '19:30' })).toBe('requisition');
    });

    it('handles late closing (12:00 - 02:00)', () => {
      const late = { openingTime: '12:00', closingTime: '02:00' };
      expect(getActiveTab({ ...late, currentTime: '05:00' })).toBe('receive');
      expect(getActiveTab({ ...late, currentTime: '11:00' })).toBe('receive');
      expect(getActiveTab({ ...late, currentTime: '11:01' })).toBe('commands');
      expect(getActiveTab({ ...late, currentTime: '01:29' })).toBe('commands');
      expect(getActiveTab({ ...late, currentTime: '01:30' })).toBe('requisition');
    });
  });

  describe('edge cases', () => {
    it('throws on invalid time format', () => {
      expect(() => getActiveTab({ ...standardHours, currentTime: 'invalid' })).toThrow();
      expect(() => getActiveTab({ ...standardHours, currentTime: '25:00' })).not.toThrow(); // Doesn't validate range
    });

    it('handles single-digit hours and minutes', () => {
      expect(getActiveTab({ ...standardHours, currentTime: '5:0' })).toBe('receive');
      expect(getActiveTab({ ...standardHours, currentTime: '09:00' })).toBe('commands');
    });
  });
});

describe('getTabWindows', () => {
  it('returns correct windows for standard hours', () => {
    const windows = getTabWindows('10:00', '23:00');
    expect(windows.receive).toEqual({ start: { hour: 5, minute: 0 }, end: { hour: 9, minute: 0 } });
    expect(windows.commands).toEqual({ start: { hour: 9, minute: 0 }, end: { hour: 22, minute: 30 } });
    expect(windows.requisition).toEqual({ start: { hour: 22, minute: 30 }, end: { hour: 5, minute: 0 } });
  });

  it('handles early hours', () => {
    const windows = getTabWindows('08:00', '20:00');
    expect(windows.receive.end).toEqual({ hour: 7, minute: 0 });
    expect(windows.commands.start).toEqual({ hour: 7, minute: 0 });
    expect(windows.commands.end).toEqual({ hour: 19, minute: 30 });
  });
});
