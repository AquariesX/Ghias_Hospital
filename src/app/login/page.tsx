"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  Activity,
  UserCheck,
  Building2,
  Check,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface QuickRole {
  id: string;
  role: string;
  title: string;
  identifier: string;
  password: string;
  icon: typeof ShieldCheck;
  colorClasses: string;
}

const QUICK_ROLES: QuickRole[] = [
  {
    id: "admin",
    role: "Admin",
    title: "Administrator",
    identifier: "admin",
    password: "Admin@1234",
    icon: ShieldCheck,
    colorClasses: "text-purple-700 bg-purple-50/90 border-purple-200",
  },
  {
    id: "doctor",
    role: "Doctor",
    title: "Consultant",
    identifier: "doctor_user",
    password: "Doctor@1234",
    icon: Stethoscope,
    colorClasses: "text-blue-700 bg-blue-50/90 border-blue-200",
  },
  {
    id: "nurse",
    role: "Nurse",
    title: "Clinical Care",
    identifier: "nurse_user",
    password: "Nurse@1234",
    icon: Activity,
    colorClasses: "text-emerald-700 bg-emerald-50/90 border-emerald-200",
  },
  {
    id: "staff",
    role: "Staff",
    title: "Front Desk",
    identifier: "staff_user",
    password: "Staff@1234",
    icon: UserCheck,
    colorClasses: "text-slate-700 bg-slate-100 border-slate-200",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleQuickRoleSelect = (role: QuickRole) => {
    setIdentifier(role.identifier);
    setPassword(role.password);
    setSelectedRole(role.id);
    setErrorMessage(null);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (selectedRole) setSelectedRole(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (selectedRole) setSelectedRole(null);
  };

  const checkCapsLock = (e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMessage("Please enter your email or username.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Success: redirect to assigned dashboard route
      const destination = data.redirectUrl || "/admin";
      router.push(destination);
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect to hospital authentication service. Please check your network.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between sm:justify-center items-center py-4 px-3 sm:px-6 lg:px-8 bg-slate-50 relative overflow-x-hidden selection:bg-teal-100 selection:text-teal-900">
      {/* Subtle non-flashy architectural geometric grid */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-45"
        aria-hidden="true"
      />

      {/* Very gentle ambient background highlights (non-flashy, calm slate/teal tint) */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 bg-slate-300/25 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-800/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Login Card Container */}
      <main className="w-full max-w-[420px] sm:max-w-[450px] bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 overflow-hidden relative z-10 transition-all my-auto">
        {/* Subtle Top Clinical Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-800 via-teal-600 to-slate-800" />

        {/* Header & Hospital Branding */}
        <header className="bg-slate-900 text-white pt-6 pb-5 px-5 text-center relative border-b border-slate-800">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 shadow-inner mb-2.5">
            <GhiasHospitalLogo size={50} className="shrink-0" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase font-sans">
            GHIAS HOSPITAL
          </h1>

          <p className="text-[11px] sm:text-xs tracking-wider text-teal-300 font-semibold uppercase mt-0.5">
            Hospital Management System
          </p>

          <p className="text-[11px] text-slate-400 mt-0.5 font-normal">
            Phalia, Mandi Bahauddin &bull; Clinical & Administrative Portal
          </p>
        </header>

        {/* Security & System Status Strip */}
        <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 sm:px-5 py-2 flex items-center justify-between text-[11px] sm:text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-700">System Online</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6">
          {errorMessage && (
            <div
              className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2 leading-relaxed"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            {/* Email / Username Field */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1"
              >
                Staff Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder="admin or doctor_user"
                  disabled={isLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-slate-900 text-base sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
                {capsLockOn && (
                  <span className="text-[10px] sm:text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Caps Lock On
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  onKeyDown={checkCapsLock}
                  onKeyUp={checkCapsLock}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-slate-900 text-base sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none focus:text-teal-700 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] sm:min-h-[44px] flex justify-center items-center py-2.5 px-4 rounded-lg text-sm sm:text-base font-semibold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-700 shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  "Sign In to Hospital Portal"
                )}
              </button>
            </div>
          </form>

          {/* Quick Role Select for Mobile & Testing */}
          <section className="mt-5 pt-4 border-t border-slate-200/90" aria-label="Quick login accounts">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-teal-700" />
                <span>Quick Role Autofill</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Tap to populate
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {QUICK_ROLES.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedRole === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleQuickRoleSelect(item)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer min-h-[44px] ${
                      isSelected
                        ? "border-teal-700 bg-teal-50/80 ring-1 ring-teal-700 shadow-xs"
                        : "border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200/80"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${item.colorClasses}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {item.role}
                        </p>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {item.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer & Support Information */}
        <footer className="bg-slate-50 px-4 py-3 border-t border-slate-200/80 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
            <span>GHIAS Hospital &bull; Mandi Bahauddin Road, Phalia</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
            <HelpCircle className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span>Need credentials? Contact Hospital IT Administration</span>
          </div>
        </footer>
      </main>

      {/* Institutional Legal / HIPAA Notice */}
      <aside className="mt-2.5 text-center max-w-sm px-4 pb-2">
        <p className="text-[10.5px] sm:text-[11px] text-slate-500 leading-normal">
          Authorized personnel access only. Sessions are encrypted and logged for patient data security.
        </p>
      </aside>
    </div>
  );
}
