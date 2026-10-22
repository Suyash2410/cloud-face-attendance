// Unified API Client: Seamlessly switches between Mock Mode and Live AWS Mode
import { mockStore } from '../mock/mockStore';
import {
  Student, ClassItem, Session, AttendanceRecord,
  AuditLogItem, SystemSettings, NotificationItem, User,
  AnalyticsOverview, AttendanceStatus
} from '../types';

const IS_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.haazri.example.com';

// Simulate slight network latency in mock mode for realistic UX feedback
const delay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('haazri_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  isMock: IS_MOCK,

  // Auth
  auth: {
    getCurrentUser: async (): Promise<User> => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getCurrentUser();
      }
      const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'omit', headers: getAuthHeader() });
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
    switchMockRole: async (role: 'admin' | 'teacher' | 'student'): Promise<User> => {
      mockStore.switchRole(role);
      return mockStore.getCurrentUser();
    }
  },

  // Students
  students: {
    list: async (): Promise<Student[]> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getStudents();
      }
      const res = await fetch(`${API_BASE_URL}/students`, { headers: getAuthHeader() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.students || data.items || []);
    },
    get: async (id: string): Promise<Student | undefined> => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getStudent(id);
      }
      const res = await fetch(`${API_BASE_URL}/students/${id}`, { headers: getAuthHeader() });
      return res.json();
    },
    create: async (student: Omit<Student, 'createdAt' | 'enrollmentState' | 'faceIds' | 'photoKeys'>): Promise<Student> => {
      if (IS_MOCK) {
        await delay(250);
        return mockStore.createStudent(student);
      }
      const res = await fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(student)
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<Student>): Promise<Student> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.updateStudent(id, updates);
      }
      const res = await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates)
      });
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.deleteStudent(id);
      }
      await fetch(`${API_BASE_URL}/students/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
    },
    enrollPhotos: async (id: string, photos: string[] | number): Promise<Student> => {
      if (IS_MOCK) {
        await delay(400); // Simulate Rekognition DetectFaces quality check + IndexFaces
        const count = typeof photos === 'number' ? photos : photos.length;
        return mockStore.enrollStudentFaces(id, count);
      }
      const payload = typeof photos === 'number' ? { photosCount: photos } : { photos };
      const res = await fetch(`${API_BASE_URL}/students/${id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Enrollment failed');
      }
      return res.json();
    },
    deleteFaces: async (id: string): Promise<Student> => {
      if (IS_MOCK) {
        await delay(300);
        return mockStore.deleteStudentFaces(id);
      }
      const res = await fetch(`${API_BASE_URL}/students/${id}/faces`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      return res.json();
    },
    importCSV: async (students: Array<Omit<Student, 'createdAt' | 'enrollmentState' | 'faceIds' | 'photoKeys'>>): Promise<{ added: number; errors: string[] }> => {
      if (IS_MOCK) {
        await delay(350);
        return mockStore.importStudentsCSV(students);
      }
      const res = await fetch(`${API_BASE_URL}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ students })
      });
      return res.json();
    }
  },

  // Classes
  classes: {
    list: async (teacherId?: string): Promise<ClassItem[]> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getClasses(teacherId);
      }
      const url = teacherId ? `${API_BASE_URL}/classes?teacherId=${teacherId}` : `${API_BASE_URL}/classes`;
      const res = await fetch(url, { headers: getAuthHeader() });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.classes || data.items || []);
    },
    get: async (id: string): Promise<ClassItem | undefined> => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getClass(id);
      }
      const res = await fetch(`${API_BASE_URL}/classes/${id}`, { headers: getAuthHeader() });
      return res.json();
    },
    create: async (data: Omit<ClassItem, 'classId' | 'totalSessions'>): Promise<ClassItem> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.createClass(data);
      }
      const res = await fetch(`${API_BASE_URL}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    update: async (id: string, updates: Partial<ClassItem>): Promise<ClassItem> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.updateClass(id, updates);
      }
      const res = await fetch(`${API_BASE_URL}/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates)
      });
      return res.json();
    }
  },

  // Sessions & Attendance
  sessions: {
    list: async (classId?: string): Promise<Session[]> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.getSessions(classId);
      }
      const url = classId ? `${API_BASE_URL}/sessions?classId=${classId}` : `${API_BASE_URL}/sessions`;
      const res = await fetch(url, { headers: getAuthHeader() });
      return res.json();
    },
    get: async (id: string): Promise<Session | undefined> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getSession(id);
      }
      const res = await fetch(`${API_BASE_URL}/sessions/${id}`, { headers: getAuthHeader() });
      return res.json();
    },
    create: async (classId: string, date: string, slot: string, photoUrls: string[], isDemo?: boolean): Promise<Session> => {
      if (IS_MOCK) {
        await delay(350);
        return mockStore.createSession(classId, date, slot, photoUrls);
      }
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ classId, date, slot, photoUrls, isDemo })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Session processing failed (HTTP ${res.status})`);
      }
      return res.json();
    },
    overrideAttendance: async (sessionId: string, studentId: string, status: AttendanceStatus, reason: string): Promise<Session> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.overrideAttendance(sessionId, studentId, status, reason);
      }
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/attendance/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status, reason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Attendance override failed');
      }
      return res.json();
    },
    assignUnknownFace: async (sessionId: string, faceId: string, studentId: string): Promise<Session> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.assignUnknownFace(sessionId, faceId, studentId);
      }
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/assign-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ faceId, studentId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Assign unknown face failed');
      }
      return res.json();
    },
    confirm: async (sessionId: string): Promise<Session> => {
      if (IS_MOCK) {
        await delay(300);
        return mockStore.confirmSession(sessionId);
      }
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Confirm session failed');
      }
      return res.json();
    }
  },

  // Analytics
  analytics: {
    getOverview: async (): Promise<AnalyticsOverview> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getAnalyticsOverview();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/overview`, { headers: getAuthHeader() });
      return res.json();
    },
    getTrend: async (subject?: string) => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getAttendanceTrend(subject);
      }
      const res = await fetch(`${API_BASE_URL}/analytics/trend?subject=${subject || 'all'}`, { headers: getAuthHeader() });
      return res.json();
    },
    getStatusDonut: async () => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getStatusDonut();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/status-split`, { headers: getAuthHeader() });
      return res.json();
    },
    getSubjectComparison: async () => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getSubjectComparison();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/subjects`, { headers: getAuthHeader() });
      return res.json();
    },
    getHeatmap: async () => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getCalendarHeatmap();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/heatmap`, { headers: getAuthHeader() });
      return res.json();
    },
    getDefaulters: async () => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getDefaulters();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/defaulters`, { headers: getAuthHeader() });
      return res.json();
    },
    getConfidenceDistribution: async () => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getConfidenceDistribution();
      }
      const res = await fetch(`${API_BASE_URL}/analytics/confidence`, { headers: getAuthHeader() });
      return res.json();
    },
    getStudentPortal: async (studentId: string) => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.getStudentPortalData(studentId);
      }
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/portal`, { headers: getAuthHeader() });
      return res.json();
    }
  },

  // Settings & System
  settings: {
    get: async (): Promise<SystemSettings> => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getSettings();
      }
      const res = await fetch(`${API_BASE_URL}/settings`, { headers: getAuthHeader() });
      return res.json();
    },
    update: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
      if (IS_MOCK) {
        await delay(200);
        return mockStore.updateSettings(settings);
      }
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings)
      });
      return res.json();
    },
    resetDemo: async (): Promise<void> => {
      if (IS_MOCK) {
        await delay(300);
        mockStore.resetDemoData();
      }
    }
  },

  // Audit Log
  audit: {
    list: async (): Promise<AuditLogItem[]> => {
      if (IS_MOCK) {
        await delay(150);
        return mockStore.getAuditLogs();
      }
      const res = await fetch(`${API_BASE_URL}/audit`, { headers: getAuthHeader() });
      return res.json();
    }
  },

  // Notifications & Alerts
  notifications: {
    list: async (): Promise<NotificationItem[]> => {
      if (IS_MOCK) {
        await delay(100);
        return mockStore.getNotifications();
      }
      const res = await fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeader() });
      return res.json();
    },
    markRead: async (id: string): Promise<void> => {
      if (IS_MOCK) {
        mockStore.markNotificationRead(id);
        return;
      }
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeader()
      });
    },
    triggerShortageAlertJob: async (): Promise<{ notifiedCount: number; defaulters: string[] }> => {
      if (IS_MOCK) {
        await delay(300);
        return mockStore.runShortageAlertJob();
      }
      const res = await fetch(`${API_BASE_URL}/alerts/shortage/run`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      return res.json();
    }
  }
};
