import { Link, useNavigate } from 'react-router-dom'
import { clearMatch } from '../matchState'

function Icon({ className = '', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function StatCard({ label, value, suffix, icon, tone }) {
  const toneRing =
    tone === 'danger'
      ? 'border-red-500/25 bg-red-500/10 text-red-400'
      : tone === 'primary'
        ? 'border-primary/25 bg-primary/10 text-primary'
        : 'border-white/10 bg-white/5 text-white/80'

  return (
    <div className="rounded-2xl border border-white/10 bg-card-dark/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/45">{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-extrabold tracking-tight">{value}</div>
            {suffix ? <div className="text-sm font-semibold text-primary/90">{suffix}</div> : null}
          </div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border ${toneRing}`}>{icon}</div>
      </div>
    </div>
  )
}

function Pill({ children, active }) {
  return (
    <button
      type="button"
      className={
        active
          ? 'rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white'
          : 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75 hover:bg-white/10'
      }
    >
      {children}
    </button>
  )
}

function Tag({ children, tone }) {
  const cls =
    tone === 'danger'
      ? 'border-red-500/25 bg-red-500/10 text-red-300'
      : tone === 'warn'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        : tone === 'ok'
          ? 'border-primary/25 bg-primary/10 text-primary'
          : tone === 'info'
            ? 'border-sky-500/20 bg-sky-500/10 text-sky-200'
            : 'border-white/10 bg-white/5 text-white/75'

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${cls}`}>{children}</span>
}

function MenuItem({ active, icon, children }) {
  return (
    <div
      className={
        active
          ? 'flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-3 py-3 text-sm font-semibold text-primary'
          : 'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/70 hover:bg-white/5'
      }
    >
      <div className={active ? 'text-primary' : 'text-white/55'}>{icon}</div>
      {children}
    </div>
  )
}

function RadioCard({ title, subtitle, icon, selected }) {
  return (
    <div
      className={
        selected
          ? 'flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4'
          : 'flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4'
      }
    >
      <div
        className={
          selected
            ? 'mt-1 h-4 w-4 rounded-full border-2 border-primary bg-primary'
            : 'mt-1 h-4 w-4 rounded-full border border-white/30 bg-transparent'
        }
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className={selected ? 'text-sm font-extrabold text-white' : 'text-sm font-bold text-white/85'}>{title}</div>
          <div className={selected ? 'text-primary' : 'text-white/55'}>{icon}</div>
        </div>
        <div className="mt-1 text-xs text-white/55">{subtitle}</div>
      </div>
    </div>
  )
}

export default function UnmatchedOrgans() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="border-b border-white/10 bg-background-dark/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Icon className="h-4 w-4 text-primary">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
              </Icon>
            </div>
            <div className="font-semibold tracking-tight">MANG</div>

            <div className="ml-4 hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 md:flex">
              <Icon className="h-4 w-4 text-white/50">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </Icon>
              <input
                className="w-64 border-0 bg-transparent p-0 text-sm text-white placeholder:text-white/40 focus:ring-0"
                placeholder="Search ID or Donor"
              />
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <Link className="hover:text-white" to="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-white" to="/inventory">
              Donor Registry
            </Link>
            <Link className="hover:text-white" to="/matching">
              Matching
            </Link>
            <Link className="hover:text-white" to="/logistics">
              Logistics
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/10" aria-label="Profile">
              <div className="h-full w-full bg-gradient-to-br from-white/30 to-white/5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[270px_1fr] gap-6 px-6 py-6">
        <aside className="rounded-2xl border border-white/10 bg-card-dark/40 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white/75">
              <Icon className="h-5 w-5">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-8h6v8" />
              </Icon>
            </div>
            <div>
              <div className="text-sm font-extrabold">Mercy General</div>
              <div className="text-xs text-white/55">Transplant Unit</div>
            </div>
          </div>

          <div className="mt-4 grid gap-1">
            <MenuItem
              icon={
                <Icon className="h-4 w-4">
                  <rect x="4" y="4" width="7" height="7" rx="1" />
                  <rect x="13" y="4" width="7" height="7" rx="1" />
                  <rect x="4" y="13" width="7" height="7" rx="1" />
                  <rect x="13" y="13" width="7" height="7" rx="1" />
                </Icon>
              }
            >
              Overview
            </MenuItem>
            <MenuItem
              icon={
                <Icon className="h-4 w-4">
                  <path d="M3 12h18" />
                  <path d="M3 6h18" />
                  <path d="M3 18h18" />
                </Icon>
              }
            >
              Waitlist
            </MenuItem>
            <MenuItem
              active
              icon={
                <Icon className="h-4 w-4">
                  <path d="M12 2v20" />
                  <path d="M2 12h20" />
                </Icon>
              }
            >
              Unmatched Organs
            </MenuItem>
            <MenuItem
              icon={
                <Icon className="h-4 w-4">
                  <path d="M3 7h18" />
                  <path d="M3 17h18" />
                  <path d="M7 7v10" />
                  <path d="M17 7v10" />
                </Icon>
              }
            >
              Transfers
            </MenuItem>
            <MenuItem
              icon={
                <Icon className="h-4 w-4">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-1.4 3.4h-.2a2 2 0 0 1-1.8-1.2 1.7 1.7 0 0 0-1.6-1h-.2a1.7 1.7 0 0 0-1.5 1 2 2 0 0 1-1.8 1.2h-.2a2 2 0 0 1-1.4-3.4l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1h-.2a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 6 3.6h.2A2 2 0 0 1 8 4.8a1.7 1.7 0 0 0 1.5 1h.2a1.7 1.7 0 0 0 1.6-1A2 2 0 0 1 13 3.6h.2a2 2 0 0 1 1.4 3.4l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" />
                </Icon>
              }
            >
              Settings
            </MenuItem>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-background-dark/40 p-4">
            <div className="text-sm font-extrabold">Need Support?</div>
            <div className="mt-2 text-xs text-white/60">Contact the rapid response team for urgent allocation issues.</div>
            <button type="button" className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-background-dark">
              Contact Team
            </button>
          </div>
        </aside>

        <main>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-3xl font-extrabold tracking-tight">Unmatched Organ Protocols</div>
              <div className="mt-1 text-sm text-white/60">3 Organs Pending Redistribution | 2 Confirmed for Research</div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
                <Icon className="h-4 w-4">
                  <path d="M12 3v12" />
                  <path d="M8 11l4 4 4-4" />
                  <path d="M8 21h8" />
                </Icon>
                Report
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-background-dark">
                <Icon className="h-4 w-4">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </Icon>
                Log New Unmatched
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <StatCard
              label="Pending Decision"
              value="3"
              suffix="+1 new"
              tone="primary"
              icon={
                <Icon className="h-5 w-5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </Icon>
              }
            />
            <StatCard
              label="Research Eligible"
              value="5"
              suffix="Total"
              icon={
                <Icon className="h-5 w-5">
                  <path d="M10 2v8" />
                  <path d="M14 2v8" />
                  <path d="M7 10h10" />
                  <path d="M7 22h10" />
                  <path d="M8 10v9a4 4 0 0 0 8 0v-9" />
                </Icon>
              }
            />
            <StatCard
              label="Education Only"
              value="1"
              suffix="Total"
              icon={
                <Icon className="h-5 w-5">
                  <path d="M22 10l-10 5L2 10l10-5 10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </Icon>
              }
            />
            <StatCard
              label="Critical (<2h)"
              value="2"
              suffix="Action Req."
              tone="danger"
              icon={
                <Icon className="h-5 w-5">
                  <path d="M12 2v6" />
                  <path d="M12 14v4" />
                  <path d="M6 8h12" />
                  <path d="M7 22h10" />
                </Icon>
              }
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
            <section className="rounded-2xl border border-white/10 bg-card-dark/50">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-4">
                <Pill active>All Organs</Pill>
                <Pill>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Liver
                  </span>
                </Pill>
                <Pill>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    Kidney
                  </span>
                </Pill>
                <Pill>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Heart
                  </span>
                </Pill>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-[1.6fr_1.2fr_1fr_0.9fr] gap-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  <div>Organ / ID</div>
                  <div>Reason</div>
                  <div>Viability</div>
                  <div>Status</div>
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                    <div className="grid grid-cols-[1.6fr_1.2fr_1fr_0.9fr] items-center gap-4">
                      <div>
                        <div className="text-sm font-extrabold">Liver (Right Lobe)</div>
                        <div className="mt-1 text-xs text-white/55">#DON-8842</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag tone="warn">High Fat Content</Tag>
                      </div>
                      <div className="flex flex-col">
                        <div className="inline-flex items-center gap-2 text-sm font-extrabold text-red-300">
                          <span className="grid h-5 w-5 place-items-center rounded-lg border border-red-500/25 bg-red-500/10">
                            <Icon className="h-3.5 w-3.5">
                              <path d="M12 2v6" />
                              <path d="M12 14v4" />
                            </Icon>
                          </span>
                          4h 12m
                        </div>
                        <div className="mt-1 text-xs text-white/55">Ischemic Time Limit</div>
                      </div>
                      <div>
                        <Tag tone="danger">Action Needed</Tag>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-[1.6fr_1.2fr_1fr_0.9fr] items-center gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/85">Kidney (Left)</div>
                        <div className="mt-1 text-xs text-white/55">#DON-9921</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag>Anatomical Anomaly</Tag>
                      </div>
                      <div className="text-sm font-extrabold text-amber-300">8h 45m</div>
                      <div>
                        <Tag>Pending</Tag>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-[1.6fr_1.2fr_1fr_0.9fr] items-center gap-4">
                      <div>
                        <div className="text-sm font-bold text-white/85">Heart</div>
                        <div className="mt-1 text-xs text-white/55">#DON-7734</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag>Donor Age • 65</Tag>
                      </div>
                      <div className="text-sm font-extrabold text-primary">Allocated</div>
                      <div>
                        <Tag tone="info">Research</Tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-card-dark/50 p-5">
              <div className="flex items-center gap-2">
                <Tag tone="danger">Expiring Soon</Tag>
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight">Liver (Right Lobe)</div>
              <div className="mt-1 text-sm text-white/55">ID: #DON-8842</div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/45">Donor Consent Profile</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag tone="ok">Research</Tag>
                  <Tag tone="info">Education</Tag>
                  <Tag>Bio-Banking</Tag>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/45">Select Zero-Waste Pathway</div>
                <div className="mt-3 grid gap-3">
                  <RadioCard
                    selected
                    title="Medical Research"
                    subtitle="Transfer to accredited institute for study of fatty liver disease pathology"
                    icon={
                      <Icon className="h-5 w-5">
                        <path d="M10 2v8" />
                        <path d="M14 2v8" />
                        <path d="M7 10h10" />
                        <path d="M8 10v9a4 4 0 0 0 8 0v-9" />
                        <path d="M7 22h10" />
                      </Icon>
                    }
                  />
                  <RadioCard
                    title="Clinical Education"
                    subtitle="Allocate to University Anatomy Lab for surgical training purposes"
                    icon={
                      <Icon className="h-5 w-5">
                        <path d="M22 10l-10 5L2 10l10-5 10 5z" />
                        <path d="M6 12v5c3 3 9 3 12 0v-5" />
                      </Icon>
                    }
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-white/45">Destination Institute</div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-extrabold">Bengaluru Medical College</div>
                    <div className="mt-1 text-xs text-white/55">Dept. of Pathology (Research Lab)</div>
                  </div>
                  <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80">
                    Change
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-extrabold text-background-dark"
                onClick={() => {
                  clearMatch()
                  navigate('/dashboard')
                }}
              >
                Confirm Transfer
                <Icon className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </Icon>
              </button>
              <button
                type="button"
                className="mt-3 w-full text-center text-sm font-semibold text-white/55 hover:text-white/75"
                onClick={() => navigate('/matching')}
              >
                Cancel & Return to List
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
