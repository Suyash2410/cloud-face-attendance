import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassItem, Session, DetectedFace, AttendanceRecord, Student } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Camera, Upload, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, RefreshCw, X, UserPlus, Eye, Lock,
  ChevronRight, Sparkles, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const TakeAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  // Stepper state: 1: Setup, 2: Upload, 3: Processing, 4: Review, 5: Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Classes & Selection
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [lectureDate, setLectureDate] = useState<string>('2026-10-22');
  const [lectureSlot, setLectureSlot] = useState<string>('11:15 - 12:15 PM');

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadSource, setUploadSource] = useState<'sample' | 'custom' | 'webcam'>('sample');

  // Processing telemetry
  const [processingStage, setProcessingStage] = useState<string>('Uploading classroom photos...');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Active session data
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  // Synchronized Selection between Box and Row
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'review' | 'present' | 'absent'>('review');

  // Load sample JPEG as Base64 Data URL
  const loadSamplePhoto = async () => {
    try {
      const res = await fetch('/demo-classroom-1.jpg');
      if (!res.ok) throw new Error('Sample photo not found');
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotos([reader.result]);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn('Could not load sample classroom JPEG:', err);
    }
  };

  // Manual Override Modal
  const [overrideModal, setOverrideModal] = useState<{
    open: boolean;
    studentId: string;
    studentName: string;
    targetStatus: 'present' | 'absent';
    reason: string;
  }>({
    open: false,
    studentId: '',
    studentName: '',
    targetStatus: 'present',
    reason: ''
  });

  // Assign Unknown Face Modal
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    faceId: string;
    selectedStudentId: string;
  }>({
    open: false,
    faceId: '',
    selectedStudentId: ''
  });

  // Load Classes, Students, and Sample Photo
  useEffect(() => {
    loadSamplePhoto();
    async function init() {
      try {
        const teacherFilter = user?.role === 'teacher' ? user.userId : undefined;
        let [clsList, stuList] = await Promise.all([
          api.classes.list(teacherFilter),
          api.students.list()
        ]);
        if (!clsList || clsList.length === 0) {
          clsList = await api.classes.list();
        }
        setClasses(clsList || []);
        setStudents(stuList || []);
        if (clsList && clsList.length > 0) {
          // Default to CLS-102 (Database Systems) which has the enrolled faces
          const defaultClass = clsList.find(c => c.classId === 'CLS-102') || clsList[0];
          setSelectedClassId(defaultClass.classId);
        }
      } catch (err) {
        console.error('Class/student loading error:', err);
      }
    }
    init();
  }, [user]);

  // Step 3: Run Rekognition face detection & matching simulation
  const startProcessing = async () => {
    if (!selectedClassId) {
      error('Please select an assigned class.');
      return;
    }
    if (!photos || photos.length === 0 || !photos[0]) {
      error('Please select or upload a classroom photo first.');
      return;
    }

    setStep(3);
    setProcessingProgress(15);
    setProcessingStage('Verifying duplicate hash against historical sessions...');

    try {
      // 1. Anti-Proxy perceptual hash check simulation
      await new Promise(r => setTimeout(r, 600));
      setProcessingProgress(35);
      setProcessingStage('Uploading photos to secure private S3 bucket...');

      // 2. Upload simulation
      await new Promise(r => setTimeout(r, 700));
      setProcessingProgress(60);
      setProcessingStage('Detecting faces via AWS Rekognition DetectFaces...');

      // 3. Cropping and matching
      await new Promise(r => setTimeout(r, 800));
      setProcessingProgress(85);
      setProcessingStage('Searching cropped vectors against collection "haazri-faces"...');

      // Create session in backend / mock
      const newSession = await api.sessions.create(
        selectedClassId,
        lectureDate,
        lectureSlot,
        photos,
        uploadSource === 'sample'
      );

      await new Promise(r => setTimeout(r, 600));
      setProcessingProgress(100);
      setProcessingStage('Done! Classified present, absent, and review candidates.');

      await new Promise(r => setTimeout(r, 350));
      setSession(newSession);
      setStep(4); // Move to review screen
    } catch (err: any) {
      error(err.message || 'Processing failed');
      setStep(2); // Go back to photo step
    }
  };

  // Synchronize selection: clicking a face box
  const handleFaceBoxClick = (face: DetectedFace) => {
    setSelectedFaceId(face.faceId);
    if (face.matchedStudentId) {
      setSelectedStudentId(face.matchedStudentId);
    }
  };

  // Synchronize selection: clicking a student row
  const handleStudentRowClick = (rec: AttendanceRecord) => {
    setSelectedStudentId(rec.studentId);
    if (rec.faceId) {
      setSelectedFaceId(rec.faceId);
    }
  };

  // Handle Manual Override
  const submitOverride = async () => {
    if (!overrideModal.reason || overrideModal.reason.trim().length === 0) {
      error('A mandatory audit reason is required for manual attendance override.');
      return;
    }

    try {
      const updated = await api.sessions.overrideAttendance(
        session!.sessionId,
        overrideModal.studentId,
        overrideModal.targetStatus,
        overrideModal.reason.trim()
      );
      setSession(updated);
      success(`Marked ${overrideModal.studentName} as ${overrideModal.targetStatus} (Manual Override logged).`);
      setOverrideModal({ open: false, studentId: '', studentName: '', targetStatus: 'present', reason: '' });
    } catch (err: any) {
      error(err.message || 'Override failed');
    }
  };

  // Handle Assigning Unknown Face
  const submitAssignFace = async () => {
    if (!assignModal.selectedStudentId) {
      error('Please pick a student to assign this face to.');
      return;
    }

    try {
      const updated = await api.sessions.assignUnknownFace(
        session!.sessionId,
        assignModal.faceId,
        assignModal.selectedStudentId
      );
      setSession(updated);
      success('Assigned face to student and verified attendance.');
      setAssignModal({ open: false, faceId: '', selectedStudentId: '' });
    } catch (err: any) {
      error(err.message || 'Failed to assign face');
    }
  };

  // Confirm and Save Session
  const handleConfirmSession = async () => {
    if (!session) return;
    try {
      const confirmed = await api.sessions.confirm(session.sessionId);
      setSession(confirmed);
      setStep(5);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
      success(`Attendance confirmed and saved! 24-hour edit window is now active.`);
    } catch (err: any) {
      error(err.message || 'Failed to confirm session');
    }
  };

  // Filtered records for the side panel
  const displayedRecords = (session?.records || []).filter(r => {
    if (activeTab === 'review') {
      const matchedFace = (session?.detectedFaces || []).find(f => f.matchedStudentId === r.studentId);
      return (matchedFace && matchedFace.status === 'review') || r.method === 'manual';
    }
    if (activeTab === 'present') return r.status === 'present' || r.status === 'manual';
    if (activeTab === 'absent') return r.status === 'absent';
    return true;
  });

  const selectedClass = classes.find(c => c.classId === selectedClassId);

  return (
    <div className="space-y-6">
      {/* Header & Stepper */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">Take Class Attendance</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Capture or upload lecture hall photos for automated facial recognition attendance.
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {[
            { num: 1, label: 'Slot' },
            { num: 2, label: 'Photos' },
            { num: 3, label: 'Scan' },
            { num: 4, label: 'Review' },
            { num: 5, label: 'Confirmed' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                  step === s.num
                    ? 'bg-marigold text-ink editorial-shadow'
                    : step > s.num
                    ? 'bg-teal text-paper'
                    : 'bg-paper border border-hairline text-muted'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span className={`hidden md:inline ${step === s.num ? 'text-ink font-bold' : 'text-muted'}`}>
                {s.label}
              </span>
              {s.num < 5 && <span className="text-hairline">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Class & Slot Selection */}
      {step === 1 && (
        <div className="max-w-xl mx-auto p-6 sm:p-8 rounded bg-surface border border-hairline editorial-shadow space-y-5">
          <div className="border-b border-hairline pb-3">
            <h2 className="font-serif font-bold text-xl text-ink">Step 1: Select Lecture Period</h2>
            <p className="text-xs text-muted">Choose which academic class roster you are marking attendance for.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-semibold">
                Class &amp; Subject *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded border border-hairline bg-paper text-ink font-mono focus:outline-hidden focus:border-marigold"
              >
                {classes.length === 0 ? (
                  <option value="">No classes available</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.subject} — Division {c.division} (Year {c.year}) • {c.studentIds?.length || 0} students
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1 font-semibold">Date</label>
                <input
                  type="date"
                  value={lectureDate}
                  onChange={(e) => setLectureDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded border border-hairline bg-paper text-ink focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1 font-semibold">Slot</label>
                <select
                  value={lectureSlot}
                  onChange={(e) => setLectureSlot(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded border border-hairline bg-paper text-ink focus:outline-hidden focus:border-marigold"
                >
                  <option value="09:00 - 10:00 AM">09:00 - 10:00 AM</option>
                  <option value="10:00 - 11:00 AM">10:00 - 11:00 AM</option>
                  <option value="11:15 - 12:15 PM">11:15 - 12:15 PM</option>
                  <option value="02:00 - 03:00 PM">02:00 - 03:00 PM</option>
                  <option value="03:00 - 04:00 PM">03:00 - 04:00 PM</option>
                </select>
              </div>
            </div>

            {selectedClass && (
              <div className="p-3.5 rounded border border-hairline bg-paper/60 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Faculty Assigned:</span>
                  <span className="font-bold text-ink">{selectedClass.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Division Roster:</span>
                  <span className="font-bold text-teal">{selectedClass.studentIds?.length || 0} enrolled students</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-hairline flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-marigold text-ink rounded font-serif font-bold text-sm hover:brightness-105 transition-all editorial-shadow"
            >
              Next: Upload Classroom Photos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Photos Capture / Upload */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded bg-surface border border-hairline editorial-shadow space-y-5">
          <div className="border-b border-hairline pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-xl text-ink">Step 2: Upload Class Photos</h2>
              <p className="text-xs text-muted">
                1 to 3 wide-angle photos of the classroom. Multiple photos of the same session will be merged.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-mono text-muted hover:text-ink underline"
            >
              Change Class
            </button>
          </div>

          {/* Preset options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadSource('sample');
                loadSamplePhoto();
              }}
              className={`p-4 rounded border text-left transition-all ${
                uploadSource === 'sample'
                  ? 'border-marigold bg-paper shadow-xs font-semibold'
                  : 'border-hairline bg-surface hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-marigold" />
                <span className="text-xs font-serif font-bold text-ink">Demo Classroom Photo</span>
              </div>
              <p className="text-[11px] text-muted">
                Bundled lecture hall JPEG with enrolled students (Aarav, Ananya, Rohan, Pooja) for live verification.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setUploadSource('custom')}
              className={`p-4 rounded border text-left transition-all ${
                uploadSource === 'custom'
                  ? 'border-marigold bg-paper shadow-xs font-semibold'
                  : 'border-hairline bg-surface hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload className="w-4 h-4 text-teal" />
                <span className="text-xs font-serif font-bold text-ink">Custom Image Upload</span>
              </div>
              <p className="text-[11px] text-muted">
                Upload your own classroom photo (JPEG / PNG) from device camera or local storage.
              </p>
            </button>
          </div>

          {/* Photo Preview Strip */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-muted font-bold">Classroom Photo Set</span>
            <div className="h-52 rounded border border-hairline overflow-hidden relative bg-paper flex items-center justify-center">
              {photos[0] ? (
                <img
                  src={photos[0]}
                  alt="Classroom preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs font-mono text-muted">Loading preview image...</div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-ink/75 backdrop-blur-xs text-paper rounded text-[10px] font-mono">
                Photo 1 of {Math.max(1, photos.length)} • Perceptual Hash Ready
              </div>
            </div>

            {uploadSource === 'custom' && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) setPhotos([ev.target.result as string]);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="text-xs font-mono text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-hairline file:text-xs file:bg-surface file:font-mono hover:file:bg-surface-hover cursor-pointer"
              />
            )}
          </div>

          {/* Duplicate Anti-Proxy check banner */}
          <div className="p-3 rounded border border-hairline bg-paper/60 text-xs font-mono flex items-center gap-2 text-muted">
            <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
            <span>Anti-proxy check active: perceptual dHash will detect identical recycled photos.</span>
          </div>

          <div className="pt-4 border-t border-hairline flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
            >
              Back
            </button>
            <button
              onClick={startProcessing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-marigold text-ink rounded font-serif font-bold text-sm hover:brightness-105 transition-all editorial-shadow"
            >
              Run Face Recognition <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Animated Scanning & Processing Screen */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto p-8 rounded bg-surface border border-hairline editorial-shadow space-y-6 text-center">
          <div>
            <h2 className="font-serif font-bold text-2xl text-ink mb-1">Analyzing Classroom Faces</h2>
            <p className="text-xs text-muted">Running AWS Rekognition pipeline with 60-second execution safety.</p>
          </div>

          {/* Photo with Vertical Animated Scanline Sweep */}
          <div className="relative w-full h-72 rounded border border-hairline overflow-hidden bg-ink/90 flex items-center justify-center">
            <img src={photos[0]} alt="Scanning photo" className="w-full h-full object-contain opacity-85" />

            {/* Scanline Element */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-marigold to-transparent shadow-[0_0_15px_rgba(232,163,23,0.9)] animate-scanline pointer-events-none" />

            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-ink/80 text-marigold font-mono text-[11px] font-bold border border-marigold/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-marigold animate-ping" />
              REKOGNITION DETECT_FACES
            </div>
          </div>

          {/* Progress bar and telemetry status */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-xs font-mono text-muted">
              <span>{processingStage}</span>
              <span className="font-bold text-ink">{processingProgress}%</span>
            </div>
            <div className="h-2 w-full bg-paper rounded-full overflow-hidden border border-hairline">
              <motion.div
                className="h-full bg-marigold rounded-full"
                animate={{ width: `${processingProgress}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Annotated Review Screen (Core Verification Experience) */}
      {step === 4 && session && (
        <div className="space-y-5">
          {/* Top Session Stats Strip */}
          <div className="p-4 rounded bg-surface border border-hairline editorial-shadow flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg text-ink">{session.subject || 'Class Session'}</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-paper border border-hairline text-ink font-bold">
                  {session.division || 'TE-A'}
                </span>
                <span className="text-xs font-mono text-muted">{session.date} • {session.slot}</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {session.stats?.matchedCount ?? 0} of {session.stats?.rosterCount ?? 0} matched automatically • {session.stats?.reviewCount ?? 0} low-confidence faces need your review
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setStep(2)}
                className="px-3 py-1.5 border border-hairline rounded text-xs font-mono text-muted hover:text-ink"
              >
                Retake Photo
              </button>
              <button
                onClick={handleConfirmSession}
                className="inline-flex items-center gap-2 px-5 py-2 bg-teal text-paper rounded font-serif font-bold text-sm hover:brightness-110 transition-all editorial-shadow"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm &amp; Save Session
              </button>
            </div>
          </div>

          {/* Main 2-Column Review Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 7 Columns: Photo with Animated Pop-in Bounding Boxes */}
            <div className="lg:col-span-7 rounded bg-surface border border-hairline editorial-shadow p-3 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted font-bold uppercase tracking-wider">
                  Annotated Classroom Canvas ({(session.detectedFaces || []).length} Faces Detected)
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-teal" /> &ge;90%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-marigold" /> 80-89%</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-brick" /> &lt;80%</span>
                </div>
              </div>

              {/* Photo Container with Relative Normalized Bounding Boxes */}
              <div className="relative w-full rounded overflow-hidden border border-hairline bg-ink select-none" style={{ aspectRatio: '1000/650' }}>
                <img
                  src={photos[0] || session.photoUrls?.[0] || '/demo-classroom-1.jpg'}
                  alt="Classroom photo"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Face Bounding Box Overlays */}
                {(session.detectedFaces || []).map((face, index) => {
                  const isSelected = selectedFaceId === face.faceId;
                  const isReview = face.status === 'review';
                  const isUnknown = face.status === 'unknown';

                  const boxBorderColor = isUnknown
                    ? 'border-brick'
                    : isReview
                    ? 'border-marigold'
                    : 'border-teal';

                  const tagBgColor = isUnknown
                    ? 'bg-brick text-paper'
                    : isReview
                    ? 'bg-marigold text-ink'
                    : 'bg-teal text-paper';

                  const topPct = (face.boundingBox?.top ?? 0) * 100;
                  const leftPct = (face.boundingBox?.left ?? 0) * 100;
                  const widthPct = (face.boundingBox?.width ?? 0) * 100;
                  const heightPct = (face.boundingBox?.height ?? 0) * 100;

                  return (
                    <motion.div
                      key={face.faceId || index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                      onClick={() => handleFaceBoxClick(face)}
                      className={`absolute cursor-pointer border-2 transition-all rounded-xs ${boxBorderColor} ${
                        isSelected ? 'ring-4 ring-marigold/70 z-20 scale-105' : 'hover:scale-102 z-10'
                      }`}
                      style={{
                        top: `${topPct}%`,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`
                      }}
                    >
                      {/* Pop-in Name Label Sliding Out */}
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 + 0.12 }}
                        className={`absolute -bottom-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md pointer-events-auto ${tagBgColor}`}
                      >
                        {face.matchedStudentName ? (
                          <>
                            {face.matchedStudentName.split(' ')[0]} ({face.confidence ?? 0}%)
                          </>
                        ) : (
                          <>Unknown ({face.confidence ?? 0}%)</>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="text-[11px] font-mono text-muted flex items-center justify-between">
                <span>Tip: Click any face box to focus the student row in the review roster.</span>
                {selectedFaceId && (
                  <button
                    onClick={() => {
                      setSelectedFaceId(null);
                      setSelectedStudentId(null);
                    }}
                    className="text-brick hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>

            {/* Right 5 Columns: Review & Exceptions Side Panel */}
            <div className="lg:col-span-5 rounded bg-surface border border-hairline editorial-shadow flex flex-col h-[520px]">
              {/* Tab Navigation */}
              <div className="p-3 border-b border-hairline flex items-center justify-between bg-paper/50">
                <div className="flex rounded border border-hairline p-0.5 bg-paper text-xs font-mono">
                  <button
                    onClick={() => setActiveTab('review')}
                    className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                      activeTab === 'review' ? 'bg-surface font-bold text-ink shadow-xs border border-hairline' : 'text-muted'
                    }`}
                  >
                    Review ({session.stats?.reviewCount ?? 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('present')}
                    className={`px-2.5 py-1 rounded transition-all ${
                      activeTab === 'present' ? 'bg-surface font-bold text-teal shadow-xs border border-hairline' : 'text-muted'
                    }`}
                  >
                    Present ({session.stats?.presentCount ?? 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('absent')}
                    className={`px-2.5 py-1 rounded transition-all ${
                      activeTab === 'absent' ? 'bg-surface font-bold text-brick shadow-xs border border-hairline' : 'text-muted'
                    }`}
                  >
                    Absent ({session.stats?.absentCount ?? 0})
                  </button>
                </div>

                {/* Assign unknown face action if unknown face detected */}
                {(session.detectedFaces || []).some(f => f.status === 'unknown') && (
                  <button
                    onClick={() => {
                      const unknownFace = (session.detectedFaces || []).find(f => f.status === 'unknown');
                      if (unknownFace) {
                        setAssignModal({ open: true, faceId: unknownFace.faceId, selectedStudentId: '' });
                      }
                    }}
                    className="px-2 py-1 rounded bg-marigold text-ink font-mono text-[11px] font-bold hover:brightness-105 transition-all"
                  >
                    Assign Unknown
                  </button>
                )}
              </div>

              {/* Records List */}
              <div className="flex-1 overflow-y-auto divide-y divide-hairline">
                {displayedRecords.length === 0 ? (
                  <div className="py-16 text-center text-xs font-mono text-muted">
                    No students in this tab filter.
                  </div>
                ) : (
                  displayedRecords.map((rec) => {
                    const isSelected = selectedStudentId === rec.studentId;
                    const matchedFace = (session.detectedFaces || []).find(f => f.matchedStudentId === rec.studentId);
                    const isReview = matchedFace?.status === 'review';

                    return (
                      <div
                        key={rec.studentId}
                        onClick={() => handleStudentRowClick(rec)}
                        className={`p-3 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-marigold/10 border-l-4 border-l-marigold'
                            : isReview
                            ? 'bg-marigold/5 hover:bg-surface-hover'
                            : 'hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted font-bold">{rec.rollNumber}</span>
                            <span className="font-serif font-bold text-ink">{rec.studentName}</span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              rec.status === 'present'
                                ? 'bg-teal/15 text-teal border border-teal/30'
                                : rec.status === 'manual'
                                ? 'bg-marigold/15 text-marigold border border-marigold/30'
                                : 'bg-brick/15 text-brick border border-brick/30'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                          <div>
                            {rec.method === 'face' ? (
                              <span>Confidence: <strong className="text-ink">{rec.confidence}%</strong></span>
                            ) : (
                              <span className="text-marigold">Manual Override</span>
                            )}
                            {rec.reason && <span className="block text-muted text-[10px]">"{rec.reason}"</span>}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {rec.status === 'absent' ? (
                              <button
                                onClick={() => {
                                  setOverrideModal({
                                    open: true,
                                    studentId: rec.studentId,
                                    studentName: rec.studentName,
                                    targetStatus: 'present',
                                    reason: ''
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-teal/15 border border-teal/40 text-teal hover:bg-teal hover:text-paper font-semibold text-[10px] transition-colors"
                              >
                                Mark Present
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setOverrideModal({
                                    open: true,
                                    studentId: rec.studentId,
                                    studentName: rec.studentName,
                                    targetStatus: 'absent',
                                    reason: ''
                                  });
                                }}
                                className="px-2 py-0.5 rounded bg-brick/15 border border-brick/40 text-brick hover:bg-brick hover:text-paper font-semibold text-[10px] transition-colors"
                              >
                                Mark Absent
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Side Panel Footer */}
              <div className="p-3 border-t border-hairline bg-paper/50 flex items-center justify-between text-[11px] font-mono text-muted">
                <span>Roster: {session.stats?.rosterCount ?? 0}</span>
                <span className="text-teal font-bold">{session.stats?.presentCount ?? 0} Present</span>
                <span className="text-brick font-bold">{session.stats?.absentCount ?? 0} Absent</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Confirmation Success Screen */}
      {step === 5 && session && (
        <div className="max-w-xl mx-auto p-8 rounded bg-surface border border-teal/50 editorial-shadow space-y-6 text-center">
          <div className="w-16 h-16 bg-teal/10 border border-teal/30 rounded-full flex items-center justify-center mx-auto text-teal">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-serif font-bold text-2xl text-ink mb-1">Attendance Confirmed &amp; Stored</h2>
            <p className="text-xs text-muted">
              {session.subject} ({session.division}) session on {session.date} has been committed to DynamoDB.
            </p>
          </div>

          <div className="p-4 rounded border border-hairline bg-paper/50 grid grid-cols-3 gap-2 font-mono text-xs">
            <div>
              <span className="text-muted block text-[10px] uppercase">Present</span>
              <span className="font-bold text-teal text-lg">{session.stats?.presentCount ?? 0}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Absent</span>
              <span className="font-bold text-brick text-lg">{session.stats?.absentCount ?? 0}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px] uppercase">Turnout</span>
              <span className="font-bold text-ink text-lg">
                {Math.round(((session.stats?.presentCount ?? 0) / (session.stats?.rosterCount || 1)) * 100)}%
              </span>
            </div>
          </div>

          {/* 24-hour edit window notice */}
          <div className="p-3 rounded border border-hairline bg-paper text-xs font-mono text-muted flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-marigold" />
            <span>24-Hour Faculty Edit Window Active until tomorrow {session.slot ? session.slot.split(' ')[0] : '11:00 AM'}.</span>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="px-4 py-2 border border-hairline rounded text-xs font-medium text-ink hover:bg-surface-hover"
            >
              View Session History
            </button>
            <button
              onClick={() => {
                setStep(1);
                setSession(null);
              }}
              className="px-5 py-2 rounded bg-marigold text-ink font-serif font-bold text-xs hover:brightness-105 editorial-shadow"
            >
              Take Another Class
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Modal with Mandatory Reason */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-hairline rounded max-w-md w-full editorial-shadow-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
              <h3 className="font-serif font-bold text-base text-ink">Manual Attendance Override</h3>
              <button
                onClick={() => setOverrideModal({ ...overrideModal, open: false })}
                className="text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted mb-3">
              Changing status of <strong className="text-ink">{overrideModal.studentName}</strong> to{' '}
              <span className="font-mono uppercase font-bold text-marigold">{overrideModal.targetStatus}</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Arrived 5 minutes late due to transit delay; verified in person."
                  value={overrideModal.reason}
                  onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                  className="w-full p-2.5 rounded border border-hairline bg-paper text-ink text-xs focus:outline-hidden focus:border-marigold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ ...overrideModal, open: false })}
                  className="px-3.5 py-1.5 border border-hairline rounded text-xs text-ink hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!overrideModal.reason.trim()}
                  onClick={submitOverride}
                  className="px-4 py-1.5 bg-marigold text-ink rounded text-xs font-semibold hover:brightness-105 disabled:opacity-50 editorial-shadow"
                >
                  Record Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Unknown Face Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-surface border border-hairline rounded max-w-md w-full editorial-shadow-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
              <h3 className="font-serif font-bold text-base text-ink">Assign Unknown Detected Face</h3>
              <button
                onClick={() => setAssignModal({ ...assignModal, open: false })}
                className="text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted mb-3">
              Select an absent student from the class roster to associate with the low-confidence or unrecognized face vector.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                  Absent Student *
                </label>
                <select
                  value={assignModal.selectedStudentId}
                  onChange={(e) => setAssignModal({ ...assignModal, selectedStudentId: e.target.value })}
                  className="w-full p-2 text-xs font-mono rounded border border-hairline bg-paper text-ink"
                >
                  <option value="">-- Choose student from roster --</option>
                  {session?.records
                    .filter(r => r.status === 'absent')
                    .map((r) => (
                      <option key={r.studentId} value={r.studentId}>
                        {r.rollNumber} — {r.studentName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setAssignModal({ ...assignModal, open: false })}
                  className="px-3.5 py-1.5 border border-hairline rounded text-xs text-ink hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!assignModal.selectedStudentId}
                  onClick={submitAssignFace}
                  className="px-4 py-1.5 bg-marigold text-ink rounded text-xs font-semibold hover:brightness-105 disabled:opacity-50 editorial-shadow"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
