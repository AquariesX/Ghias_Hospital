"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setErrorMessage("Please enter your email or username");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password");
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
      setErrorMessage("Network error: Unable to connect to the hospital authentication server.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        {/* Hospital Header & Branding */}
        <div className="bg-slate-900 px-6 py-8 text-center text-white border-b-4 border-teal-600">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-800/60 mb-3 border border-teal-500/30">
            {/* Medical Cross SVG Icon */}
            <svg
              className="w-7 h-7 text-teal-300"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M19 10.5h-5.5V5a1.5 1.5 0 00-3 0v5.5H5a1.5 1.5 0 000 3h5.5V19a1.5 1.5 0 003 0v-5.5H19a1.5 1.5 0 000-3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            GIAS Hospital
          </h1>
          <p className="text-xs uppercase tracking-widest text-teal-300 font-semibold mt-1">
            Hospital Management System
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Phase 1: Foundation & Authentication
          </p>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8">
          {errorMessage && (
            <div
              className="mb-5 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5"
              role="alert"
            >
              <svg
                className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email / Username Field */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email or Username
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. admin@gias-hospital.com or admin"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-500 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          {/* Test Accounts Reference Callout for development */}
          <div className="mt-8 pt-5 border-t border-slate-200">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Development Test Accounts
            </h2>
            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded border border-slate-200 font-mono">
              <div><strong className="text-slate-800 font-sans">Admin:</strong> admin@gias-hospital.com / Admin@1234</div>
              <div><strong className="text-slate-800 font-sans">Doctor:</strong> doctor@gias-hospital.com / Doctor@1234</div>
              <div><strong className="text-slate-800 font-sans">Nurse:</strong> nurse@gias-hospital.com / Nurse@1234</div>
              <div><strong className="text-slate-800 font-sans">Staff:</strong> staff@gias-hospital.com / Staff@1234</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            GIAS Hospital Management System &copy; 2026. Secure Access Portal.
          </p>
        </div>
      </div>
    </div>
  );
}
