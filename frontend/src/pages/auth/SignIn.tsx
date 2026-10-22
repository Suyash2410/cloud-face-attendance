import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/layout/Logo';
import { api } from '../../api/client';
import {
  Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2,
  AlertCircle, Sparkles, School, GraduationCap, Shield
} from 'lucide-react';

export const SignIn: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@haazri.edu');
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to appropriate role portal
  React.useEffect(() => {
    if (user) {
      const destination =
        user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation handled by useEffect
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-paper text-ink">
      {/* Left Editorial Panel (Indian campus aesthetic, large serif typography, animated silhouette) */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-hairline bg-surface relative overflow-hidden">
        <div>
          <Logo />
          
          <div className="mt-16 sm:mt-24 space-y-4 max-w-lg">
            <span className="text-xs font-mono uppercase tracking-widest text-marigold font-bold">
              Autonomous Lecture Hall Telemetry
            </span>
            <h1 className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl text-ink leading-[1.08] tracking-tight">
              Roll call in fifteen seconds. Zero proxies.
            </h1>
            <p className="text-sm sm:text-base text-muted font-sans leading-relaxed pt-2">
              Mark attendance for 60+ students from a single classroom photograph using AWS Rekognition facial embeddings and DynamoDB.
            </p>
          </div>
        </div>

        {/* Subtle Animated Classroom Silhouette with Bounding Boxes */}
        <div className="my-8 p-4 rounded border border-hairline bg-paper/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
            <span className="flex items-center gap-1.5 text-teal font-bold">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" /> Live Face Vector Search
            </span>
            <span>Rekognition Collection: haazri-faces</span>
          </div>

          <div className="relative h-28 w-full rounded bg-ink/90 overflow-hidden flex items-center justify-center">
            {/* Silhouette outlines */}
            <div className="flex items-end justify-around w-full h-full px-4 pb-2 opacity-40">
              <div className="w-10 h-16 rounded-t-full bg-paper" />
              <div className="w-12 h-20 rounded-t-full bg-paper" />
              <div className="w-10 h-14 rounded-t-full bg-paper" />
              <div className="w-12 h-22 rounded-t-full bg-paper" />
              <div className="w-10 h-18 rounded-t-full bg-paper" />
            </div>

            {/* Animated bounding boxes popping around */}
            <div className="absolute top-3 left-10 w-9 h-11 border-2 border-teal rounded-xs animate-pulse">
              <span className="absolute -bottom-4 left-0 px-1 bg-teal text-paper text-[8px] font-mono font-bold">
                98%
              </span>
            </div>
            <div className="absolute top-5 left-36 w-10 h-12 border-2 border-teal rounded-xs">
              <span className="absolute -bottom-4 left-0 px-1 bg-teal text-paper text-[8px] font-mono font-bold">
                95%
              </span>
            </div>
            <div className="absolute top-4 right-16 w-9 h-11 border-2 border-marigold rounded-xs">
              <span className="absolute -bottom-4 left-0 px-1 bg-marigold text-ink text-[8px] font-mono font-bold">
                84%
              </span>
            </div>
          </div>
        </div>

        {/* Footer credentials info */}
        <div className="text-[11px] font-mono text-muted flex items-center justify-between pt-4 border-t border-hairline">
          <span>Veermata Jijabai Technological Institute (VJTI)</span>
          <span>DPDP Act 2023 Compliant</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-20 flex flex-col justify-center max-w-lg mx-auto">
        <div className="mb-6">
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-ink">Sign into Haazri</h2>
          <p className="text-xs text-muted mt-1 font-mono">
            {api.isMock ? 'Mock Mode active — no AWS credentials required' : 'Amazon Cognito authentication active'}
          </p>
        </div>

        {/* Demo One-Click Role Switcher (in Mock Mode) */}
        {api.isMock && (
          <div className="mb-6 p-3.5 rounded border border-hairline bg-surface editorial-shadow space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-ink">
              <span className="flex items-center gap-1.5 text-marigold">
                <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Logins:
              </span>
              <span className="text-[10px] text-muted">Quick Role Selector</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@haazri.edu')}
                className="p-2 rounded border border-hairline bg-paper hover:bg-surface-hover flex flex-col items-center gap-1 text-center transition-all"
              >
                <Shield className="w-4 h-4 text-marigold" />
                <span className="font-bold text-ink">Admin</span>
                <span className="text-[9px] text-muted truncate w-full">Dr. Bhargava</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sunita.k@engg.edu')}
                className="p-2 rounded border border-hairline bg-paper hover:bg-surface-hover flex flex-col items-center gap-1 text-center transition-all"
              >
                <School className="w-4 h-4 text-teal" />
                <span className="font-bold text-ink">Teacher</span>
                <span className="text-[9px] text-muted truncate w-full">Prof. Kulkarni</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('aarav.sharma@engg.edu')}
                className="p-2 rounded border border-hairline bg-paper hover:bg-surface-hover flex flex-col items-center gap-1 text-center transition-all"
              >
                <GraduationCap className="w-4 h-4 text-indigo" />
                <span className="font-bold text-ink">Student</span>
                <span className="text-[9px] text-muted truncate w-full">Aarav (TE-A)</span>
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-brick/10 border border-brick/30 text-brick text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@engg.edu"
                className="w-full pl-9 pr-3 py-2.5 rounded border border-hairline bg-surface text-ink text-xs font-mono focus:outline-hidden focus:border-marigold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded border border-hairline bg-surface text-ink text-xs font-mono focus:outline-hidden focus:border-marigold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded bg-marigold text-ink font-serif font-bold text-sm hover:brightness-105 active:scale-99 transition-all editorial-shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign into Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
