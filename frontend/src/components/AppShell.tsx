import { clearToken } from "../lib/api";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  showLogout?: boolean;
};

export default function AppShell({
  title,
  subtitle,
  right,
  children,
  showLogout = false,
}: Props) {
  const nav = useNavigate();

  function logout() {
    clearToken();
    nav("/login");
  }

  return (
    <div style={{ padding: "26px 0 50px" }}>
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <div className="kicker">TaskFlow • Admin Console</div>
            <div style={{ height: 10 }} />
            <h1 className="h1">{title}</h1>
            {subtitle && (
              <>
                <div style={{ height: 6 }} />
                <p className="h2">{subtitle}</p>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {right}
            {showLogout && (
              <button className="btn danger" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}