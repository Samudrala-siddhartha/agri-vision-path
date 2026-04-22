import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, accountStatus, loading, signOut } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;
  if (accountStatus === "suspended" || accountStatus === "banned") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soil px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-soft">
          <h1 className="font-display text-2xl font-bold">Account {accountStatus}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account access is currently restricted. Please contact support if you believe this is a mistake.</p>
          <button onClick={signOut} className="mt-5 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">Sign out</button>
        </div>
      </div>
    );
  }
  return children;
}
