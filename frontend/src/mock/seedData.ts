// Realistic Indian Seed Data Generator for Haazri Mock Mode
import { Student, ClassItem, Session, AttendanceRecord, DetectedFace, AuditLogItem, SystemSettings, NotificationItem, User } from '../types';

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Pooja', 'Vikram', 'Ishaan', 'Meera', 'Karan', 'Sneha', 'Aditya',
  'Tanvi', 'Siddharth', 'Neha', 'Rahul', 'Diya', 'Arjun', 'Kavya', 'Sameer', 'Riya', 'Pranav',
  'Shreya', 'Nikhil', 'Anushka', 'Varun', 'Isha', 'Harsh', 'Tara', 'Dev', 'Aditi', 'Manish',
  'Gauri', 'Yash', 'Roshni', 'Vivek', 'Sonal', 'Abhishek', 'Priyanka', 'Kunnal', 'Divya', 'Sanjay'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kulkarni', 'Nair', 'Deshmukh', 'Joshi', 'Iyer', 'Malhotra', 'Rao', 'Verma',
  'Choudhury', 'Shah', 'Gupta', 'Mehta', 'Sen', 'Reddy', 'Khan', 'Mukherjee', 'Patil', 'Hegde',
  'Bose', 'Menon', 'Bhat', 'Bhattacharya', 'Dubey', 'Chatterjee', 'Shetty', 'Pawar', 'Mishra', 'Pandey'
];

export const MOCK_TEACHERS: User[] = [
  {
    userId: 't-1',
    role: 'teacher',
    name: 'Dr. Rajesh Sharma',
    email: 'rajesh.sharma@engg.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    userId: 't-2',
    role: 'teacher',
    name: 'Prof. Sunita Kulkarni',
    email: 'sunita.k@engg.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    userId: 't-3',
    role: 'teacher',
    name: 'Dr. Amit Verma',
    email: 'amit.verma@engg.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  }
];

export const MOCK_ADMIN: User = {
  userId: 'adm-1',
  role: 'admin',
  name: 'Dr. Hemant Bhargava',
  email: 'admin@haazri.edu',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
};

export const MOCK_STUDENT_USER: User = {
  userId: 'stu-TE-A-01',
  role: 'student',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@engg.edu',
  linkedStudentId: 'TE-A-01',
  avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
};

export function generateSeedStudents(): Student[] {
  const students: Student[] = [];
  const divisions: Array<'TE-A' | 'TE-B' | 'TE-C'> = ['TE-A', 'TE-B', 'TE-C'];

  let nameIndex = 0;
  divisions.forEach((div) => {
    for (let i = 1; i <= 40; i++) {
      const roll = `${div}-${i.toString().padStart(2, '0')}`;
      const firstName = FIRST_NAMES[(nameIndex + i) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(nameIndex + i * 2) % LAST_NAMES.length];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@engg.edu`;

      // 92% fully enrolled, 5% partial, 3% not enrolled
      let enrollmentState: Student['enrollmentState'] = 'enrolled';
      let faceIds: string[] = [`face-${roll}-1`, `face-${roll}-2`, `face-${roll}-3`];
      let photoKeys: string[] = [`photos/${roll}/1.jpg`, `photos/${roll}/2.jpg`, `photos/${roll}/3.jpg`];
      let consentAt: string | undefined = '2026-08-10T10:00:00Z';

      if (i === 38) {
        enrollmentState = 'partial';
        faceIds = [`face-${roll}-1`];
        photoKeys = [`photos/${roll}/1.jpg`];
      } else if (i === 39 || i === 40) {
        enrollmentState = 'not_enrolled';
        faceIds = [];
        photoKeys = [];
        consentAt = undefined;
      }

      students.push({
        studentId: roll,
        name,
        email,
        division: div,
        year: 3,
        phone: `+91 98201 ${10000 + i + nameIndex}`,
        status: 'active',
        enrollmentState,
        faceIds,
        photoKeys,
        consentAt,
        createdAt: '2026-08-01T09:00:00Z',
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}&backgroundColor=f5f0e6`
      });
    }
    nameIndex += 40;
  });

  return students;
}

export function generateSeedClasses(students: Student[]): ClassItem[] {
  const teAStudents = students.filter(s => s.division === 'TE-A').map(s => s.studentId);
  const teBStudents = students.filter(s => s.division === 'TE-B').map(s => s.studentId);
  const teCStudents = students.filter(s => s.division === 'TE-C').map(s => s.studentId);

  return [
    {
      classId: 'CLS-101',
      subject: 'Cloud Computing',
      division: 'TE-C',
      year: 3,
      teacherId: 't-2',
      teacherName: 'Prof. Sunita Kulkarni',
      studentIds: teCStudents,
      schedule: 'Mon, Wed 10:00 AM',
      totalSessions: 42
    },
    {
      classId: 'CLS-102',
      subject: 'Database Systems',
      division: 'TE-A',
      year: 3,
      teacherId: 't-1',
      teacherName: 'Dr. Rajesh Sharma',
      studentIds: teAStudents,
      schedule: 'Tue, Thu 11:15 AM',
      totalSessions: 40
    },
    {
      classId: 'CLS-103',
      subject: 'Computer Networks',
      division: 'TE-B',
      year: 3,
      teacherId: 't-3',
      teacherName: 'Dr. Amit Verma',
      studentIds: teBStudents,
      schedule: 'Mon, Fri 02:00 PM',
      totalSessions: 38
    },
    {
      classId: 'CLS-104',
      subject: 'Machine Learning',
      division: 'TE-C',
      year: 3,
      teacherId: 't-2',
      teacherName: 'Prof. Sunita Kulkarni',
      studentIds: teCStudents,
      schedule: 'Wed, Fri 09:00 AM',
      totalSessions: 39
    },
    {
      classId: 'CLS-105',
      subject: 'Operating Systems',
      division: 'TE-A',
      year: 3,
      teacherId: 't-1',
      teacherName: 'Dr. Rajesh Sharma',
      studentIds: teAStudents,
      schedule: 'Mon, Thu 03:00 PM',
      totalSessions: 41
    },
    {
      classId: 'CLS-106',
      subject: 'Web Technologies',
      division: 'TE-B',
      year: 3,
      teacherId: 't-3',
      teacherName: 'Dr. Amit Verma',
      studentIds: teBStudents,
      schedule: 'Tue, Fri 11:15 AM',
      totalSessions: 36
    }
  ];
}

// Chronic defaulters who consistently miss classes to simulate low attendance (<75%)
export const CHRONIC_DEFAULTERS = ['TE-A-04', 'TE-A-12', 'TE-B-07', 'TE-B-18', 'TE-C-05', 'TE-C-14'];

export function generateSeedHistory(classes: ClassItem[], students: Student[]): { sessions: Session[]; auditLogs: AuditLogItem[] } {
  const sessions: Session[] = [];
  const auditLogs: AuditLogItem[] = [];

  const today = new Date('2026-10-21');
  const studentMap = new Map(students.map(s => [s.studentId, s]));

  // Generate 60 days of history
  for (let d = 59; d >= 0; d--) {
    const curDate = new Date(today);
    curDate.setDate(curDate.getDate() - d);

    // Skip Sundays
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek === 0) continue;

    const dateStr = curDate.toISOString().split('T')[0];
    const isMonday = dayOfWeek === 1;
    const isFriday = dayOfWeek === 5;
    // Exam dip around 20-25 days ago
    const isExamWeek = d >= 20 && d <= 25;

    // Pick 2 classes per day
    const dayClasses = classes.filter((_, idx) => (idx + d) % 2 === 0);

    dayClasses.forEach((cls) => {
      const sessionId = `SES-${cls.classId}-${dateStr}`;
      const roster = cls.studentIds;

      const records: AttendanceRecord[] = [];
      let presentCount = 0;
      let absentCount = 0;
      let manualCount = 0;

      roster.forEach((stuId) => {
        const student = studentMap.get(stuId);
        if (!student) return;

        const isDefaulter = CHRONIC_DEFAULTERS.includes(stuId);
        
        // Probability of attendance
        let presentProb = 0.88;
        if (isMonday || isFriday) presentProb -= 0.12;
        if (isExamWeek) presentProb -= 0.20;
        if (isDefaulter) presentProb = 0.45; // Chronic low attendance

        const isPresent = Math.random() < presentProb;
        const isManual = isPresent && Math.random() < 0.05; // 5% manual overrides
        const confidence = isPresent ? Math.floor(86 + Math.random() * 13) : 0; // 86-99%

        if (isPresent) {
          presentCount++;
          if (isManual) manualCount++;
        } else {
          absentCount++;
        }

        records.push({
          sessionId,
          studentId: stuId,
          studentName: student.name,
          rollNumber: student.studentId,
          division: cls.division,
          status: isPresent ? (isManual ? 'manual' : 'present') : 'absent',
          confidence,
          method: isManual ? 'manual' : 'face',
          reason: isManual ? 'Verified by faculty in person (lighting glare)' : undefined,
          markedBy: cls.teacherName,
          markedAt: `${dateStr}T11:05:00Z`
        });
      });

      const session: Session = {
        sessionId,
        classId: cls.classId,
        subject: cls.subject,
        division: cls.division,
        date: dateStr,
        slot: cls.schedule.split(' ').slice(1).join(' ') || '10:00 - 11:00 AM',
        photoUrls: ['/demo-classroom-1.svg'],
        photoHashes: [`dhash-${cls.classId}-${dateStr}`],
        status: 'confirmed',
        stats: {
          totalDetected: presentCount + 1,
          matchedCount: presentCount - manualCount,
          reviewCount: manualCount,
          unknownCount: 1,
          presentCount,
          absentCount,
          rosterCount: roster.length
        },
        detectedFaces: [],
        records,
        createdBy: cls.teacherId,
        createdByName: cls.teacherName,
        createdAt: `${dateStr}T10:55:00Z`,
        confirmedAt: `${dateStr}T11:05:00Z`
      };

      sessions.push(session);
    });
  }

  // Generate audit logs
  auditLogs.push(
    {
      id: 'log-1',
      date: '2026-10-21',
      timestamp: '2026-10-21T09:30:00Z',
      actor: { userId: 't-2', name: 'Prof. Sunita Kulkarni', role: 'teacher' },
      action: 'LOGIN',
      target: 'Auth System'
    },
    {
      id: 'log-2',
      date: '2026-10-20',
      timestamp: '2026-10-20T16:15:00Z',
      actor: { userId: 'adm-1', name: 'Dr. Hemant Bhargava', role: 'admin' },
      action: 'STUDENT_ENROLLED',
      target: 'TE-C-38 (Nikhil Hegde)'
    },
    {
      id: 'log-3',
      date: '2026-10-19',
      timestamp: '2026-10-19T11:10:00Z',
      actor: { userId: 't-1', name: 'Dr. Rajesh Sharma', role: 'teacher' },
      action: 'ATTENDANCE_OVERRIDE',
      target: 'TE-A-04 (Pooja Nair)',
      meta: { reason: 'Camera glare during capture' }
    },
    {
      id: 'log-4',
      date: '2026-10-18',
      timestamp: '2026-10-18T14:00:00Z',
      actor: { userId: 'adm-1', name: 'Dr. Hemant Bhargava', role: 'admin' },
      action: 'REPORT_EXPORTED',
      target: 'Monthly Defaulter Summary TE-C'
    }
  );

  return { sessions, auditLogs };
}

// Pre-defined sample classroom faces for offline mock review demonstration
export const SAMPLE_DETECTED_FACES: DetectedFace[] = [
  {
    faceId: 'face-box-1',
    boundingBox: { top: 0.22, left: 0.12, width: 0.11, height: 0.18 },
    confidence: 97.4,
    matchedStudentId: 'TE-C-01',
    matchedStudentName: 'Tanvi Choudhury',
    status: 'matched',
    photoIndex: 0
  },
  {
    faceId: 'face-box-2',
    boundingBox: { top: 0.24, left: 0.28, width: 0.10, height: 0.17 },
    confidence: 96.1,
    matchedStudentId: 'TE-C-02',
    matchedStudentName: 'Siddharth Shah',
    status: 'matched',
    photoIndex: 0
  },
  {
    faceId: 'face-box-3',
    boundingBox: { top: 0.21, left: 0.44, width: 0.12, height: 0.19 },
    confidence: 95.8,
    matchedStudentId: 'TE-C-03',
    matchedStudentName: 'Neha Gupta',
    status: 'matched',
    photoIndex: 0
  },
  {
    faceId: 'face-box-4',
    boundingBox: { top: 0.23, left: 0.60, width: 0.11, height: 0.18 },
    confidence: 94.2,
    matchedStudentId: 'TE-C-04',
    matchedStudentName: 'Rahul Mehta',
    status: 'matched',
    photoIndex: 0
  },
  {
    faceId: 'face-box-5',
    boundingBox: { top: 0.48, left: 0.15, width: 0.13, height: 0.22 },
    confidence: 84.5, // Review band (80-89%)
    matchedStudentId: 'TE-C-05',
    matchedStudentName: 'Diya Sen',
    status: 'review',
    photoIndex: 0
  },
  {
    faceId: 'face-box-6',
    boundingBox: { top: 0.50, left: 0.35, width: 0.14, height: 0.23 },
    confidence: 98.2,
    matchedStudentId: 'TE-C-06',
    matchedStudentName: 'Arjun Reddy',
    status: 'matched',
    photoIndex: 0
  },
  {
    faceId: 'face-box-7',
    boundingBox: { top: 0.49, left: 0.55, width: 0.13, height: 0.21 },
    confidence: 82.1, // Review band (80-89%)
    matchedStudentId: 'TE-C-07',
    matchedStudentName: 'Kavya Nair',
    status: 'review',
    photoIndex: 0
  },
  {
    faceId: 'face-box-8',
    boundingBox: { top: 0.47, left: 0.74, width: 0.12, height: 0.20 },
    confidence: 62.0, // Unknown face (<80%)
    status: 'unknown',
    photoIndex: 0
  }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  matchThreshold: 90,
  reviewThreshold: 80,
  shortageThreshold: 75,
  editWindowHours: 24,
  photoRetentionDays: 30,
  collegeName: 'Veermata Jijabai Technological Institute (VJTI)',
  collegeLogoUrl: '/favicon.svg',
  weeklyDigestEnabled: true
};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Attendance Shortage Alert',
    message: 'Diya Sen (TE-C-05) has fallen to 68.2% in Cloud Computing.',
    type: 'shortage',
    createdAt: '2026-10-21T09:15:00Z',
    read: false,
    targetRole: 'teacher'
  },
  {
    id: 'notif-2',
    title: 'Session Pending Review',
    message: 'TE-C Cloud Computing lecture has 2 low-confidence faces.',
    type: 'session',
    createdAt: '2026-10-21T10:45:00Z',
    read: false,
    targetRole: 'teacher'
  },
  {
    id: 'notif-3',
    title: 'System S3 Retention Notice',
    message: 'Class photos older than 30 days were safely purged per retention policy.',
    type: 'system',
    createdAt: '2026-10-20T00:00:00Z',
    read: true,
    targetRole: 'admin'
  }
];
