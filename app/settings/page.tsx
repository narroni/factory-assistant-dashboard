import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings — Factory Assistant" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="px-6 py-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, type = "text", hint }: { label: string; value: string; type?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={value}
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
      />
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, options, hint }: { label: string; value: string; options: string[]; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      <select
        defaultValue={value}
        className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  );
}

const users = [
  { name: "Narko P.",     email: "npetrovci13@gmail.com",    role: "Administrator", lastLogin: "2026-05-29 09:14" },
  { name: "Maja K.",      email: "maja.k@factory.local",     role: "Production Mgr", lastLogin: "2026-05-29 08:45" },
  { name: "Ivan T.",      email: "ivan.t@factory.local",     role: "Quality Control", lastLogin: "2026-05-28 17:22" },
  { name: "Ana R.",       email: "ana.r@factory.local",      role: "Viewer",          lastLogin: "2026-05-27 14:10" },
];

export default function SettingsPage() {
  return (
    <div className="px-8 py-6 space-y-6 max-w-4xl">

      {/* Factory Identity */}
      <Section title="Factory Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name"  value="Narko Industries d.o.o." />
          <Field label="Factory Name"  value="Production Facility — Line A/B" />
          <Field label="Factory Code"  value="FAC-001" hint="Internal factory identifier used in reports and labels." />
          <Field label="Location"      value="Zagreb, Croatia" />
        </div>
      </Section>

      {/* AI Assistant */}
      <Section title="AI Assistant Configuration">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="AI Assistant Name"
            value="Factory Assistant"
            hint="The name displayed in the dashboard header and AI Insights panel."
          />
          <SelectField
            label="AI Model"
            value="claude-sonnet-4-6"
            options={["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5"]}
            hint="Model used for AI-generated insights and recommendations."
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
          <div>
            <p className="text-xs font-medium text-zinc-200">AI Insights Panel</p>
            <p className="text-xs text-zinc-500 mt-0.5">Show AI-generated recommendations on the Overview page.</p>
          </div>
          <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end pr-0.5 cursor-pointer shrink-0">
            <div className="w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
      </Section>

      {/* Inventory Thresholds */}
      <Section title="Inventory & Alerts">
        <div className="grid grid-cols-3 gap-4">
          <Field
            label="Low Stock Threshold (%)"
            value="25"
            type="number"
            hint="Alert when stock falls below this % of minimum."
          />
          <Field
            label="Critical Stock Threshold (%)"
            value="10"
            type="number"
            hint="Trigger critical alert at this % of minimum."
          />
          <Field
            label="Reorder Lead Buffer (days)"
            value="7"
            type="number"
            hint="Extra buffer days added to supplier lead time."
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
          <div>
            <p className="text-xs font-medium text-zinc-200">Email Notifications</p>
            <p className="text-xs text-zinc-500 mt-0.5">Send low-stock alerts to the administrator email.</p>
          </div>
          <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center justify-end pr-0.5 cursor-pointer shrink-0">
            <div className="w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
      </Section>

      {/* User Management */}
      <Section title="User Management">
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.email} className={`hover:bg-zinc-800/40 ${i < users.length - 1 ? "border-b border-zinc-800" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-200">{u.name}</p>
                        <p className="text-xs text-zinc-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded">{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="text-xs text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-700 transition-colors">Edit</button>
                      <button className="text-xs text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-zinc-700 transition-colors">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite User
        </button>
      </Section>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pb-4">
        <button className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
