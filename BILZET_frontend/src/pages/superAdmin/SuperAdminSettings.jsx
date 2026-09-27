import { useEffect, useState } from "react";
import { superAdminApi } from "../../api";
import {
  Sliders,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Save,
  CheckCircle,
  KeyRound,
  Lock,
} from "lucide-react";

export default function SuperAdminSettings() {
  const [config, setConfig] = useState({
    maintenanceMode: false,
    announcementText: "",
    announcementType: "info",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Master password change state
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getConfig();
      if (res?.appConfig) {
        setConfig({
          maintenanceMode: Boolean(res.appConfig.maintenanceMode),
          announcementText: res.appConfig.announcementText || "",
          announcementType: res.appConfig.announcementType || "info",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");

    try {
      await superAdminApi.updateConfig(config);
      setStatusMsg("Platform configuration updated successfully.");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (err) {
      alert(err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Sliders className="text-cyan-400" />
          Global Platform Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Master controls for global system announcements, maintenance mode, and master credentials.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={16} />
          {statusMsg}
        </div>
      )}

      {/* Broadcast Announcement Banner Settings */}
      <div className="p-6 rounded-2xl bg-[#0b1329] border border-white/[0.08] space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 grid place-items-center text-cyan-400">
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">System Announcement Broadcast</h2>
            <p className="text-xs text-slate-400">
              Display a global alert banner across all tenant shops and dashboards.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Announcement Message
            </label>
            <textarea
              rows={3}
              value={config.announcementText}
              onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
              placeholder="e.g. Scheduled GST compliance server maintenance tonight from 2:00 AM to 3:00 AM IST."
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Banner Notice Type</label>
              <select
                value={config.announcementType}
                onChange={(e) => setConfig({ ...config, announcementType: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="info">Informational (Blue)</option>
                <option value="warning">Important Alert (Amber)</option>
                <option value="success">Update Success (Green)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Maintenance Mode Lock
              </label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="maint"
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-white/10 border-white/20"
                />
                <label htmlFor="maint" className="text-xs font-bold text-rose-300 cursor-pointer">
                  Activate Platform Maintenance Mode
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving…" : "Save Platform Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Super Admin Security Information */}
      <div className="p-6 rounded-2xl bg-[#0b1329] border border-white/[0.08] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 grid place-items-center text-blue-400">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Master Super Admin Identity</h2>
            <p className="text-xs text-slate-400">
              Designated platform credentials with absolute authority.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Username</p>
            <p className="text-sm font-mono font-bold text-white mt-1">admin</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Authorized Email</p>
            <p className="text-sm font-mono font-bold text-cyan-300 mt-1 truncate">
              Vickyms2app@gmail.com
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Contact Number</p>
            <p className="text-xs font-semibold text-slate-400 mt-1">Not Required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
