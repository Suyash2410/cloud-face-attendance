import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AnalyticsOverview } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { AttendanceTrendChart } from '../../charts/AttendanceTrendChart';
import { StatusDonutChart } from '../../charts/StatusDonutChart';
import { SubjectBarChart } from '../../charts/SubjectBarChart';
import { CalendarHeatmap } from '../../charts/CalendarHeatmap';
import { ConfidenceHistogram } from '../../charts/ConfidenceHistogram';
import { DefaulterBarList } from '../../charts/DefaulterBarList';
import {
  Users, UserCheck, Activity, BookOpen, AlertCircle,
  FileCheck2, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await api.analytics.getOverview();
        setOverview(stats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted font-bold">
            Administrative Intelligence
          </span>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink mt-0.5">
            Campus Biometrics &amp; Attendance Pulse
          </h1>
        </div>
        <div className="text-xs font-mono text-muted">
          Active Academic Term • <strong className="text-ink">Autumn 2026</strong>
        </div>
      </div>

      {/* KPI Numerals Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={overview?.totalStudents ?? 120}
          unit="enrolled"
          subtitle="Divisions TE-A, TE-B, TE-C"
          icon={Users}
          variant="default"
        />
        <StatCard
          label="Biometric Enrolled"
          value={overview?.enrolledPercentage ?? 92}
          unit="%"
          subtitle="Indexed in Rekognition"
          icon={UserCheck}
          variant="teal"
          trend={{ value: '+4%', isPositive: true, label: 'this month' }}
        />
        <StatCard
          label="Today's Turnout"
          value={overview?.todayOverallAttendance ?? 88}
          unit="%"
          subtitle="Campus average attendance"
          icon={Activity}
          variant="marigold"
          trend={{ value: 'Above 75% cutoff', isPositive: true }}
        />
        <StatCard
          label="Active Classes"
          value={overview?.activeClassesCount ?? 6}
          unit="subjects"
          subtitle="All divisions covered"
          icon={BookOpen}
          variant="indigo"
        />
      </div>

      {/* Asymmetric Editorial Grid: Large Hero Trend Chart beside Top Defaulters List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <AttendanceTrendChart />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <DefaulterBarList />
        </div>
      </div>

      {/* Status Donut & Subject Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <StatusDonutChart />
        </div>
        <div className="lg:col-span-7 flex flex-col">
          <SubjectBarChart />
        </div>
      </div>

      {/* Calendar Heatmap & Confidence Score Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <CalendarHeatmap />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <ConfidenceHistogram />
        </div>
      </div>

      {/* Quick Action Footer Strip */}
      <div className="p-4 rounded bg-surface border border-hairline editorial-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-marigold/10 border border-marigold/30 text-marigold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif font-bold text-sm text-ink">Export Monthly Compliance Report</div>
            <div className="text-xs text-muted">Generate certified PDF and CSV reports for university exam cell.</div>
          </div>
        </div>

        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-marigold text-ink font-semibold text-xs hover:brightness-105 transition-all editorial-shadow"
        >
          <span>Open Report Generator</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
