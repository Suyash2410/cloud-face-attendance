// Core Type Definitions for Haazri Face Attendance System

export type Role = 'admin' | 'teacher' | 'student';

export type EnrollmentState = 'not_enrolled' | 'partial' | 'enrolled';

export type AttendanceStatus = 'present' | 'absent' | 'manual';

export type AttendanceMethod = 'face' | 'manual';

export type SessionStatus = 'processing' | 'review' | 'confirmed';

export interface User {
  userId: string;
  role: Role;
  name: string;
  email: string;
  avatarUrl?: string;
  linkedStudentId?: string; // For student role
}

export interface Student {
  studentId: string; // Roll number e.g. "TE-A-01"
  name: string;
  email: string;
  division: 'TE-A' | 'TE-B' | 'TE-C';
  year: number; // e.g. 3
  phone?: string;
  status: 'active' | 'inactive';
  enrollmentState: EnrollmentState;
  faceIds: string[];
  photoKeys: string[];
  consentAt?: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface ClassItem {
  classId: string;
  subject: string;
  division: 'TE-A' | 'TE-B' | 'TE-C';
  year: number;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
  schedule: string; // e.g. "Mon, Wed 10:00 AM"
  totalSessions: number;
}

export interface BoundingBox {
  top: number; // Normalized 0-1
  left: number; // Normalized 0-1
  width: number; // Normalized 0-1
  height: number; // Normalized 0-1
}

export interface DetectedFace {
  faceId: string;
  boundingBox: BoundingBox;
  confidence: number; // e.g. 96.5
  matchedStudentId?: string;
  matchedStudentName?: string;
  status: 'matched' | 'review' | 'unknown'; // Green (>=90%), Amber (80-89%), Red (<80%)
  photoIndex: number;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  division: string;
  status: AttendanceStatus;
  confidence: number;
  method: AttendanceMethod;
  reason?: string;
  markedBy: string;
  markedAt: string;
  faceId?: string;
  isFlaggedProxy?: boolean;
}

export interface SessionStats {
  totalDetected: number;
  matchedCount: number;
  reviewCount: number;
  unknownCount: number;
  presentCount: number;
  absentCount: number;
  rosterCount: number;
}

export interface Session {
  sessionId: string;
  classId: string;
  subject: string;
  division: string;
  date: string; // YYYY-MM-DD
  slot: string; // e.g. "10:00 - 11:00 AM"
  photoUrls: string[];
  photoHashes: string[]; // For anti-proxy duplicate check
  status: SessionStatus;
  stats: SessionStats;
  detectedFaces: DetectedFace[];
  records: AttendanceRecord[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  confirmedAt?: string;
  editDeadline?: string; // 24 hours after confirmation
}

export interface AuditLogItem {
  id: string;
  date: string;
  timestamp: string;
  actor: {
    userId: string;
    name: string;
    role: Role;
  };
  action: 'LOGIN' | 'ATTENDANCE_OVERRIDE' | 'STUDENT_ENROLLED' | 'STUDENT_DELETED' | 'FACE_PURGED' | 'REPORT_EXPORTED' | 'SESSION_CONFIRMED' | 'SETTINGS_UPDATED';
  target: string;
  meta?: Record<string, any>;
}

export interface SystemSettings {
  matchThreshold: number; // default: 90
  reviewThreshold: number; // default: 80
  shortageThreshold: number; // default: 75
  editWindowHours: number; // default: 24
  photoRetentionDays: number; // default: 30
  collegeName: string;
  collegeLogoUrl: string;
  weeklyDigestEnabled: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'shortage' | 'session' | 'system';
  createdAt: string;
  read: boolean;
  targetRole?: Role;
}

export interface AnalyticsOverview {
  totalStudents: number;
  enrolledPercentage: number;
  todayOverallAttendance: number;
  activeClassesCount: number;
  totalSessionsMarked: number;
  shortageCount: number;
}
