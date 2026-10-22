import { describe, it, expect } from 'vitest';

// 1. Classification function per PRD Section 1.6 & 2.4
export function classifyFaceMatch(
  confidence: number,
  matchThreshold: number = 90,
  reviewThreshold: number = 80
): 'matched' | 'review' | 'unknown' {
  if (confidence >= matchThreshold) return 'matched';
  if (confidence >= reviewThreshold) return 'review';
  return 'unknown';
}

// 2. Anti-proxy duplicate check
export function checkDuplicatePhoto(
  incomingHash: string,
  existingHashes: string[]
): boolean {
  return existingHashes.includes(incomingHash);
}

// 3. 75% rule attendance calculator
export function calculateAttendanceImpact(
  present: number,
  total: number,
  targetRatio: number = 0.75
): { rate: number; isShortage: boolean; missable: number; needed: number } {
  const rate = total > 0 ? (present / total) * 100 : 100;
  const isShortage = rate < targetRatio * 100;

  let missable = 0;
  let needed = 0;

  if (!isShortage) {
    // Formula: (present) / (total + x) >= targetRatio
    // targetRatio * (total + x) <= present
    // targetRatio * x <= present - targetRatio * total
    // x = floor((present - targetRatio * total) / targetRatio)
    missable = Math.max(0, Math.floor((present - targetRatio * total) / targetRatio));
  } else {
    // Formula: (present + y) / (total + y) >= targetRatio
    // present + y >= targetRatio * total + targetRatio * y
    // y * (1 - targetRatio) >= targetRatio * total - present
    needed = Math.max(0, Math.ceil((targetRatio * total - present) / (1 - targetRatio)));
  }

  return { rate: Math.round(rate), isShortage, missable, needed };
}

// 4. Role permission checker
export function checkRolePermission(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

describe('Haazri Core System Tests', () => {
  describe('Face Recognition Classification Logic', () => {
    it('classifies confidence >= 90% as matched', () => {
      expect(classifyFaceMatch(95.4)).toBe('matched');
      expect(classifyFaceMatch(90.0)).toBe('matched');
    });

    it('classifies confidence between 80% and 89.9% as review band', () => {
      expect(classifyFaceMatch(89.9)).toBe('review');
      expect(classifyFaceMatch(80.0)).toBe('review');
      expect(classifyFaceMatch(84.5)).toBe('review');
    });

    it('classifies confidence below 80% as unknown', () => {
      expect(classifyFaceMatch(79.9)).toBe('unknown');
      expect(classifyFaceMatch(62.0)).toBe('unknown');
      expect(classifyFaceMatch(0)).toBe('unknown');
    });

    it('respects custom configured threshold parameters', () => {
      expect(classifyFaceMatch(91, 95, 85)).toBe('review');
      expect(classifyFaceMatch(96, 95, 85)).toBe('matched');
      expect(classifyFaceMatch(84, 95, 85)).toBe('unknown');
    });
  });

  describe('Anti-Proxy Duplicate Photo Detection', () => {
    const historicalHashes = ['dhash-CLS-101-2026-10-18', 'dhash-CLS-102-2026-10-19'];

    it('detects and flags recycled/duplicate photo hashes', () => {
      expect(checkDuplicatePhoto('dhash-CLS-101-2026-10-18', historicalHashes)).toBe(true);
    });

    it('accepts novel, previously unseen photos', () => {
      expect(checkDuplicatePhoto('dhash-CLS-101-2026-10-21-new', historicalHashes)).toBe(false);
    });
  });

  describe('75% Statutory Attendance Calculator', () => {
    it('correctly calculates missable lectures when attendance is above 75%', () => {
      // 36 attended out of 40 = 90%
      // 0.75 * (40 + x) <= 36  =>  30 + 0.75x <= 36  =>  0.75x <= 6  =>  x = 8
      const res = calculateAttendanceImpact(36, 40, 0.75);
      expect(res.rate).toBe(90);
      expect(res.isShortage).toBe(false);
      expect(res.missable).toBe(8);
      expect(res.needed).toBe(0);
    });

    it('correctly calculates needed lectures when attendance is below 75%', () => {
      // 20 attended out of 40 = 50%
      // (20 + y) / (40 + y) >= 0.75  =>  20 + y >= 30 + 0.75y  =>  0.25y >= 10  =>  y = 40
      const res = calculateAttendanceImpact(20, 40, 0.75);
      expect(res.rate).toBe(50);
      expect(res.isShortage).toBe(true);
      expect(res.missable).toBe(0);
      expect(res.needed).toBe(40);
    });
  });

  describe('Role-Based Route Guard Matrix', () => {
    it('grants admin access to administrative routes', () => {
      expect(checkRolePermission('admin', ['admin'])).toBe(true);
      expect(checkRolePermission('admin', ['teacher', 'admin'])).toBe(true);
    });

    it('prevents student from accessing admin or teacher routes', () => {
      expect(checkRolePermission('student', ['admin'])).toBe(false);
      expect(checkRolePermission('student', ['teacher', 'admin'])).toBe(false);
    });

    it('grants teacher access to teacher and common routes', () => {
      expect(checkRolePermission('teacher', ['teacher', 'admin'])).toBe(true);
      expect(checkRolePermission('teacher', ['admin'])).toBe(false);
    });
  });
});
