import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { SystemSettings } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Settings, Sliders, Shield, Database, RefreshCw,
  Clock, School, Save, AlertTriangle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const s = await api.settings.get();
        setSettings(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.settings.update(settings);
      setSettings(updated);
      success('System settings saved and applied across Lambda pipelines.');
    } catch (err: any) {
      error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    if (window.confirm('Reset all demo data to initial factory state? This will restore the 120 Indian students, 6 subjects, and 60 days of attendance history.')) {
      try {
        await api.settings.resetDemo();
        success('Demo data reset successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } catch (err: any) {
        error(err.message || 'Failed to reset demo data');
      }
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-xs font-mono text-muted">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-marigold" />
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink">System Governance &amp; Parameters</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Configure facial recognition confidence thresholds, statutory cutoff rules, and retention lifecycles.
          </p>
        </div>

        {api.isMock && (
          <button
            onClick={handleResetDemoData}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-brick/40 bg-brick/5 text-brick rounded text-xs font-mono font-semibold hover:bg-brick/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Demo Seed Data
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Rekognition Thresholds Card */}
        <div className="p-5 sm:p-6 rounded bg-surface border border-hairline editorial-shadow space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-hairline font-serif font-bold text-base text-ink">
            <Sliders className="w-4 h-4 text-marigold" />
            <span>AWS Rekognition Vector Matching Thresholds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                Auto-Matched Threshold (%)
              </label>
              <input
                type="number"
                min={70}
                max={99}
                value={settings.matchThreshold}
                onChange={(e) => setSettings({ ...settings, matchThreshold: Number(e.target.value) })}
                className="w-full p-2.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
              />
              <span className="text-[11px] text-muted block mt-1">
                Faces at or above this confidence score are automatically classified as verified present (Default: 90%).
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                Review Band Floor (%)
              </label>
              <input
                type="number"
                min={60}
                max={settings.matchThreshold - 1}
                value={settings.reviewThreshold}
                onChange={(e) => setSettings({ ...settings, reviewThreshold: Number(e.target.value) })}
                className="w-full p-2.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
              />
              <span className="text-[11px] text-muted block mt-1">
                Faces between this score and the matched threshold are highlighted for teacher review (Default: 80%).
              </span>
            </div>
          </div>
        </div>

        {/* Academic Rules & Windows */}
        <div className="p-5 sm:p-6 rounded bg-surface border border-hairline editorial-shadow space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-hairline font-serif font-bold text-base text-ink">
            <Clock className="w-4 h-4 text-teal" />
            <span>Attendance Policies &amp; Retention</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                Statutory Shortage Threshold (%)
              </label>
              <input
                type="number"
                min={50}
                max={95}
                value={settings.shortageThreshold}
                onChange={(e) => setSettings({ ...settings, shortageThreshold: Number(e.target.value) })}
                className="w-full p-2.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
              />
              <span className="text-[11px] text-muted block mt-1">
                University debarment warning triggered below this level (Default: 75%).
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                Faculty Edit Window (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                value={settings.editWindowHours}
                onChange={(e) => setSettings({ ...settings, editWindowHours: Number(e.target.value) })}
                className="w-full p-2.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
              />
              <span className="text-[11px] text-muted block mt-1">
                Hours after confirmation during which attendance can be altered (Default: 24h).
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">
                S3 Photo Retention (Days)
              </label>
              <input
                type="number"
                min={7}
                max={365}
                value={settings.photoRetentionDays}
                onChange={(e) => setSettings({ ...settings, photoRetentionDays: Number(e.target.value) })}
                className="w-full p-2.5 rounded border border-hairline bg-paper text-ink font-mono text-xs focus:outline-hidden focus:border-marigold"
              />
              <span className="text-[11px] text-muted block mt-1">
                Classroom photos automatically purged by S3 lifecycle rule after N days (Default: 30 days).
              </span>
            </div>
          </div>
        </div>

        {/* College Branding */}
        <div className="p-5 sm:p-6 rounded bg-surface border border-hairline editorial-shadow space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-hairline font-serif font-bold text-base text-ink">
            <School className="w-4 h-4 text-indigo" />
            <span>Institution Details &amp; Report Header</span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-1 font-bold">College Name</label>
            <input
              type="text"
              value={settings.collegeName}
              onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
              className="w-full p-2.5 rounded border border-hairline bg-paper text-ink text-xs focus:outline-hidden focus:border-marigold"
            />
          </div>

          <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.weeklyDigestEnabled}
              onChange={(e) => setSettings({ ...settings, weeklyDigestEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-marigold border-hairline focus:ring-marigold"
            />
            <span className="text-xs font-serif font-bold text-ink">
              Send weekly attendance digest emails to faculty via Amazon SES
            </span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded bg-marigold text-ink font-serif font-bold text-sm hover:brightness-105 transition-all editorial-shadow disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
