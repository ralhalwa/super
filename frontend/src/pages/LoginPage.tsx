import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";
import placeholder from "../placeholder.png"; // adjust path if needed

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      localStorage.setItem("role", data.role);

      if (data.role === "admin") nav("/admin");
      else nav("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-5 bg-white">
      <div className="w-full max-w-[980px] h-auto lg:h-[560px] grid grid-cols-1 lg:grid-cols-2 rounded-[28px] overflow-hidden bg-white shadow-[0_40px_100px_rgba(0,0,0,0.25)]">
        {/* LEFT IMAGE */}
        <div
          className="relative h-[220px] lg:h-auto bg-center bg-cover"
          style={{ backgroundImage: `url(${placeholder})` }}
        >
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-[28px] leading-tight mb-2">
              Organize your workflow
            </h2>
            <p className="text-sm opacity-90">One board at a time.</p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="grid place-items-center p-10">
          <div className="w-full max-w-[340px]">
            <h1 className="text-[28px] mb-1.5 text-[#222]">Sign In</h1>
            <p className="text-sm text-[#666] mb-6">Access your workspace</p>

            <form onSubmit={onLogin} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
                />
              </div>

              {error && (
                <div className="text-[13px] text-[#dc586d]">{error}</div>
              )}

              <button
                className="w-full h-[46px] rounded-xl mt-2.5 text-white font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(76,29,61,0.3)]"
                style={{
                  background: "linear-gradient(135deg, #4c1d3d, #a33757)",
                }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-7.5 text-xs text-center text-[#999]">
              © {new Date().getFullYear()} Your App
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}