import { useState } from "react";
import { useNavigate } from "react-router-dom";
import placeholder from "../placeholder.png";

const AUTH_URL = "https://learn.reboot01.com/api/auth/signin";
const GRAPHQL_URL = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

const ROLE_QUERY = `
query Event_user1 {
  event_user {
    userLogin
    user {
      email
      id
      login
      role
    }
  }
}
`;

function normalizeToken(raw: string) {
  return raw.trim().replace(/^"|"$/g, "");
}

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState(""); // you might type login OR email here
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter username/email and password");
      setLoading(false);
      return;
    }

    try {
      const encoded = btoa(`${email}:${password}`);

      // 1) LOGIN → get JWT
      const loginRes = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
        },
      });

      if (!loginRes.ok) {
        setError("Invalid login");
        return;
      }

      const rawToken = await loginRes.text();
      const token = normalizeToken(rawToken);

      localStorage.setItem("jwt", token);

      // 2) CALL GRAPHQL → get users list (event_user)
      const gqlRes = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: ROLE_QUERY }),
      });

      if (!gqlRes.ok) {
        setError("Failed to fetch user role");
        return;
      }

      const gqlData = await gqlRes.json();
      const rows: any[] = gqlData?.data?.event_user ?? [];

      const input = norm(email);

      // 3) FIND THE MATCHING USER (IMPORTANT FIX ✅)
      const match = rows.find((r) => {
        const user = r?.user || {};
        return (
          norm(user.email) === input ||
          norm(user.login) === input ||
          norm(r?.userLogin) === input
        );
      });

      const role = norm(match?.user?.role || "");

      if (!role) {
        setError("Logged in, but could not find your role in GraphQL results.");
        return;
      }

      // 4) SAVE ROLE (this will now be YOUR role ✅)
      localStorage.setItem("role", role);

      // redirect
      if (role === "admin") nav("/admin");
      else nav("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-5 bg-white">
      <div className="w-full max-w-[980px] h-auto lg:h-[560px] grid grid-cols-1 lg:grid-cols-2 rounded-[28px] overflow-hidden bg-white shadow-[0_40px_100px_rgba(0,0,0,0.25)]">
        <div
          className="relative h-[220px] lg:h-auto bg-center bg-cover"
          style={{ backgroundImage: `url(${placeholder})` }}
        >
          <div className="absolute bottom-10 left-10 text-white">
            <h2 className="text-[28px] leading-tight mb-2">Organize your workflow</h2>
            <p className="text-sm opacity-90">One board at a time.</p>
          </div>
        </div>

        <div className="grid place-items-center p-10">
          <div className="w-full max-w-[340px]">
            <h1 className="text-[28px] mb-1.5 text-[#222]">Sign In</h1>
            <p className="text-sm text-[#666] mb-6">Access your workspace</p>

            <form onSubmit={onLogin} className="space-y-4">
              <input
                type="text"
                placeholder="Username or Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[46px] px-3.5 rounded-xl border border-[#e5e5e5] text-sm outline-none transition focus:border-[#dc586d] focus:ring-4 focus:ring-[rgba(220,88,109,0.15)]"
              />

              {error && <div className="text-[13px] text-[#dc586d]">{error}</div>}

              <button
                className="w-full h-[46px] rounded-xl mt-2.5 text-white font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(76,29,61,0.3)]"
                style={{ background: "linear-gradient(135deg, #4c1d3d, #a33757)" }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-7.5 text-xs text-center text-[#999]">© {new Date().getFullYear()} Your App</div>
          </div>
        </div>
      </div>
    </div>
  );
}