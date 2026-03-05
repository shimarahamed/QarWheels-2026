'use client';

import React, { useState, useEffect, useCallback, useRef, CSSProperties } from "react";
import { 
  INIT_VEHICLES, INIT_VENDORS, INIT_BOOKINGS, INIT_PARTS, PREDICT, 
  AREAS, SERVICES_LIST, MAKES, MODELS,
  uid, fmtQar, statusMeta, urgMeta 
} from '@/lib/qarwheels-data';

// ─── THEME ───────────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "var(--theme-bg)", surface: "var(--theme-surface)", surface2: "var(--theme-surface2)", border: "var(--theme-border)",
  text: "var(--theme-text)", text2: "var(--theme-text2)", text3: "var(--theme-text3)",
  primary: "var(--theme-primary)", accent: "var(--theme-accent)", accentLight: "var(--theme-accentLight)",
  success: "var(--theme-success)", warning: "var(--theme-warning)", danger: "var(--theme-danger)",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
  shadowLg: "0 10px 30px rgba(0,0,0,0.1)",
  navBg: "var(--theme-navBg)", navBorder: "var(--theme-navBorder)",
  inputBg: "var(--theme-inputBg)", cardHover: "var(--theme-cardHover)",
};
const DARK = {
  bg: "var(--theme-bg)", surface: "var(--theme-surface)", surface2: "var(--theme-surface2)", border: "var(--theme-border)",
  text: "var(--theme-text)", text2: "var(--theme-text2)", text3: "var(--theme-text3)",
  primary: "var(--theme-primary)", accent: "var(--theme-accent)", accentLight: "var(--theme-accentLight)",
  success: "var(--theme-success)", warning: "var(--theme-warning)", danger: "var(--theme-danger)",
  shadow: "0 1px 3px rgba(0,0,0,0.3)", shadowMd: "0 4px 12px rgba(0,0,0,0.4)", shadowLg: "0 10px 30px rgba(0,0,0,0.5)",
  navBg: "var(--theme-navBg)", navBorder: "var(--theme-navBorder)",
  inputBg: "var(--theme-inputBg)", cardHover: "var(--theme-cardHover)",
};

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────
function Badge({ children, color, bg }: {children: React.ReactNode, color: string, bg: string}) {
  return <span style={{ display:"inline-flex",alignItems:"center", background: bg, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5, whiteSpace:"nowrap" }}>{children}</span>;
}
function Btn({ children, variant, size, onClick, disabled: isDisabled, t, style: xStyle }: {children: React.ReactNode, variant?: string, size?: string, onClick?: (e: React.MouseEvent) => void, disabled?: boolean, t: any, style?: CSSProperties}) {
  const T = t;
  const v = variant || "primary";
  const sz = size || "md";
  const pad = sz === "sm" ? "5px 12px" : sz === "lg" ? "11px 24px" : "7px 16px";
  const fs = sz === "sm" ? 11 : sz === "lg" ? 15 : 13;
  const base: any = {
    primary: { background: "linear-gradient(135deg," + T.primary + "," + T.accent + ")", color: "#fff", border: "none" },
    outline: { background: "transparent", color: T.accent, border: "1.5px solid " + T.accent },
    ghost: { background: "transparent", color: T.text2, border: "1px solid " + T.border },
    danger: { background: T.danger, color: "#fff", border: "none" },
    success: { background: T.success, color: "#fff", border: "none" },
  };
  const merged: CSSProperties = {
    ...base[v] || base.primary,
    padding: pad, borderRadius: 9, fontSize: fs, fontWeight: 700,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
    fontFamily: "inherit", transition: "all 0.2s ease",
    ...xStyle
  };
  return <button disabled={isDisabled} onClick={onClick} style={merged}>{children}</button>;
}
function Input({ label, value, onChange, placeholder, type = "text", t }: {label?: string, value: string, onChange: (val: string) => void, placeholder?: string, type?: string, t: any}) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: t.text2, marginBottom: 5 }}>{label}</div>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${isFocused ? t.accent : t.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
        onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} />
    </div>
  );
}
function Select({ label, value, onChange, options, t }: {label?: string, value: string, onChange: (val: string) => void, options: any[], t: any}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: t.text2, marginBottom: 5 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: t.inputBg, border: `1.5px solid ${t.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", appearance: 'none' }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}
function Modal({ open, onClose, title, children, t, wide }: {open: boolean, onClose: () => void, title: string, children: React.ReactNode, t: any, wide?: boolean}) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background: t.surface, borderRadius: 18, padding: 28, width: "100%", maxWidth: wide ? 700 : 480, maxHeight: "90vh", overflowY: "auto", boxShadow: t.shadowLg }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:t.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:t.text3, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toast({ msg, t }: {msg: string, t: any}) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background: t.primary, color:"#fff", padding:"12px 20px", borderRadius:12, fontWeight:600, fontSize:13, zIndex:9999, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", maxWidth:320 }}>
      ✓ {msg}
    </div>
  );
}
function StatCard({ icon, label, value, sub, color, t }: {icon: string, label: string, value: string | number, sub: string, color: string, t: any}) {
  return (
    <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:"18px 20px", boxShadow:t.shadow }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <span style={{ color, fontSize:11, fontWeight:700, background: color+"18", padding:"2px 8px", borderRadius:20 }}>{sub}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, marginBottom:3 }}>{value}</div>
      <div style={{ fontSize:12, color:t.text3 }}>{label}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function QarWheels() {
  const [dark, setDark] = useState(false);
  const T = dark ? DARK : LIGHT;
  const [portal, setPortal] = useState("customer"); // customer | vendor | admin
  const [activeVendor, setActiveVendor] = useState("vnd1");

  // Data state
  const [vehicles, setVehicles] = useState(INIT_VEHICLES);
  const [vendors, setVendors] = useState(INIT_VENDORS);
  const [bookings, setBookings] = useState(INIT_BOOKINGS);
  const [parts, setParts] = useState(INIT_PARTS);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  
  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  // Global helpers passed down
  const ctx = { T, dark, vehicles, setVehicles, vendors, setVendors, bookings, setBookings, parts, setParts, notify };

  return (
    <div style={{ fontFamily: "'Outfit', 'DM Sans', 'Segoe UI', sans-serif", background: T.bg, color: T.text, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>
      {/* Portal Switcher Bar */}
      <div style={{ background: T.primary, padding: "8px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>🚗</span>
          <span style={{ color:"#fff", fontWeight:800, fontSize:16, letterSpacing:-0.5 }}>QarWheels</span>
          <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginLeft:4 }}>قر ويلز</span>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["customer","👤 Customer"],["vendor","🏪 Vendor"],["admin","🛡️ Admin"]].map(([p,l]) => (
            <button key={p} onClick={() => setPortal(p)} style={{ background: portal===p ? "rgba(255,255,255,0.2)" : "transparent", border: portal===p ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent", color:"#fff", borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{l}</button>
          ))}
          <button onClick={() => setDark(d => !d)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:8, padding:"4px 10px", fontSize:12, cursor:"pointer", marginLeft:6 }}>{dark ? "☀️" : "🌙"}</button>
        </div>
      </div>

      {portal === "customer" && <CustomerPortal ctx={ctx} />}
      {portal === "vendor" && <VendorPortal ctx={ctx} activeVendor={activeVendor} setActiveVendor={setActiveVendor} />}
      {portal === "admin" && <AdminPortal ctx={ctx} />}
      <Toast msg={toast} t={T} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerPortal({ ctx }: {ctx: any}) {
  const { T } = ctx;
  const [page, setPage] = useState("dashboard");
  const NAV = [
    { id:"dashboard", icon:"⊞", label:"Dashboard" },
    { id:"vehicles", icon:"🚘", label:"My Vehicles" },
    { id:"garages", icon:"🔧", label:"Garages" },
    { id:"parts", icon:"⚙️", label:"Spare Parts" },
    { id:"bookings", icon:"📅", label:"Bookings" },
    { id:"aiinsights", icon:"🧠", label:"AI Insights" },
  ];
  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 50px)" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:T.navBg, borderRight:`1px solid ${T.navBorder}`, padding:"20px 0", flexShrink:0, display:"flex", flexDirection:"column", boxShadow: T.shadow }}>
        <div style={{ padding:"0 16px 20px", borderBottom:`1px solid ${T.border}`, marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.text3, letterSpacing:1, marginBottom:10 }}>CUSTOMER PORTAL</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${T.primary},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:15 }}>A</div>
            <div><div style={{ fontWeight:700, fontSize:13, color:T.text }}>Ahmed Al-Thani</div><div style={{ fontSize:10, color:T.accent, fontWeight:600 }}>⭐ Premium Member</div></div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"0 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background: page===n.id ? T.accentLight : "transparent", border: page===n.id ? `1px solid ${T.accent}30` : "1px solid transparent", borderRadius:10, padding:"9px 12px", color: page===n.id ? T.accent : T.text2, fontWeight: page===n.id ? 700 : 500, fontSize:13, cursor:"pointer", marginBottom:2, transition:"all 0.2s", textAlign:"left", fontFamily:"inherit" }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
              {n.id==="aiinsights" && <span style={{ marginLeft:"auto", background:T.danger, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:10 }}>2</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${T.border}`, fontSize:11, color:T.text3 }}>Doha, Qatar 🌡️ 31°C</div>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"20px 28px", borderBottom:`1px solid ${T.border}`, background:T.surface, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:5 }}>
          <h1 style={{ margin:0, fontSize:19, fontWeight:800, color:T.text }}>{NAV.find(n=>n.id===page)?.label}</h1>
          <div style={{ fontSize:11, color:T.text3 }}>Friday, 6 March 2026</div>
        </div>
        <div style={{ padding:"24px 28px" }}>
          {page==="dashboard" && <CustDashboard ctx={ctx} setPage={setPage} />}
          {page==="vehicles" && <CustVehicles ctx={ctx} />}
          {page==="garages" && <CustGarages ctx={ctx} />}
          {page==="parts" && <CustParts ctx={ctx} />}
          {page==="bookings" && <CustBookings ctx={ctx} />}
          {page==="aiinsights" && <CustAI ctx={ctx} />}
        </div>
      </div>
    </div>
  );
}

function CustDashboard({ ctx, setPage }: {ctx: any, setPage: (page: string) => void}) {
  const { T, vehicles, bookings, vendors } = ctx;
  const upcoming = bookings.filter((b: any) => b.status === "confirmed" || b.status === "pending");
  const critical = PREDICT.filter(p => p.urgency === "critical");
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard icon="🚘" label="Registered Vehicles" value={vehicles.length} sub="+0 this month" color={T.accent} t={T} />
        <StatCard icon="📅" label="Upcoming Services" value={upcoming.length} sub="Active" color={T.warning} t={T} />
        <StatCard icon="🧠" label="AI Alerts" value={critical.length} sub="Critical" color={T.danger} t={T} />
        <StatCard icon="🔧" label="Garages Nearby" value={vendors.filter((v: any) =>v.approved&&v.type==="garage").length} sub="Open now" color={T.success} t={T} />
      </div>

      {/* Critical alert banner */}
      {critical.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:14, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:22 }}>🛢️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#991B1B" }}>Engine Oil Change Required — Desert Runner</div>
            <div style={{ fontSize:12, color:"#B91C1C", marginTop:2 }}>Only 1,800 km remaining before critical service window. Qatar heat accelerates oil breakdown.</div>
          </div>
          <button onClick={() => setPage("bookings")} style={{ background:"#EF4444", border:"none", color:"#fff", borderRadius:8, padding:"7px 14px", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Book Now</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:20 }}>
        {/* Vehicles Overview */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>My Vehicles</h3>
            <button onClick={() => setPage("vehicles")} style={{ fontSize:12, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>View all →</button>
          </div>
          {vehicles.map((v: any) => {
            const pred = PREDICT[0];
            const pct = Math.min(100, Math.round((1 - pred.km / 10000) * 100));
            return (
              <div key={v.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ width:40, height:40, borderRadius:12, background: v.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🚗</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{v.nickname}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{v.year} {v.make} {v.model} · {v.mileage.toLocaleString()} km</div>
                  <div style={{ marginTop:5, height:4, background:T.surface2, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background: pct>70?"#EF4444":pct>40?"#F59E0B":T.accent, borderRadius:2, transition:"width 1s ease" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Recent Bookings */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>Recent Bookings</h3>
            <button onClick={() => setPage("bookings")} style={{ fontSize:12, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>View all →</button>
          </div>
          {bookings.slice(0,4).map((b: any) => {
            const sm = (statusMeta as any)[b.status] || {};
            const vendor = ctx.vendors.find((v: any)=>v.id===b.vendorId);
            return (
              <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                <div style={{ width:36, height:36, background: sm.color+"18", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📋</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{b.service}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{vendor?.businessName} · {b.date}</div>
                </div>
                <Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustVehicles({ ctx }: {ctx: any}) {
  const { T, vehicles, setVehicles, notify } = ctx;
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ vin:"", make:"Toyota", model:"Land Cruiser", year:"2024", mileage:"", nickname:"", engine:"", fuelType:"Petrol", color:"#0B3C5D" });
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]: v }));
  const submit = () => {
    if (!form.vin || !form.nickname || !form.mileage) { notify("Please fill all required fields"); return; }
    setVehicles((vs: any) => [...vs, { id:"v"+uid(), userId:"u1", ...form, mileage:+form.mileage, year:+form.year, lastService: new Date().toISOString().slice(0,10) }]);
    setModal(false); notify("Vehicle added: " + form.nickname);
    setForm({ vin:"", make:"Toyota", model:"Land Cruiser", year:"2024", mileage:"", nickname:"", engine:"", fuelType:"Petrol", color:"#0B3C5D" });
  };
  const del = (id: string) => { setVehicles((vs: any) => vs.filter((v: any) => v.id !== id)); notify("Vehicle removed"); };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:13, color:T.text3 }}>{vehicles.length} vehicles registered</div>
        <Btn t={T} onClick={() => setModal(true)}>+ Add Vehicle via VIN</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {vehicles.map((v: any) => (
          <div key={v.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:22, boxShadow:T.shadow, transition:"box-shadow 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=T.shadowMd} onMouseLeave={e => e.currentTarget.style.boxShadow=T.shadow}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:v.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🚗</div>
              <button onClick={() => del(v.id)} style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.danger, borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14 }}>×</button>
            </div>
            <div style={{ fontWeight:800, fontSize:17, color:v.color, marginBottom:2 }}>{v.nickname}</div>
            <div style={{ color:T.text2, fontSize:12, marginBottom:14 }}>{v.year} {v.make} {v.model} · {v.engine}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["Mileage",v.mileage.toLocaleString()+" km"],["Fuel",v.fuelType],["VIN","···"+v.vin.slice(-6)],["Last Svc",v.lastService]].map(([k,val]: any) => (
                <div key={k} style={{ background:T.surface2, borderRadius:9, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, color:T.text3, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div onClick={() => setModal(true)} style={{ background:"transparent", border:`2px dashed ${T.border}`, borderRadius:18, padding:22, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, cursor:"pointer", minHeight:200, transition:"all 0.2s", color:T.text3 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=T.accent; e.currentTarget.style.color=T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.text3; }}>
          <span style={{ fontSize:30 }}>+</span>
          <div style={{ fontWeight:700, fontSize:13 }}>Add Vehicle</div>
          <div style={{ fontSize:11, textAlign:"center" }}>Scan VIN to auto-fill details</div>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add New Vehicle" t={T} wide>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <Input label="VIN Number *" value={form.vin} onChange={f("vin")} placeholder="e.g. JTMB3FJV1MD123456" t={T} />
          <Input label="Nickname *" value={form.nickname} onChange={f("nickname")} placeholder="e.g. Desert Runner" t={T} />
          <Select label="Make" value={form.make} onChange={v => setForm(p=>({...p,make:v,model:(MODELS as any)[v]?.[0]||""}))} options={MAKES} t={T} />
          <Select label="Model" value={form.model} onChange={f("model")} options={((MODELS as any)[form.make]||[]).map((m: any)=>({value:m,label:m}))} t={T} />
          <Input label="Year" value={form.year} onChange={f("year")} type="number" placeholder="2024" t={T} />
          <Input label="Current Mileage (km) *" value={form.mileage} onChange={f("mileage")} type="number" placeholder="e.g. 35000" t={T} />
          <Input label="Engine" value={form.engine} onChange={f("engine")} placeholder="e.g. 3.5L V6" t={T} />
          <Select label="Fuel Type" value={form.fuelType} onChange={f("fuelType")} options={["Petrol","Diesel","Hybrid","Electric"]} t={T} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
          <Btn t={T} variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn t={T} onClick={submit}>Add Vehicle</Btn>
        </div>
      </Modal>
    </div>
  );
}

function CustGarages({ ctx }: {ctx: any}) {
  const { T, vendors, vehicles, bookings, setBookings, notify } = ctx;
  const approved = vendors.filter((v: any) => v.approved && v.type === "garage");
  const [search, setSearch] = useState("");
  const [bookModal, setBookModal] = useState<any>(null);
  const [form, setForm] = useState({ vehicleId: vehicles[0]?.id||"", service:"", date:"", time:"9:00 AM", notes:"" });
  const filtered = approved.filter((g: any) => g.businessName.toLowerCase().includes(search.toLowerCase()) || g.area.toLowerCase().includes(search.toLowerCase()) || g.services.some((s: string) => s.toLowerCase().includes(search.toLowerCase())));
  const submitBook = () => {
    if (!form.service || !form.date) { notify("Please select service and date"); return; }
    const newB = { id:"BK-"+Math.floor(Math.random()*9000+1000), userId:"u1", vehicleId:form.vehicleId, vendorId:bookModal.id, service:form.service, date:form.date, time:form.time, status:"pending", notes:form.notes, price:120, createdAt:new Date().toISOString().slice(0,10) };
    setBookings((bs: any) => [newB, ...bs]);
    setBookModal(null); notify("Booking request sent to "+bookModal.businessName);
  };
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <div style={{ flex:1, background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"9px 14px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:T.text3 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search garages by name, area or service..." style={{ background:"transparent", border:"none", outline:"none", color:T.text, fontSize:13, flex:1, fontFamily:"inherit" }} />
        </div>
      </div>
      <div style={{ fontSize:12, color:T.text3, marginBottom:14 }}>{filtered.length} garages found in Qatar</div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map((g: any) => (
          <div key={g.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow, display:"flex", gap:16, alignItems:"flex-start", transition:"box-shadow 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadowMd} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
            <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${T.primary}18,${T.accent}18)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{g.logo}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontWeight:800, fontSize:15, color:T.text }}>{g.businessName}</span>
                <Badge color={T.accent} bg={T.accentLight}>⭐ {g.rating}</Badge>
              </div>
              <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>📍 {g.area} · {g.reviews} reviews · {g.workingHours}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {g.services.map((s: string) => <Badge key={s} color={T.text2} bg={T.surface2}>{s}</Badge>)}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ color:T.success, fontSize:11, fontWeight:700, marginBottom:8 }}>● Open</div>
              <Btn t={T} size="sm" onClick={() => { setBookModal(g); setForm(f=>({...f, service:g.services[0]})); }}>Book Service</Btn>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!bookModal} onClose={() => setBookModal(null)} title={"Book — " + (bookModal?.businessName||"")} t={T} wide>
        <Select label="Vehicle" value={form.vehicleId} onChange={v=>setForm(p=>({...p,vehicleId:v}))} options={vehicles.map((v: any)=>({value:v.id,label:`${v.nickname} · ${v.year} ${v.make} ${v.model}`}))} t={T} />
        <Select label="Service" value={form.service} onChange={v=>setForm(p=>({...p,service:v}))} options={(bookModal?.services||[]).map((s: string)=>({value:s,label:s}))} t={T} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label="Date *" value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} type="date" t={T} />
          <Select label="Preferred Time" value={form.time} onChange={v=>setForm(p=>({...p,time:v}))} options={["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"]} t={T} />
        </div>
        <Input label="Notes (optional)" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Any specific concerns?" t={T} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn t={T} variant="ghost" onClick={() => setBookModal(null)}>Cancel</Btn>
          <Btn t={T} onClick={submitBook}>Confirm Booking</Btn>
        </div>
      </Modal>
    </div>
  );
}

function CustParts({ ctx }: {ctx: any}) {
  const { T, parts, vehicles, notify } = ctx;
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...new Set(parts.map((p: any) => p.category))];
  const filtered = parts.filter((p: any) => (filter === "All" || p.category === filter) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())));
  const addCart = (p: any) => { setCart(c => { const ex = c.find(x=>x.id===p.id); return ex ? c.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x) : [...c,{...p,qty:1}]; }); notify(p.name + " added to cart"); };
  const condColor: any = { OEM: T.accent, Aftermarket: T.warning, Used: T.text3 };
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <div style={{ flex:1, background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"9px 14px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:T.text3 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search parts..." style={{ background:"transparent", border:"none", outline:"none", color:T.text, fontSize:13, flex:1, fontFamily:"inherit" }} />
        </div>
        {cart.length > 0 && <Btn t={T} onClick={() => notify("Proceeding to checkout — " + cart.reduce((a,c)=>a+c.qty,0) + " items · " + fmtQar(cart.reduce((a,c)=>a+c.price*c.qty,0)))}>🛒 Cart ({cart.reduce((a,c)=>a+c.qty,0)})</Btn>}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ background: filter===c ? T.accent : T.surface, border: `1px solid ${filter===c ? T.accent : T.border}`, color: filter===c ? "#fff" : T.text2, borderRadius:20, padding:"5px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{c}</button>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {filtered.map((p: any) => (
          <div key={p.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18, boxShadow:T.shadow, transition:"box-shadow 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadowMd} onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
            <div style={{ fontSize:34, marginBottom:10 }}>{p.img}</div>
            <div style={{ fontSize:10, color:T.text3, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", marginBottom:4 }}>{p.category}</div>
            <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:11, color:T.text3, marginBottom:12 }}>Fits: {Array.isArray(p.compatible)?p.compatible.join(", "):p.compatible}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:800, fontSize:16, color:T.primary }}>{fmtQar(p.price)}</span>
              <Badge color={condColor[p.condition]} bg={condColor[p.condition]+"18"}>{p.condition}</Badge>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:p.stock<5?T.danger:T.text3 }}>{p.stock} in stock</span>
              <Btn t={T} size="sm" onClick={() => addCart(p)} disabled={p.stock===0}>Add to Cart</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustBookings({ ctx }: {ctx: any}) {
  const { T, bookings, setBookings, vehicles, vendors, notify } = ctx;
  const [filter, setFilter] = useState("All");
  const [bookModal, setBookModal] = useState(false);
  const [form, setForm] = useState({ vehicleId: vehicles[0]?.id||"", vendorId:"vnd1", service:"", date:"", time:"9:00 AM", notes:"" });
  const filtered = bookings.filter((b: any) => filter==="All" || b.status===filter.toLowerCase());
  const cancel = (id: string) => { setBookings((bs: any) => bs.map((b: any) => b.id===id ? {...b,status:"cancelled"} : b)); notify("Booking cancelled"); };
  const submitBook = () => {
    if (!form.service || !form.date) { notify("Please fill required fields"); return; }
    const vendor = vendors.find((v: any)=>v.id===form.vendorId);
    const newB = { id:"BK-"+Math.floor(Math.random()*9000+1000), userId:"u1", ...form, status:"pending", price:150, createdAt:new Date().toISOString().slice(0,10) };
    setBookings((bs: any) => [newB, ...bs]);
    setBookModal(false); notify("Booking submitted to "+vendor?.businessName);
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", gap:6 }}>
          {["All","Pending","Confirmed","In Progress","Completed","Cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ background: filter===f?T.accent:T.surface, border:`1px solid ${filter===f?T.accent:T.border}`, color:filter===f?"#fff":T.text2, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{f}</button>
          ))}
        </div>
        <Btn t={T} onClick={() => setBookModal(true)}>+ New Booking</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map((b: any) => {
          const sm = (statusMeta as any)[b.status]||{};
          const vendor = vendors.find((v: any)=>v.id===b.vendorId);
          const vehicle = vehicles.find((v: any)=>v.id===b.vehicleId);
          return (
            <div key={b.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 18px", boxShadow:T.shadow, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:44, height:44, background:sm.color+"18", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📋</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{b.service}</div>
                <div style={{ fontSize:12, color:T.text3 }}>{vendor?.businessName} · {vehicle?.nickname} · {b.date} at {b.time}</div>
                {b.notes && <div style={{ fontSize:11, color:T.text3, marginTop:3, fontStyle:"italic" }}>"{b.notes}"</div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                <Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge>
                <div style={{ fontSize:12, fontWeight:700, color:T.primary }}>{fmtQar(b.price)}</div>
                <div style={{ fontSize:10, color:T.text3, fontFamily:"monospace" }}>{b.id}</div>
                {(b.status==="pending"||b.status==="confirmed") && <Btn t={T} size="sm" variant="ghost" onClick={() => cancel(b.id)}>Cancel</Btn>}
              </div>
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:40, color:T.text3, fontSize:14 }}>No bookings found</div>}
      </div>
      <Modal open={bookModal} onClose={() => setBookModal(false)} title="New Service Booking" t={T} wide>
        <Select label="Vehicle" value={form.vehicleId} onChange={v=>setForm(p=>({...p,vehicleId:v}))} options={vehicles.map((v: any)=>({value:v.id,label:`${v.nickname} · ${v.year} ${v.make} ${v.model}`}))} t={T} />
        <Select label="Garage" value={form.vendorId} onChange={v=>setForm(p=>({...p,vendorId:v}))} options={vendors.filter((v: any)=>v.approved&&v.type==="garage").map((v: any)=>({value:v.id,label:v.businessName+" · "+v.area}))} t={T} />
        <Input label="Service Required *" value={form.service} onChange={v=>setForm(p=>({...p,service:v}))} placeholder="e.g. Full AC Service + Oil Change" t={T} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label="Date *" value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} type="date" t={T} />
          <Select label="Time" value={form.time} onChange={v=>setForm(p=>({...p,time:v}))} options={["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM"]} t={T} />
        </div>
        <Input label="Notes" value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Describe the issue or request" t={T} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn t={T} variant="ghost" onClick={() => setBookModal(false)}>Cancel</Btn>
          <Btn t={T} onClick={submitBook}>Submit Booking</Btn>
        </div>
      </Modal>
    </div>
  );
}

function CustAI({ ctx }: {ctx: any}) {
  const { T, vehicles, dark } = ctx;
  const [selV, setSelV] = useState(vehicles[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const run = () => { setAnalyzing(true); setRefreshed(false); setTimeout(() => { setAnalyzing(false); setRefreshed(true); }, 2000); };
  return (
    <div>
      <div style={{ background:`linear-gradient(135deg, ${T.primary}, ${T.accent})`, borderRadius:20, padding:26, marginBottom:24, color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:28, marginBottom:8 }}>🧠</div>
            <h2 style={{ margin:"0 0 6px", fontSize:19, fontWeight:800 }}>AI Predictive Maintenance Engine</h2>
            <p style={{ margin:0, fontSize:12, opacity:0.8, maxWidth:440 }}>Analyzes VIN, service history, mileage, and Qatar climate data to predict upcoming maintenance needs.</p>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, fontWeight:700, opacity:0.9, marginBottom:8 }}>● ACTIVE · Updated 2h ago</div>
            <button onClick={run} disabled={analyzing} style={{ background:"rgba(255,255,255,0.25)", border:"1px solid rgba(255,255,255,0.5)", color:"#fff", borderRadius:9, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:analyzing?"not-allowed":"pointer", fontFamily:"inherit" }}>{analyzing?"⟳ Analyzing...":"Run Full Analysis"}</button>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:18 }}>
          {[["Qatar Climate","Active ✓","#4ade80"],["VIN Database","Connected ✓","#4ade80"],["Service Records",vehicles.length+" vehicles","rgba(255,255,255,0.9)"]].map(([k,v,c]: any) => (
            <div key={k} style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:3 }}>{k}</div>
              <div style={{ fontWeight:700, fontSize:13, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {vehicles.map((v: any) => <button key={v.id} onClick={() => setSelV(v)} style={{ background:selV?.id===v.id?T.accent:T.surface, border:`1px solid ${selV?.id===v.id?T.accent:T.border}`, color:selV?.id===v.id?"#fff":T.text2, borderRadius:9, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{v.nickname}</button>)}
      </div>
      {refreshed && <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#166534", fontWeight:600 }}>✓ AI analysis complete for {selV?.nickname} · {new Date().toLocaleTimeString()}</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {PREDICT.map((p, i) => {
          const um = (urgMeta as any)[p.urgency];
          return (
            <div key={p.service} style={{ background: ctx.dark ? um.darkBg : um.bg, border:`1px solid ${um.color}30`, borderRadius:14, padding:"16px 18px", display:"flex", alignItems:"center", gap:14, opacity: analyzing?0.5:1, transition:"opacity 0.3s" }}>
              <span style={{ fontSize:26 }}>{p.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:T.text }}>{p.service}</span>
                  <Badge color={um.color} bg={um.color+"20"}>{um.label}</Badge>
                </div>
                <div style={{ fontSize:12, color:T.text2, marginBottom:6 }}>{p.desc}</div>
                <div style={{ display:"flex", gap:16 }}>
                  <span style={{ color:um.color, fontSize:12, fontWeight:700 }}>In {p.km.toLocaleString()} km</span>
                  <span style={{ color:T.text3, fontSize:12 }}>Confidence: {p.confidence}%</span>
                </div>
              </div>
              <Btn t={T} size="sm" variant={p.urgency==="critical"?"danger":"outline"}>Book Service</Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDOR PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
function VendorPortal({ ctx, activeVendor, setActiveVendor }: {ctx: any, activeVendor: string, setActiveVendor: (id: string) => void}) {
  const { T, vendors, bookings, parts, setBookings, setParts, notify } = ctx;
  const [page, setPage] = useState("overview");
  const vendor = vendors.find((v: any) => v.id === activeVendor) || vendors[0];
  const myBookings = bookings.filter((b: any) => b.vendorId === vendor?.id);
  const myParts = parts.filter((p: any) => p.vendorId === vendor?.id);

  const NAV = [
    { id:"overview", icon:"⊞", label:"Overview" },
    { id:"bookings", icon:"📅", label:"Bookings" },
    { id:"services", icon:"🔧", label:"Services" },
    { id:"inventory", icon:"⚙️", label:"Inventory" },
    { id:"analytics", icon:"📊", label:"Analytics" },
    { id:"profile", icon:"⚙️", label:"Business Profile" },
  ];

  if (!vendor) return <div style={{ padding:40, color:T.text3 }}>No vendor found</div>;

  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 50px)" }}>
      {/* Vendor Sidebar */}
      <div style={{ width:220, background:T.navBg, borderRight:`1px solid ${T.navBorder}`, padding:"20px 0", flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"0 16px 16px", borderBottom:`1px solid ${T.border}`, marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.text3, letterSpacing:1, marginBottom:10 }}>VENDOR PORTAL</div>
          {/* Vendor switcher */}
          <select value={activeVendor} onChange={e => setActiveVendor(e.target.value)} style={{ width:"100%", background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 10px", fontSize:12, color:T.text, fontFamily:"inherit", marginBottom:10 }}>
            {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.logo} {v.businessName}</option>)}
          </select>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${T.primary}18,${T.accent}18)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{vendor.logo}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:12, color:T.text }}>{vendor.businessName}</div>
              <div style={{ fontSize:10 }}><Badge color={vendor.approved?T.success:T.warning} bg={vendor.approved?T.success+"18":T.warning+"18"}>{vendor.approved?"✓ Approved":"⏳ Pending"}</Badge></div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"0 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:page===n.id?T.accentLight:"transparent", border:page===n.id?`1px solid ${T.accent}30`:"1px solid transparent", borderRadius:10, padding:"9px 12px", color:page===n.id?T.accent:T.text2, fontWeight:page===n.id?700:500, fontSize:13, cursor:"pointer", marginBottom:2, textAlign:"left", fontFamily:"inherit" }}>
              <span>{n.icon}</span>{n.label}
              {n.id==="bookings" && myBookings.filter((b: any)=>b.status==="pending").length > 0 && <span style={{ marginLeft:"auto", background:T.warning, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:10 }}>{myBookings.filter((b: any)=>b.status==="pending").length}</span>}
            </button>
          ))}
        </nav>
      </div>
      {/* Vendor Content */}
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"18px 26px", borderBottom:`1px solid ${T.border}`, background:T.surface, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:5 }}>
          <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>{NAV.find(n=>n.id===page)?.label}</h1>
          {!vendor.approved && <Badge color={T.warning} bg={T.warning+"18"}>⏳ Awaiting Admin Approval — some features are limited</Badge>}
        </div>
        <div style={{ padding:"22px 26px" }}>
          {page==="overview" && <VendorOverview vendor={vendor} myBookings={myBookings} myParts={myParts} T={T} setPage={setPage} />}
          {page==="bookings" && <VendorBookings vendor={vendor} myBookings={myBookings} setBookings={setBookings} vehicles={ctx.vehicles} notify={notify} T={T} />}
          {page==="services" && <VendorServices vendor={vendor} vendors={ctx.vendors} setVendors={ctx.setVendors} notify={notify} T={T} />}
          {page==="inventory" && <VendorInventory vendor={vendor} myParts={myParts} setParts={setParts} notify={notify} T={T} />}
          {page==="analytics" && <VendorAnalytics vendor={vendor} myBookings={myBookings} T={T} />}
          {page==="profile" && <VendorProfile vendor={vendor} vendors={ctx.vendors} setVendors={ctx.setVendors} notify={notify} T={T} />}
        </div>
      </div>
    </div>
  );
}

function VendorOverview({ vendor, myBookings, myParts, T, setPage }: {vendor: any, myBookings: any[], myParts: any[], T: any, setPage: (page: string) => void}) {
  const pending = myBookings.filter(b=>b.status==="pending").length;
  const completed = myBookings.filter(b=>b.status==="completed").length;
  const revenue = myBookings.filter(b=>b.status==="completed").reduce((a,b)=>a+b.price,0);
  return (
    <div>
      {pending > 0 && <div style={{ background:"#FFFBEB", border:"1.5px solid #FDE68A", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>🔔</span>
        <span style={{ fontSize:13, color:"#92400E", fontWeight:600 }}>{pending} new booking request{pending>1?"s":""} awaiting your response</span>
        <button onClick={() => setPage("bookings")} style={{ marginLeft:"auto", background:"#F59E0B", border:"none", color:"#fff", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View →</button>
      </div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
        <StatCard icon="📅" label="Total Bookings" value={myBookings.length} sub="All time" color={T.accent} t={T} />
        <StatCard icon="⏳" label="Pending" value={pending} sub="Needs action" color={T.warning} t={T} />
        <StatCard icon="✅" label="Completed" value={completed} sub="This period" color={T.success} t={T} />
        <StatCard icon="💰" label="Revenue" value={fmtQar(revenue)} sub="Completed jobs" color={T.primary} t={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        {/* Recent bookings */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18, boxShadow:T.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:T.text }}>Recent Bookings</h3>
            <button onClick={() => setPage("bookings")} style={{ fontSize:12, color:T.accent, background:"transparent", border:"none", cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>View all →</button>
          </div>
          {myBookings.slice(0,5).map((b: any) => {
            const sm = (statusMeta as any)[b.status]||{};
            return <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <div><div style={{ fontSize:13, fontWeight:600, color:T.text }}>{b.service}</div><div style={{ fontSize:11, color:T.text3 }}>{b.date}</div></div>
              <Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge>
            </div>;
          })}
          {myBookings.length===0 && <div style={{ color:T.text3, fontSize:13, padding:"20px 0", textAlign:"center" }}>No bookings yet</div>}
        </div>
        {/* Services & Info */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18, boxShadow:T.shadow }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:T.text }}>Business Info</h3>
          {[["Type",vendor.type.charAt(0).toUpperCase()+vendor.type.slice(1)],["Area",vendor.area],["Hours",vendor.workingHours],["Rating","⭐ "+vendor.rating+" ("+vendor.reviews+" reviews)"],["License",vendor.tradeLicense]].map(([k,v]: any) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12, color:T.text3 }}>{k}</span>
              <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>Services Offered</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{vendor.services.map((s: string)=><Badge key={s} color={T.text2} bg={T.surface2}>{s}</Badge>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorBookings({ myBookings, setBookings, notify, T }: {vendor: any, myBookings: any[], setBookings: any, vehicles: any[], notify: (msg: string) => void, T: any}) {
  const [filter, setFilter] = useState("All");
  const filtered = myBookings.filter(b => filter==="All" || b.status===filter.toLowerCase().replace(" ","_"));
  const updateStatus = (id: string, status: string) => { setBookings((bs: any) => bs.map((b: any) => b.id===id ? {...b, status} : b)); notify("Booking "+id+" updated to "+status); };
  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["All","Pending","Confirmed","In Progress","Completed","Cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?T.accent:T.surface, border:`1px solid ${filter===f?T.accent:T.border}`, color:filter===f?"#fff":T.text2, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{f} {f==="Pending"&&myBookings.filter(b=>b.status==="pending").length>0?`(${myBookings.filter(b=>b.status==="pending").length})`:""}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map((b: any) => {
          const sm = (statusMeta as any)[b.status]||{};
          return (
            <div key={b.id} style={{ background:T.surface, border:`1px solid ${b.status==="pending"?T.warning:T.border}`, borderRadius:14, padding:"16px 18px", boxShadow:T.shadow }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontWeight:800, fontSize:14, color:T.text }}>{b.service}</span>
                    <Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge>
                    <span style={{ fontFamily:"monospace", fontSize:10, color:T.text3 }}>{b.id}</span>
                  </div>
                  <div style={{ fontSize:12, color:T.text3 }}>📅 {b.date} at {b.time} · 💰 {fmtQar(b.price)}</div>
                  {b.notes && <div style={{ fontSize:11, color:T.text2, marginTop:4, background:T.surface2, borderRadius:6, padding:"4px 8px", display:"inline-block" }}>"{b.notes}"</div>}
                </div>
              </div>
              {b.status === "pending" && (
                <div style={{ display:"flex", gap:8 }}>
                  <Btn t={T} size="sm" variant="success" onClick={() => updateStatus(b.id,"confirmed")}>✓ Accept</Btn>
                  <Btn t={T} size="sm" variant="danger" onClick={() => updateStatus(b.id,"cancelled")}>✕ Decline</Btn>
                </div>
              )}
              {b.status === "confirmed" && <Btn t={T} size="sm" onClick={() => updateStatus(b.id,"in_progress")}>▶ Start Service</Btn>}
              {b.status === "in_progress" && <Btn t={T} size="sm" variant="success" onClick={() => updateStatus(b.id,"completed")}>✓ Mark Complete</Btn>}
            </div>
          );
        })}
        {filtered.length===0 && <div style={{ textAlign:"center", padding:40, color:T.text3 }}>No bookings in this category</div>}
      </div>
    </div>
  );
}

function VendorServices({ vendor, vendors, setVendors, notify, T }: {vendor: any, vendors: any[], setVendors: any, notify: (msg: string) => void, T: any}) {
  const [services, setServices] = useState([...vendor.services]);
  const [newSvc, setNewSvc] = useState("");
  const add = () => { if (!newSvc.trim()) return; const updated = [...services, newSvc.trim()]; setServices(updated); setVendors((vs: any) => vs.map((v: any)=>v.id===vendor.id?{...v,services:updated}:v)); setNewSvc(""); notify("Service added: "+newSvc); };
  const remove = (s: string) => { const updated = services.filter(x=>x!==s); setServices(updated); setVendors((vs: any) => vs.map((v: any)=>v.id===vendor.id?{...v,services:updated}:v)); notify("Service removed"); };
  return (
    <div style={{ maxWidth:600 }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:22, boxShadow:T.shadow, marginBottom:18 }}>
        <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:T.text }}>Current Services ({services.length})</h3>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
          {services.map(s => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:6, background:T.accentLight, border:`1px solid ${T.accent}30`, borderRadius:20, padding:"5px 12px" }}>
              <span style={{ fontSize:12, fontWeight:600, color:T.accent }}>{s}</span>
              <button onClick={() => remove(s)} style={{ background:"transparent", border:"none", color:T.text3, cursor:"pointer", fontSize:14, lineHeight:1, padding:0 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select value={newSvc} onChange={e=>setNewSvc(e.target.value)} style={{ flex:1, background:T.inputBg, border:`1.5px solid ${T.border}`, borderRadius:9, padding:"9px 12px", fontSize:13, color:T.text, fontFamily:"inherit", appearance: 'none' }}>
            <option value="">Select service to add...</option>
            {SERVICES_LIST.filter(s=>!services.includes(s)).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <Btn t={T} onClick={add}>Add</Btn>
        </div>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:22, boxShadow:T.shadow }}>
        <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:T.text }}>Working Hours</h3>
        <div style={{ fontSize:13, color:T.text2, marginBottom:14 }}>Current: <strong>{vendor.workingHours}</strong></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {["Monday–Friday","Saturday","Sunday"].map(d => (
            <div key={d} style={{ background:T.surface2, borderRadius:10, padding:"10px 14px" }}>
              <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>{d}</div>
              <input defaultValue={d==="Sunday"?"Closed":"7:00 AM – 9:00 PM"} style={{ background:"transparent", border:"none", outline:"none", fontSize:13, fontWeight:600, color:T.text, fontFamily:"inherit", width:"100%" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop:14 }}><Btn t={T} onClick={() => notify("Working hours saved")}>Save Hours</Btn></div>
      </div>
    </div>
  );
}

function VendorInventory({ vendor, myParts, setParts, notify, T }: {vendor: any, myParts: any[], setParts: any, notify: (msg: string) => void, T: any}) {
  const [modal, setModal] = useState(false);
  const [editPart, setEditPart] = useState<any>(null);
  const [form, setForm] = useState({ name:"", category:"Engine Oil", price:"", condition:"OEM", stock:"", sku:"", img:"🔧", compatible:"" });
  const f = (k: string) => (v: any) => setForm(p=>({...p,[k]:v}));
  const submit = () => {
    if (!form.name || !form.price) { notify("Please fill required fields"); return; }
    if (editPart) {
      setParts((ps: any) => ps.map((p: any) => p.id===editPart.id ? {...p,...form,price:+form.price,stock:+form.stock,compatible:form.compatible.split(",").map(c=>c.trim())} : p));
      notify("Part updated: "+form.name);
    } else {
      setParts((ps: any) => [...ps, { id:"p"+uid(), vendorId:vendor.id, ...form, price:+form.price, stock:+form.stock, compatible:form.compatible.split(",").map(c=>c.trim()) }]);
      notify("Part added: "+form.name);
    }
    setModal(false); setEditPart(null); setForm({ name:"", category:"Engine Oil", price:"", condition:"OEM", stock:"", sku:"", img:"🔧", compatible:"" });
  };
  const openEdit = (p: any) => { setEditPart(p); setForm({...p, compatible:Array.isArray(p.compatible)?p.compatible.join(", "):p.compatible, price:String(p.price), stock:String(p.stock)}); setModal(true); };
  const del = (id: string) => { setParts((ps: any) => ps.filter((p: any)=>p.id!==id)); notify("Part removed"); };
  const condColor: any = { OEM:T.accent, Aftermarket:T.warning, Used:T.text3 };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:T.text3 }}>{myParts.length} parts listed · {myParts.filter(p=>p.stock<5).length} low stock</div>
        <Btn t={T} onClick={() => { setEditPart(null); setModal(true); }}>+ Add Part</Btn>
      </div>
      {myParts.filter(p=>p.stock<5).length>0 && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#991B1B", fontWeight:600 }}>⚠️ {myParts.filter(p=>p.stock<5).length} part(s) have low stock (under 5 units)</div>}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:T.surface2 }}>
              {["Part","Category","Condition","Price","Stock","SKU","Actions"].map(h => <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:T.text3, letterSpacing:0.5, textTransform:"uppercase" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {myParts.map((p, i) => (
              <tr key={p.id} style={{ borderTop:`1px solid ${T.border}`, background:i%2===0?"transparent":T.surface2+"50" }}>
                <td style={{ padding:"12px 14px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:20 }}>{p.img}</span><div><div style={{ fontSize:13, fontWeight:600, color:T.text }}>{p.name}</div></div></div></td>
                <td style={{ padding:"12px 14px", fontSize:12, color:T.text2 }}>{p.category}</td>
                <td style={{ padding:"12px 14px" }}><Badge color={condColor[p.condition]} bg={condColor[p.condition]+"18"}>{p.condition}</Badge></td>
                <td style={{ padding:"12px 14px", fontSize:13, fontWeight:700, color:T.primary }}>{fmtQar(p.price)}</td>
                <td style={{ padding:"12px 14px" }}><span style={{ fontSize:13, fontWeight:700, color:p.stock<5?T.danger:T.success }}>{p.stock}</span></td>
                <td style={{ padding:"12px 14px", fontSize:11, color:T.text3, fontFamily:"monospace" }}>{p.sku}</td>
                <td style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn t={T} size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Btn>
                    <Btn t={T} size="sm" variant="danger" onClick={() => del(p.id)}>Del</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myParts.length===0 && <div style={{ padding:40, textAlign:"center", color:T.text3 }}>No parts listed yet</div>}
      </div>
      <Modal open={modal} onClose={() => { setModal(false); setEditPart(null); }} title={editPart?"Edit Part":"Add New Part"} t={T} wide>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
          <Input label="Part Name *" value={form.name} onChange={f("name")} placeholder="e.g. Brembo Brake Pads" t={T} />
          <Input label="SKU" value={form.sku} onChange={f("sku")} placeholder="e.g. BR-FBP-001" t={T} />
          <Select label="Category" value={form.category} onChange={f("category")} options={["Engine Oil","Brakes","AC System","Air Filter","Ignition","Suspension","Filters","Electrical","Tyres","Other"]} t={T} />
          <Select label="Condition" value={form.condition} onChange={f("condition")} options={["OEM","Aftermarket","Used"]} t={T} />
          <Input label="Price (QAR) *" value={form.price} onChange={f("price")} type="number" placeholder="0" t={T} />
          <Input label="Stock Quantity" value={form.stock} onChange={f("stock")} type="number" placeholder="0" t={T} />
          <Select label="Icon" value={form.img} onChange={f("img")} options={["🔧","🛢️","🔴","❄️","💨","⚡","🔩","⚙️","🛞","🔋"].map(i=>({value:i,label:i+" "+i}))} t={T} />
        </div>
        <Input label="Compatible Vehicles (comma separated)" value={form.compatible} onChange={f("compatible")} placeholder="e.g. Toyota Land Cruiser 2020+, Lexus LX" t={T} />
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn t={T} variant="ghost" onClick={() => { setModal(false); setEditPart(null); }}>Cancel</Btn>
          <Btn t={T} onClick={submit}>{editPart?"Save Changes":"Add Part"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function VendorAnalytics({ vendor, myBookings, T }: {vendor: any, myBookings: any[], T: any}) {
  const completed = myBookings.filter(b=>b.status==="completed");
  const revenue = completed.reduce((a,b)=>a+b.price,0);
  const avg = completed.length ? Math.round(revenue/completed.length) : 0;
  const byStatus = ["pending","confirmed","in_progress","completed","cancelled"].map(s => ({ s, count: myBookings.filter(b=>b.status===s).length }));
  const maxCount = Math.max(...byStatus.map(x=>x.count), 1);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <StatCard icon="💰" label="Total Revenue" value={fmtQar(revenue)} sub="Completed only" color={T.success} t={T} />
        <StatCard icon="📊" label="Avg Job Value" value={fmtQar(avg)} sub="Per booking" color={T.accent} t={T} />
        <StatCard icon="✅" label="Completion Rate" value={myBookings.length?Math.round((completed.length/myBookings.length)*100)+"%":"0%"} sub="All bookings" color={T.primary} t={T} />
        <StatCard icon="⭐" label="Customer Rating" value={vendor.rating} sub={vendor.reviews+" reviews"} color={T.warning} t={T} />
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:22, boxShadow:T.shadow, marginBottom:18 }}>
        <h3 style={{ margin:"0 0 18px", fontSize:14, fontWeight:700, color:T.text }}>Booking Status Breakdown</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {byStatus.map(({ s, count }) => {
            const sm = (statusMeta as any)[s]||{};
            return (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:90, fontSize:12, color:T.text2, textAlign:"right" }}>{sm.label||s}</div>
                <div style={{ flex:1, height:24, background:T.surface2, borderRadius:6, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(count/maxCount)*100}%`, background:`linear-gradient(90deg,${sm.color||T.accent},${sm.color||T.accent}99)`, borderRadius:6, transition:"width 0.8s ease", display:"flex", alignItems:"center", paddingLeft:8, minWidth:count>0?32:0 }}>
                    {count>0 && <span style={{ fontSize:11, color:"#fff", fontWeight:700 }}>{count}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:22, boxShadow:T.shadow }}>
        <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:T.text }}>Top Services by Volume</h3>
        {Object.entries(myBookings.reduce((acc: any, b: any) => { acc[b.service]=(acc[b.service]||0)+1; return acc; }, {})).sort((a: any,b: any)=>b[1]-a[1]).slice(0,5).map(([svc, count]: any) => (
          <div key={svc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:13, color:T.text }}>{svc}</span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:80, height:6, background:T.surface2, borderRadius:3 }}>
                <div style={{ height:"100%", width:`${(count/myBookings.length)*100}%`, background:T.accent, borderRadius:3 }} />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:T.text2, width:20, textAlign:"right" }}>{count}</span>
            </div>
          </div>
        ))}
        {myBookings.length===0 && <div style={{ color:T.text3, fontSize:13, padding:"20px 0", textAlign:"center" }}>No booking data yet</div>}
      </div>
    </div>
  );
}

function VendorProfile({ vendor, vendors, setVendors, notify, T }: {vendor: any, vendors: any[], setVendors: any, notify: (msg: string) => void, T: any}) {
  const [form, setForm] = useState({ businessName:vendor.businessName, ownerName:vendor.ownerName, email:vendor.email, phone:vendor.phone, area:vendor.area, workingHours:vendor.workingHours, tradeLicense:vendor.tradeLicense });
  const f = (k: string) => (v: any) => setForm(p=>({...p,[k]:v}));
  const save = () => { setVendors((vs: any) => vs.map((v: any)=>v.id===vendor.id?{...v,...form}:v)); notify("Profile updated"); };
  return (
    <div style={{ maxWidth:600 }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24, boxShadow:T.shadow }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, paddingBottom:18, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ width:56, height:56, borderRadius:14, background:`linear-gradient(135deg,${T.primary}18,${T.accent}18)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30 }}>{vendor.logo}</div>
          <div><div style={{ fontWeight:800, fontSize:17, color:T.text }}>{vendor.businessName}</div><div style={{ marginTop:4 }}><Badge color={vendor.approved?T.success:T.warning} bg={vendor.approved?T.success+"18":T.warning+"18"}>{vendor.approved?"✓ Verified Business":"⏳ Pending Verification"}</Badge></div></div>
        </div>
        <Input label="Business Name" value={form.businessName} onChange={f("businessName")} t={T} />
        <Input label="Owner Name" value={form.ownerName} onChange={f("ownerName")} t={T} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Input label="Email" value={form.email} onChange={f("email")} type="email" t={T} />
          <Input label="Phone" value={form.phone} onChange={f("phone")} t={T} />
        </div>
        <Select label="Area" value={form.area} onChange={f("area")} options={AREAS} t={T} />
        <Input label="Working Hours" value={form.workingHours} onChange={f("workingHours")} placeholder="e.g. 8:00 AM – 9:00 PM" t={T} />
        <Input label="Trade License No." value={form.tradeLicense} onChange={f("tradeLicense")} t={T} />
        <Btn t={T} onClick={save}>Save Profile</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPortal({ ctx }: {ctx: any}) {
  const { T } = ctx;
  const [page, setPage] = useState("dashboard");
  const NAV = [
    { id:"dashboard", icon:"⊞", label:"Dashboard" },
    { id:"vendors", icon:"🏪", label:"Vendor Management" },
    { id:"bookings", icon:"📅", label:"All Bookings" },
    { id:"users", icon:"👥", label:"Users" },
    { id:"parts", icon:"⚙️", label:"Parts Catalog" },
    { id:"analytics", icon:"📊", label:"Platform Analytics" },
  ];
  return (
    <div style={{ display:"flex", minHeight:"calc(100vh - 50px)" }}>
      <div style={{ width:220, background:T.navBg, borderRight:`1px solid ${T.navBorder}`, padding:"20px 0", flexShrink:0, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"0 16px 16px", borderBottom:`1px solid ${T.border}`, marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:T.text3, letterSpacing:1, marginBottom:10 }}>ADMIN PANEL</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#0B3C5D,#00B4D8)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800 }}>🛡️</div>
            <div><div style={{ fontWeight:700, fontSize:12, color:T.text }}>Super Admin</div><div style={{ fontSize:10, color:T.danger, fontWeight:600 }}>Full Access</div></div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"0 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:page===n.id?T.accentLight:"transparent", border:page===n.id?`1px solid ${T.accent}30`:"1px solid transparent", borderRadius:10, padding:"9px 12px", color:page===n.id?T.accent:T.text2, fontWeight:page===n.id?700:500, fontSize:13, cursor:"pointer", marginBottom:2, textAlign:"left", fontFamily:"inherit" }}>
              <span>{n.icon}</span>{n.label}
              {n.id==="vendors" && ctx.vendors.filter((v: any)=>!v.approved).length>0 && <span style={{ marginLeft:"auto", background:T.danger, color:"#fff", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:10 }}>{ctx.vendors.filter((v: any)=>!v.approved).length}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:"18px 26px", borderBottom:`1px solid ${T.border}`, background:T.surface, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:5 }}>
          <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>{NAV.find(n=>n.id===page)?.label}</h1>
          <div style={{ fontSize:12, color:T.text3 }}>QarWheels Admin · Platform v2.0</div>
        </div>
        <div style={{ padding:"22px 26px" }}>
          {page==="dashboard" && <AdminDashboard ctx={ctx} setPage={setPage} />}
          {page==="vendors" && <AdminVendors ctx={ctx} />}
          {page==="bookings" && <AdminBookings ctx={ctx} />}
          {page==="users" && <AdminUsers ctx={ctx} />}
          {page==="parts" && <AdminParts ctx={ctx} />}
          {page==="analytics" && <AdminAnalytics ctx={ctx} />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ ctx, setPage }: {ctx: any, setPage: (page: string) => void}) {
  const { T, vendors, bookings, vehicles, parts } = ctx;
  const pending = vendors.filter((v: any)=>!v.approved).length;
  const totalRev = bookings.filter((b: any)=>b.status==="completed").reduce((a: number,b: any)=>a+b.price,0);
  return (
    <div>
      {pending > 0 && <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
        <span>🔔</span><span style={{ fontSize:13, color:"#991B1B", fontWeight:600 }}>{pending} vendor(s) pending approval — review and approve or reject</span>
        <button onClick={() => setPage("vendors")} style={{ marginLeft:"auto", background:"#EF4444", border:"none", color:"#fff", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Review →</button>
      </div>}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <StatCard icon="🏪" label="Total Vendors" value={vendors.length} sub={vendors.filter((v: any)=>v.approved).length+" approved"} color={T.accent} t={T} />
        <StatCard icon="👥" label="Registered Users" value="3" sub="Active users" color={T.primary} t={T} />
        <StatCard icon="📅" label="Total Bookings" value={bookings.length} sub="Platform-wide" color={T.warning} t={T} />
        <StatCard icon="💰" label="Platform Revenue" value={fmtQar(Math.round(totalRev*0.1))} sub="10% commission" color={T.success} t={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:T.text }}>Vendors Overview</h3>
          {vendors.map((v: any) => (
            <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:18 }}>{v.logo}</span>
                <div><div style={{ fontSize:12, fontWeight:600, color:T.text }}>{v.businessName}</div><div style={{ fontSize:10, color:T.text3 }}>{v.area} · {v.type}</div></div>
              </div>
              <Badge color={v.approved?T.success:T.warning} bg={v.approved?T.success+"18":T.warning+"18"}>{v.approved?"Active":"Pending"}</Badge>
            </div>
          ))}
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:T.text }}>Recent Bookings</h3>
          {bookings.slice(0,5).map((b: any) => {
            const sm = (statusMeta as any)[b.status]||{};
            const v = vendors.find((x: any)=>x.id===b.vendorId);
            return <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <div><div style={{ fontSize:12, fontWeight:600, color:T.text }}>{b.service}</div><div style={{ fontSize:10, color:T.text3 }}>{v?.businessName} · {b.date}</div></div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge>
                <span style={{ fontSize:11, fontWeight:700, color:T.primary }}>{fmtQar(b.price)}</span>
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}

function AdminVendors({ ctx }: {ctx: any}) {
  const { T, vendors, setVendors, notify } = ctx;
  const [filter, setFilter] = useState("All");
  const approve = (id: string) => { setVendors((vs: any) => vs.map((v: any)=>v.id===id?{...v,approved:true}:v)); notify("Vendor approved"); };
  const suspend = (id: string) => { setVendors((vs: any) => vs.map((v: any)=>v.id===id?{...v,approved:false}:v)); notify("Vendor suspended"); };
  const filtered = vendors.filter((v: any) => filter==="All" || (filter==="Pending"&&!v.approved) || (filter==="Approved"&&v.approved) || v.type===filter.toLowerCase());
  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["All","Pending","Approved","garage","parts"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?T.accent:T.surface, border:`1px solid ${filter===f?T.accent:T.border}`, color:filter===f?"#fff":T.text2, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
            {f}{f==="Pending"?` (${vendors.filter((v: any)=>!v.approved).length})`:""}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.map((v: any) => (
          <div key={v.id} style={{ background:T.surface, border:`1.5px solid ${!v.approved?T.warning:T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:50, height:50, borderRadius:12, background:`linear-gradient(135deg,${T.primary}18,${T.accent}18)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{v.logo}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
                  <span style={{ fontWeight:800, fontSize:15, color:T.text }}>{v.businessName}</span>
                  <Badge color={v.approved?T.success:T.warning} bg={v.approved?T.success+"18":T.warning+"18"}>{v.approved?"✓ Approved":"⏳ Pending"}</Badge>
                  <Badge color={T.text2} bg={T.surface2}>{v.type}</Badge>
                </div>
                <div style={{ fontSize:12, color:T.text3, marginBottom:6 }}>👤 {v.ownerName} · 📧 {v.email} · 📍 {v.area}</div>
                <div style={{ fontSize:12, color:T.text3 }}>📋 License: {v.tradeLicense} · Joined: {v.joined} · ⭐ {v.rating}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {!v.approved && <Btn t={T} size="sm" variant="success" onClick={() => approve(v.id)}>✓ Approve</Btn>}
                {v.approved && <Btn t={T} size="sm" variant="danger" onClick={() => suspend(v.id)}>Suspend</Btn>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminBookings({ ctx }: {ctx: any}) {
  const { T, bookings, vendors, setBookings, notify } = ctx;
  const [filter, setFilter] = useState("All");
  const filtered = bookings.filter((b: any) => filter==="All" || b.status===filter.toLowerCase().replace(" ","_"));
  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["All","Pending","Confirmed","In Progress","Completed","Cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?T.accent:T.surface, border:`1px solid ${filter===f?T.accent:T.border}`, color:filter===f?"#fff":T.text2, borderRadius:20, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{f}</button>
        ))}
      </div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:T.surface2 }}>
            {["ID","Service","Vendor","Date","Status","Price","Action"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.text3,letterSpacing:0.5,textTransform:"uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((b: any,i: number) => {
              const sm=(statusMeta as any)[b.status]||{};
              const vnd=vendors.find((v: any)=>v.id===b.vendorId);
              return <tr key={b.id} style={{ borderTop:`1px solid ${T.border}`,background:i%2?"transparent":T.surface2+"40" }}>
                <td style={{ padding:"11px 14px",fontFamily:"monospace",fontSize:11,color:T.text3 }}>{b.id}</td>
                <td style={{ padding:"11px 14px",fontSize:13,fontWeight:600,color:T.text }}>{b.service}</td>
                <td style={{ padding:"11px 14px",fontSize:12,color:T.text2 }}>{vnd?.businessName}</td>
                <td style={{ padding:"11px 14px",fontSize:12,color:T.text2 }}>{b.date}</td>
                <td style={{ padding:"11px 14px" }}><Badge color={sm.color} bg={sm.color+"18"}>{sm.label}</Badge></td>
                <td style={{ padding:"11px 14px",fontSize:13,fontWeight:700,color:T.primary }}>{fmtQar(b.price)}</td>
                <td style={{ padding:"11px 14px" }}>{b.status!=="cancelled"&&b.status!=="completed"&&<Btn t={T} size="sm" variant="danger" onClick={()=>{setBookings((bs: any)=>bs.map((x: any)=>x.id===b.id?{...x,status:"cancelled"}:x));notify("Booking cancelled by admin");}}>Cancel</Btn>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers({ ctx }: {ctx: any}) {
  const { T } = ctx;
  const users = [
    { id:"u1", name:"Ahmed Al-Thani", email:"ahmed@gmail.com", phone:"+974 5544 3322", vehicles:3, bookings:4, joined:"2024-06-10", tier:"Premium" },
    { id:"u2", name:"Sara Al-Mannai", email:"sara@gmail.com", phone:"+974 5566 7788", vehicles:1, bookings:1, joined:"2025-01-20", tier:"Standard" },
    { id:"u3", name:"Mohammed Al-Sulaiti", email:"mo@business.qa", phone:"+974 5511 2233", vehicles:2, bookings:2, joined:"2025-08-14", tier:"Standard" },
  ];
  return (
    <div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:T.surface2 }}>
            {["User","Contact","Vehicles","Bookings","Tier","Joined","Actions"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.text3,letterSpacing:0.5,textTransform:"uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map((u,i) => (
              <tr key={u.id} style={{ borderTop:`1px solid ${T.border}`,background:i%2?"transparent":T.surface2+"40" }}>
                <td style={{ padding:"12px 14px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.accent})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13 }}>{u.name[0]}</div><span style={{ fontSize:13,fontWeight:600,color:T.text }}>{u.name}</span></div></td>
                <td style={{ padding:"12px 14px" }}><div style={{ fontSize:12,color:T.text2 }}>{u.email}</div><div style={{ fontSize:11,color:T.text3 }}>{u.phone}</div></td>
                <td style={{ padding:"12px 14px",fontSize:13,fontWeight:700,color:T.text }}>{u.vehicles}</td>
                <td style={{ padding:"12px 14px",fontSize:13,fontWeight:700,color:T.text }}>{u.bookings}</td>
                <td style={{ padding:"12px 14px" }}><Badge color={u.tier==="Premium"?T.warning:T.accent} bg={u.tier==="Premium"?T.warning+"18":T.accentLight}>{u.tier}</Badge></td>
                <td style={{ padding:"12px 14px",fontSize:12,color:T.text3 }}>{u.joined}</td>
                <td style={{ padding:"12px 14px" }}><Btn t={T} size="sm" variant="ghost" onClick={()=>ctx.notify("Viewing profile for "+u.name)}>View</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminParts({ ctx }: {ctx: any}) {
  const { T, parts, vendors } = ctx;
  return (
    <div>
      <div style={{ fontSize:13, color:T.text3, marginBottom:14 }}>{parts.length} parts across {vendors.filter((v: any)=>v.type==="parts").length} suppliers</div>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", boxShadow:T.shadow }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:T.surface2 }}>
            {["Part","Category","Supplier","Price","Stock","Condition"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.text3,letterSpacing:0.5,textTransform:"uppercase" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {parts.map((p: any,i: number) => {
              const vnd = vendors.find((v: any)=>v.id===p.vendorId);
              const condColor: any = { OEM:T.accent, Aftermarket:T.warning, Used:T.text3 };
              return <tr key={p.id} style={{ borderTop:`1px solid ${T.border}`,background:i%2?"transparent":T.surface2+"40" }}>
                <td style={{ padding:"11px 14px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><span>{p.img}</span><span style={{ fontSize:13,fontWeight:600,color:T.text }}>{p.name}</span></div></td>
                <td style={{ padding:"11px 14px",fontSize:12,color:T.text2 }}>{p.category}</td>
                <td style={{ padding:"11px 14px",fontSize:12,color:T.text2 }}>{vnd?.businessName}</td>
                <td style={{ padding:"11px 14px",fontSize:13,fontWeight:700,color:T.primary }}>{fmtQar(p.price)}</td>
                <td style={{ padding:"11px 14px" }}><span style={{ fontSize:13,fontWeight:700,color:p.stock<5?T.danger:T.success }}>{p.stock}</span></td>
                <td style={{ padding:"11px 14px" }}><Badge color={condColor[p.condition]} bg={condColor[p.condition]+"18"}>{p.condition}</Badge></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAnalytics({ ctx }: {ctx: any}) {
  const { T, bookings, vendors, vehicles, parts } = ctx;
  const totalRev = bookings.filter((b: any)=>b.status==="completed").reduce((a: number,b: any)=>a+b.price,0);
  const commRev = Math.round(totalRev * 0.1);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <StatCard icon="💰" label="Gross Revenue" value={fmtQar(totalRev)} sub="Completed jobs" color={T.success} t={T} />
        <StatCard icon="📊" label="Commission (10%)" value={fmtQar(commRev)} sub="Platform earnings" color={T.accent} t={T} />
        <StatCard icon="🏪" label="Active Vendors" value={vendors.filter((v: any)=>v.approved).length} sub={"of "+vendors.length+" total"} color={T.primary} t={T} />
        <StatCard icon="🚘" label="Vehicles on Platform" value={vehicles.length} sub="Registered" color={T.warning} t={T} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:T.text }}>Bookings by Vendor</h3>
          {vendors.filter((v: any)=>v.approved).map((v: any) => {
            const cnt = bookings.filter((b: any)=>b.vendorId===v.id).length;
            const maxB = Math.max(...vendors.map((x: any)=>bookings.filter((b: any)=>b.vendorId===x.id).length),1);
            return <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <span style={{ fontSize:18 }}>{v.logo}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{v.businessName}</span>
                  <span style={{ fontSize:11, color:T.text3 }}>{cnt} bookings</span>
                </div>
                <div style={{ height:6, background:T.surface2, borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${(cnt/maxB)*100}%`, background:`linear-gradient(90deg,${T.primary},${T.accent})`, borderRadius:3, transition:"width 0.8s ease" }} />
                </div>
              </div>
            </div>;
          })}
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadow }}>
          <h3 style={{ margin:"0 0 16px", fontSize:14, fontWeight:700, color:T.text }}>Platform Summary</h3>
          {[
            ["Total Parts Listed", parts.length],
            ["Low Stock Parts", parts.filter((p: any)=>p.stock<5).length],
            ["Pending Vendor Approvals", vendors.filter((v: any)=>!v.approved).length],
            ["Bookings This Month", bookings.filter((b: any)=>b.createdAt?.startsWith("2026-03")).length],
            ["Cancelled Bookings", bookings.filter((b: any)=>b.status==="cancelled").length],
            ["Completion Rate", bookings.length ? Math.round((bookings.filter((b: any)=>b.status==="completed").length/bookings.length)*100)+"%" : "0%"],
          ].map(([k,v]: any) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12, color:T.text2 }}>{k}</span>
              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
