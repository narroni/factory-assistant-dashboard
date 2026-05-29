"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../../auth/actions";
import { getCurrentUser } from "../../lib/auth-helpers";
import { useToast } from "../../components/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  // Redirect to home if already logged in
  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          router.push("/");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      showToast("Please enter email and password", "error");
      return;
    }

    try {
      setIsLoading(true);
      const result = await loginUser(email, password);

      if (result.error) {
        showToast(result.error, "error");
      } else if (result.success) {
        showToast("Login successful!", "success");
        router.push("/");
      }
    } catch (error) {
      showToast("Login failed", "error");
    } finally {
      setIsLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4 py-8">
      {/* Subtle background grid */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(113,113,122,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="w-full max-w-[420px]">
        {/* Login Card */}
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            {/* Logo Badge */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl blur-lg opacity-50" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  ⚙️
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Factory Assistant</h1>
              <p className="text-sm text-zinc-400">Manufacturing Dashboard</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="admin@narko.local"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-600 disabled:to-zinc-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/50 disabled:shadow-none disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4 mb-2">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">Admin:</span> admin@narko.local / password123
              </div>
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">Worker:</span> worker@narko.local / password123
              </div>
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-300 font-medium">Viewer:</span> viewer@narko.local / password123
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <p className="text-xs text-zinc-500 text-center mt-4">
            Secure login for authorized personnel only
          </p>
        </div>

        {/* Bottom Info */}
        <p className="text-xs text-zinc-600 text-center mt-6">
          Factory Assistant v1.0 • All rights reserved
        </p>
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col gap-2" />
      </div>
    </div>
  );
}
