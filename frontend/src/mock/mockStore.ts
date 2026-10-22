// Mock Store for Haazri Offline Mock Mode
import {
  Student, ClassItem, Session, AttendanceRecord, DetectedFace,
  AuditLogItem, SystemSettings, NotificationItem, User,
  AnalyticsOverview, AttendanceStatus
} from '../types';
import {
  generateSeedStudents, generateSeedClasses, generateSeedHistory,
  DEFAULT_SETTINGS, MOCK_NOTIFICATIONS, MOCK_ADMIN, MOCK_TEACHERS,
  MOCK_STUDENT_USER, SAMPLE_DETECTED_FACES
} from './seedData';

const STORAGE_KEYS = {
  STUDENTS: 'haazri_students_v1',
  CLASSES: 'haazri_classes_v1',
  SESSIONS: 'haazri_sessions_v1',
  AUDIT: 'haazri_audit_v1',
  SETTINGS: 'haazri_settings_v1',
  NOTIFICATIONS: 'haazri_notifs_v1',
  ACTIVE_USER: 'haazri_user_v1',
};

class MockStore {
  private students: Student[] = [];
  private classes: ClassItem[] = [];
  private sessions: Session[] = [];
  private auditLogs: AuditLogItem[] = [];
  private settings: SystemSettings = DEFAULT_SETTINGS;
  private notifications: NotificationItem[] = [];
  private currentUser: User = MOCK_ADMIN;

  constructor() {
    this.init();
  }

  private init() {
    const storedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const storedClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
    const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const storedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const storedUser = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);

    if (storedStudents && storedClasses && storedSessions) {
      try {
        this.students = JSON.parse(storedStudents);
        this.classes = JSON.parse(storedClasses);
        this.sessions = JSON.parse(storedSessions);
        this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [];
        this.settings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
        this.notifications = storedNotifs ? JSON.parse(storedNotifs) : MOCK_NOTIFICATIONS;
        this.currentUser = storedUser ? JSON.parse(storedUser) : MOCK_ADMIN;
        return;
      } catch (e) {
        console.error('Failed to parse localStorage data, re-seeding...', e);
      }
    }

    this.resetDemoData();
  }

  public resetDemoData() {
    this.students = generateSeedStudents();
    this.classes = generateSeedClasses(this.students);
    const { sessions, auditLogs } = generateSeedHistory(this.classes, this.students);
    this.sessions = sessions;
    this.auditLogs = auditLogs;
    this.settings = { ...DEFAULT_SETTINGS };
    this.notifications = [...MOCK_NOTIFICATIONS];
    this.currentUser = MOCK_ADMIN;

    this.persistAll();
  }

  private persistAll() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(this.classes));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(this.auditLogs));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(this.currentUser));
  }

  // Auth & Roles
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    this.addAuditLog('LOGIN', `User signed in as ${user.name} (${user.role})`);
  }

  public switchRole(role: 'admin' | 'teacher' | 'student') {
    if (role === 'admin') {
      this.setCurrentUser(MOCK_ADMIN);
    } else if (role === 'teacher') {
      this.setCurrentUser(MOCK_TEACHERS[1]); // Prof. Sunita Kulkarni
    } else {
      this.setCurrentUser(MOCK_STUDENT_USER); // Aarav Sharma
    }
  }

  // Students CRUD
  public getStudents(): Student[] {
    return [...this.students];
  }

  public getStudent(id: string): Student | undefined {
    return this.students.find(s => s.studentId === id);
  }

  public createStudent(student: Omit<Student, 'createdAt' | 'enrollmentState' | 'faceIds' | 'photoKeys'>): Student {
    // Check duplicate roll number
    if (this.students.some(s => s.studentId.toLowerCase() === student.studentId.toLowerCase())) {
      throw new Error(`Roll number ${student.studentId} already exists`);
    }

    const newStudent: Student = {
      ...student,
      enrollmentState: 'not_enrolled',
      faceIds: [],
      photoKeys: [],
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${student.name}&backgroundColor=f5f0e6`
    };

    this.students.unshift(newStudent);
    this.persistAll();
    this.addAuditLog('STUDENT_ENROLLED', `New student created: ${newStudent.name} (${newStudent.studentId})`);
    return newStudent;
  }

  public updateStudent(id: string, updates: Partial<Student>): Student {
    const idx = this.students.findIndex(s => s.studentId === id);
    if (idx === -1) throw new Error(`Student ${id} not found`);

    this.students[idx] = { ...this.students[idx], ...updates };
    this.persistAll();
    return this.students[idx];
  }

  public deleteStudent(id: string): void {
    const student = this.getStudent(id);
    if (!student) throw new Error(`Student ${id} not found`);

    this.students = this.students.filter(s => s.studentId !== id);
    this.persistAll();
    this.addAuditLog('STUDENT_DELETED', `Student deleted: ${student.name} (${student.studentId})`);
  }

  public enrollStudentFaces(id: string, photosCount: number): Student {
    const student = this.getStudent(id);
    if (!student) throw new Error(`Student ${id} not found`);

    const now = new Date().toISOString();
    const faceIds = Array.from({ length: photosCount }, (_, i) => `face-${id}-${i + 1}`);
    const photoKeys = Array.from({ length: photosCount }, (_, i) => `photos/${id}/${i + 1}.jpg`);

    const updated = this.updateStudent(id, {
      enrollmentState: 'enrolled',
      faceIds,
      photoKeys,
      consentAt: now
    });

    this.addAuditLog('STUDENT_ENROLLED', `Enrolled ${photosCount} face templates for ${student.name} (${student.studentId})`);
    return updated;
  }

  public deleteStudentFaces(id: string): Student {
    const student = this.getStudent(id);
    if (!student) throw new Error(`Student ${id} not found`);

    const updated = this.updateStudent(id, {
      enrollmentState: 'not_enrolled',
      faceIds: [],
      photoKeys: [],
      consentAt: undefined
    });

    this.addAuditLog('FACE_PURGED', `Purged biometric face vectors for ${student.name} (${student.studentId})`);
    return updated;
  }

  public importStudentsCSV(newStudents: Array<Omit<Student, 'createdAt' | 'enrollmentState' | 'faceIds' | 'photoKeys'>>): { added: number; errors: string[] } {
    const errors: string[] = [];
    let added = 0;

    newStudents.forEach((st, idx) => {
      const exists = this.students.some(s => s.studentId.toLowerCase() === st.studentId.toLowerCase());
      if (exists) {
        errors.push(`Row ${idx + 1}: Duplicate roll number "${st.studentId}"`);
      } else {
        this.createStudent(st);
        added++;
      }
    });

    return { added, errors };
  }

  // Classes
  public getClasses(teacherId?: string): ClassItem[] {
    if (teacherId) {
      return this.classes.filter(c => c.teacherId === teacherId);
    }
    return [...this.classes];
  }

  public getClass(id: string): ClassItem | undefined {
    return this.classes.find(c => c.classId === id);
  }

  public createClass(classData: Omit<ClassItem, 'classId' | 'totalSessions'>): ClassItem {
    const classId = `CLS-${100 + this.classes.length + 1}`;
    const newClass: ClassItem = {
      ...classData,
      classId,
      totalSessions: 0
    };
    this.classes.push(newClass);
    this.persistAll();
    return newClass;
  }

  public updateClass(id: string, updates: Partial<ClassItem>): ClassItem {
    const idx = this.classes.findIndex(c => c.classId === id);
    if (idx === -1) throw new Error(`Class ${id} not found`);
    this.classes[idx] = { ...this.classes[idx], ...updates };
    this.persistAll();
    return this.classes[idx];
  }

  // Attendance Sessions & Anti-Proxy
  public getSessions(classId?: string): Session[] {
    if (classId) {
      return this.sessions.filter(s => s.classId === classId);
    }
    return [...this.sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getSession(id: string): Session | undefined {
    return this.sessions.find(s => s.sessionId === id);
  }

  public createSession(classId: string, date: string, slot: string, photoUrls: string[]): Session {
    const cls = this.getClass(classId);
    if (!cls) throw new Error(`Class ${classId} not found`);

    const sessionId = `SES-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // Compute simple perceptual hash simulation for duplicate photo check
    const photoHashes = photoUrls.map(url => `hash-${url.length}-${url.slice(-15)}`);

    // Check duplicate photo hash in prior sessions
    const isDuplicate = this.sessions.some(s => 
      s.photoHashes && s.photoHashes.some(h => photoHashes.includes(h))
    );

    if (isDuplicate) {
      throw new Error('Anti-Proxy Alert: This exact photo was already uploaded for a prior session.');
    }

    const roster = cls.studentIds;
    const studentMap = new Map(this.students.map(s => [s.studentId, s]));

    // Match detected sample faces against class roster
    const detectedFaces: DetectedFace[] = JSON.parse(JSON.stringify(SAMPLE_DETECTED_FACES));
    
    // Map faces to students
    const matchedStudentIds = new Set<string>();
    const records: AttendanceRecord[] = [];

    detectedFaces.forEach(face => {
      if (face.matchedStudentId && roster.includes(face.matchedStudentId)) {
        matchedStudentIds.add(face.matchedStudentId);
        const stu = studentMap.get(face.matchedStudentId);
        if (stu) {
          records.push({
            sessionId,
            studentId: stu.studentId,
            studentName: stu.name,
            rollNumber: stu.studentId,
            division: cls.division,
            status: face.status === 'matched' ? 'present' : 'present', // Initially present but flagged for review
            confidence: face.confidence,
            method: 'face',
            markedBy: this.currentUser.name,
            markedAt: now,
            faceId: face.faceId
          });
        }
      }
    });

    // Absent students (in roster but not detected/matched)
    roster.forEach(stuId => {
      if (!matchedStudentIds.has(stuId)) {
        const stu = studentMap.get(stuId);
        if (stu) {
          records.push({
            sessionId,
            studentId: stu.studentId,
            studentName: stu.name,
            rollNumber: stu.studentId,
            division: cls.division,
            status: 'absent',
            confidence: 0,
            method: 'face',
            markedBy: this.currentUser.name,
            markedAt: now
          });
        }
      }
    });

    const presentCount = records.filter(r => r.status === 'present' || r.status === 'manual').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const reviewCount = detectedFaces.filter(f => f.status === 'review').length;
    const unknownCount = detectedFaces.filter(f => f.status === 'unknown').length;

    const newSession: Session = {
      sessionId,
      classId,
      subject: cls.subject,
      division: cls.division,
      date,
      slot,
      photoUrls: photoUrls.length > 0 ? photoUrls : ['/demo-classroom-1.svg'],
      photoHashes,
      status: 'review',
      stats: {
        totalDetected: detectedFaces.length,
        matchedCount: detectedFaces.filter(f => f.status === 'matched').length,
        reviewCount,
        unknownCount,
        presentCount,
        absentCount,
        rosterCount: roster.length
      },
      detectedFaces,
      records,
      createdBy: this.currentUser.userId,
      createdByName: this.currentUser.name,
      createdAt: now
    };

    this.sessions.unshift(newSession);
    this.persistAll();
    return newSession;
  }

  public overrideAttendance(sessionId: string, studentId: string, status: AttendanceStatus, reason: string): Session {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A mandatory reason is required for manual attendance override.');
    }

    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const record = session.records.find(r => r.studentId === studentId);
    if (!record) throw new Error(`Student ${studentId} not in session`);

    record.status = status;
    record.method = 'manual';
    record.reason = reason;
    record.markedBy = this.currentUser.name;
    record.markedAt = new Date().toISOString();

    // Recalculate stats
    session.stats.presentCount = session.records.filter(r => r.status === 'present' || r.status === 'manual').length;
    session.stats.absentCount = session.records.filter(r => r.status === 'absent').length;

    this.persistAll();
    this.addAuditLog('ATTENDANCE_OVERRIDE', `Manual override for ${record.studentName} (${record.rollNumber}) to ${status}`, { reason });
    return session;
  }

  public assignUnknownFace(sessionId: string, faceId: string, studentId: string): Session {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const face = session.detectedFaces.find(f => f.faceId === faceId);
    if (!face) throw new Error(`Face ${faceId} not found`);

    const student = this.getStudent(studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);

    // Assign face
    face.matchedStudentId = student.studentId;
    face.matchedStudentName = student.name;
    face.status = 'matched';

    // Update attendance record
    const record = session.records.find(r => r.studentId === studentId);
    if (record) {
      record.status = 'present';
      record.confidence = 90.0;
      record.faceId = faceId;
      record.method = 'manual';
      record.reason = 'Assigned from unknown detected face by teacher';
    }

    // Recalculate stats
    session.stats.reviewCount = session.detectedFaces.filter(f => f.status === 'review').length;
    session.stats.unknownCount = session.detectedFaces.filter(f => f.status === 'unknown').length;
    session.stats.matchedCount = session.detectedFaces.filter(f => f.status === 'matched').length;
    session.stats.presentCount = session.records.filter(r => r.status === 'present' || r.status === 'manual').length;
    session.stats.absentCount = session.records.filter(r => r.status === 'absent').length;

    this.persistAll();
    this.addAuditLog('ATTENDANCE_OVERRIDE', `Assigned unknown face to ${student.name} (${student.studentId})`);
    return session;
  }

  public confirmSession(sessionId: string): Session {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const now = new Date();
    session.status = 'confirmed';
    session.confirmedAt = now.toISOString();

    const deadline = new Date(now.getTime() + this.settings.editWindowHours * 60 * 60 * 1000);
    session.editDeadline = deadline.toISOString();

    // Increment class total sessions
    const cls = this.getClass(session.classId);
    if (cls) {
      cls.totalSessions += 1;
    }

    this.persistAll();
    this.addAuditLog('SESSION_CONFIRMED', `Confirmed attendance session for ${session.subject} (${session.division})`);
    return session;
  }

  // Analytics
  public getAnalyticsOverview(): AnalyticsOverview {
    const totalStudents = this.students.length;
    const enrolledStudents = this.students.filter(s => s.enrollmentState === 'enrolled').length;
    const enrolledPercentage = totalStudents > 0 ? Math.round((enrolledStudents / totalStudents) * 100) : 0;

    // Today's attendance
    const today = '2026-10-21';
    const todaySessions = this.sessions.filter(s => s.date === today);
    let todayOverallAttendance = 88;
    if (todaySessions.length > 0) {
      const totalPresent = todaySessions.reduce((acc, s) => acc + s.stats.presentCount, 0);
      const totalRoster = todaySessions.reduce((acc, s) => acc + s.stats.rosterCount, 0);
      todayOverallAttendance = totalRoster > 0 ? Math.round((totalPresent / totalRoster) * 100) : 88;
    }

    // Shortage count (<75%)
    const defaulters = this.getDefaulters();

    return {
      totalStudents,
      enrolledPercentage,
      todayOverallAttendance,
      activeClassesCount: this.classes.length,
      totalSessionsMarked: this.sessions.length,
      shortageCount: defaulters.length
    };
  }

  public getAttendanceTrend(subject?: string) {
    const filteredSessions = subject && subject !== 'all'
      ? this.sessions.filter(s => s.subject === subject)
      : this.sessions;

    // Group by date, last 30 days
    const dateMap = new Map<string, { present: number; total: number }>();
    filteredSessions.forEach(s => {
      const existing = dateMap.get(s.date) || { present: 0, total: 0 };
      existing.present += s.stats.presentCount;
      existing.total += s.stats.rosterCount;
      dateMap.set(s.date, existing);
    });

    const sortedDates = Array.from(dateMap.keys()).sort().slice(-30);
    return sortedDates.map(date => {
      const data = dateMap.get(date)!;
      const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 85;
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date,
        label: `${new Date(date).getDate()} ${new Date(date).toLocaleDateString('en-US', { month: 'short' })}`,
        rate,
        present: data.present,
        total: data.total,
        isWeekend: dayName === 'Sat' || dayName === 'Sun'
      };
    });
  }

  public getStatusDonut() {
    let present = 0;
    let absent = 0;
    let manual = 0;

    this.sessions.slice(0, 40).forEach(s => {
      s.records.forEach(r => {
        if (r.method === 'manual') manual++;
        else if (r.status === 'present') present++;
        else absent++;
      });
    });

    const total = present + absent + manual;
    return [
      { name: 'Present (Face AI)', value: present, color: '#0F5C5A' },
      { name: 'Absent', value: absent, color: '#B5412A' },
      { name: 'Manual Override', value: manual, color: '#E8A317' }
    ];
  }

  public getSubjectComparison() {
    return [
      { subject: 'Cloud Comp.', 'TE-A': 88, 'TE-B': 84, 'TE-C': 91 },
      { subject: 'Database Sys.', 'TE-A': 92, 'TE-B': 86, 'TE-C': 89 },
      { subject: 'Comp. Networks', 'TE-A': 81, 'TE-B': 89, 'TE-C': 85 },
      { subject: 'Machine Learn.', 'TE-A': 85, 'TE-B': 83, 'TE-C': 93 },
      { subject: 'Operating Sys.', 'TE-A': 90, 'TE-B': 87, 'TE-C': 86 },
      { subject: 'Web Tech.', 'TE-A': 87, 'TE-B': 91, 'TE-C': 88 }
    ];
  }

  public getCalendarHeatmap() {
    // 60-day intensity array
    const dateMap = new Map<string, number>();
    this.sessions.forEach(s => {
      const current = dateMap.get(s.date) || 0;
      const rate = s.stats.rosterCount > 0 ? (s.stats.presentCount / s.stats.rosterCount) * 100 : 85;
      dateMap.set(s.date, Math.max(current, rate));
    });

    const days: Array<{ date: string; rate: number; level: number }> = [];
    const today = new Date('2026-10-21');
    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const rate = Math.round(dateMap.get(dateStr) || 82);
      
      let level = 3;
      if (rate >= 90) level = 4;
      else if (rate >= 80) level = 3;
      else if (rate >= 70) level = 2;
      else level = 1;

      days.push({ date: dateStr, rate, level });
    }
    return days;
  }

  public getConfidenceDistribution() {
    return [
      { range: '95-100%', count: 482, color: '#0F5C5A' },
      { range: '90-94%', count: 215, color: '#1EB2AF' },
      { range: '85-89%', count: 64, color: '#E8A317' },
      { range: '80-84%', count: 28, color: '#F5B838' },
      { range: '<80%', count: 12, color: '#B5412A' }
    ];
  }

  public getDefaulters() {
    // Calculate aggregate attendance per student across all sessions
    const studentStats = new Map<string, { present: number; total: number; name: string; roll: string; div: string }>();

    this.students.forEach(s => {
      studentStats.set(s.studentId, { present: 0, total: 0, name: s.name, roll: s.studentId, div: s.division });
    });

    this.sessions.forEach(session => {
      session.records.forEach(r => {
        const entry = studentStats.get(r.studentId);
        if (entry) {
          entry.total += 1;
          if (r.status === 'present' || r.status === 'manual') {
            entry.present += 1;
          }
        }
      });
    });

    const defaulters: Array<{ roll: string; name: string; division: string; rate: number; missed: number; total: number }> = [];

    studentStats.forEach((val) => {
      if (val.total > 0) {
        const rate = Math.round((val.present / val.total) * 100);
        if (rate < this.settings.shortageThreshold) {
          defaulters.push({
            roll: val.roll,
            name: val.name,
            division: val.div,
            rate,
            missed: val.total - val.present,
            total: val.total
          });
        }
      }
    });

    return defaulters.sort((a, b) => a.rate - b.rate).slice(0, 10);
  }

  // Student Portal Data
  public getStudentPortalData(studentId: string) {
    const student = this.getStudent(studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);

    // Subject breakdown
    const subjectMap = new Map<string, { present: number; total: number }>();
    this.classes.forEach(c => {
      if (c.studentIds.includes(studentId)) {
        subjectMap.set(c.subject, { present: 0, total: 0 });
      }
    });

    const history: Array<{ date: string; subject: string; status: AttendanceStatus; method: string }> = [];

    this.sessions.forEach(sess => {
      const record = sess.records.find(r => r.studentId === studentId);
      if (record) {
        const subEntry = subjectMap.get(sess.subject) || { present: 0, total: 0 };
        subEntry.total += 1;
        if (record.status === 'present' || record.status === 'manual') {
          subEntry.present += 1;
        }
        subjectMap.set(sess.subject, subEntry);

        history.push({
          date: sess.date,
          subject: sess.subject,
          status: record.status,
          method: record.method
        });
      }
    });

    const subjects = Array.from(subjectMap.entries()).map(([name, data]) => {
      const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 100;
      // 75% rule calculator: classes you can still miss or need to attend
      // Formula: (present) / (total + x) >= 0.75  =>  0.75*(total + x) <= present  =>  0.75x <= present - 0.75*total
      // If rate >= 75%: max missable = floor((present - 0.75*total) / 0.75)
      // If rate < 75%: needed classes = ceil((0.75*total - present) / (1 - 0.75))
      let missable = 0;
      let needed = 0;
      if (rate >= 75) {
        missable = Math.max(0, Math.floor((data.present - 0.75 * data.total) / 0.75));
      } else {
        needed = Math.max(0, Math.ceil((0.75 * data.total - data.present) / 0.25));
      }

      return {
        subject: name,
        present: data.present,
        total: data.total,
        rate,
        isShortage: rate < 75,
        missable,
        needed
      };
    });

    const totalSessions = subjects.reduce((a, s) => a + s.total, 0);
    const totalPresent = subjects.reduce((a, s) => a + s.present, 0);
    const overallRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;

    return {
      student,
      overallRate,
      isShortage: overallRate < 75,
      subjects,
      history: history.slice(-25)
    };
  }

  // Audit Logs
  public getAuditLogs(): AuditLogItem[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(action: AuditLogItem['action'], target: string, meta?: Record<string, any>) {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      actor: {
        userId: this.currentUser.userId,
        name: this.currentUser.name,
        role: this.currentUser.role
      },
      action,
      target,
      meta
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.persistAll();
  }

  // Settings
  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...updates };
    this.persistAll();
    this.addAuditLog('SETTINGS_UPDATED', 'System settings changed', updates);
    return this.settings;
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public markNotificationRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.persistAll();
    }
  }

  // Daily Shortage Alert Runner (Simulates EventBridge Lambda job)
  public runShortageAlertJob(): { notifiedCount: number; defaulters: string[] } {
    const defaulters = this.getDefaulters();
    const defaulterNames: string[] = [];

    defaulters.forEach(d => {
      defaulterNames.push(`${d.name} (${d.roll}) - ${d.rate}%`);
      console.log(`[Haazri Alert Simulation] Sent warning email to ${d.name} <${d.roll.toLowerCase()}@engg.edu> and faculty: Attendance ${d.rate}% is below ${this.settings.shortageThreshold}% requirement.`);
      
      this.notifications.unshift({
        id: `notif-${Date.now()}-${d.roll}`,
        title: `Attendance Defaulter Warning: ${d.name}`,
        message: `${d.name} (${d.roll}) has ${d.rate}% overall attendance (below ${this.settings.shortageThreshold}%). Alert sent to student & class teacher.`,
        type: 'shortage',
        createdAt: new Date().toISOString(),
        read: false,
        targetRole: 'teacher'
      });
    });

    this.persistAll();
    return { notifiedCount: defaulters.length, defaulters: defaulterNames };
  }
}

export const mockStore = new MockStore();
