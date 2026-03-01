import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../lib/api";

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
      else nav("/login"); // next: supervisor/student dashboards
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
      <div className="container" style={{ width: "min(980px, calc(100% - 32px))" }}>
        <div className="grid2">
          {/* Left brand */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="kicker">TaskFlow</div>

            <div style={{ height: 14 }} />
            <h1 className="h1">Welcome back</h1>
            <div style={{ height: 10 }} />
            <p className="h2">
              A modern workspace for supervisors and students.
              Organize boards, tasks, and progress in one place.
            </p>

            <div style={{ height: 18 }} />

            <div style={{ display: "grid", gap: 10 }}>
              <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Secure access</div>
                <div style={{ marginTop: 6, fontSize: 14, color: "var(--text)" }}>
                  Role-based permissions for Admin, Supervisors, and Students.
                </div>
              </div>

              <div className="glass" style={{ padding: 14, borderRadius: 16 }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Structured workflow</div>
                <div style={{ marginTop: 6, fontSize: 14, color: "var(--text)" }}>
                  Boards • Lists • Cards • Due Dates • Subtasks
                </div>
              </div>
            </div>
          </div>

          {/* Right form */}
          <div className="glass" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Sign in</div>
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
                  Enter your credentials to continue
                </div>
              </div>
              <span className="badge">Login</span>
            </div>

            <div style={{ height: 16 }} />

            <form onSubmit={onLogin} style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Email</div>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Password</div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && <div className="noteBad" style={{ fontSize: 13 }}>{error}</div>}

              <button className="btn primary" disabled={loading} style={{ width: "100%" }}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div style={{ height: 12 }} />

            <div style={{ color: "var(--muted2)", fontSize: 12, textAlign: "center" }}>
              © {new Date().getFullYear()} TaskFlow
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}