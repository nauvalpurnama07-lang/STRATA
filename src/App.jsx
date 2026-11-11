import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { registerMember } from "./data/board";
import {
  ensureDatabaseSeeded,
  subscribeToAccounts,
  subscribeToGoogleAuthProfile,
  saveNewAccountToFirestore,
  signOutFirebase,
} from "./firebase";

// Terhubung ke Cloud Firestore pada proyek Firebase "strata-pat" (Strata).
export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("strata-user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (
        String(parsed?.email || "")
          .trim()
          .toLowerCase()
          .endsWith("@peluncuran.id")
      ) {
        sessionStorage.removeItem("strata-user");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let unsub = null;
    const unsubGoogle = subscribeToGoogleAuthProfile((fbProfile) => {
      if (!fbProfile?.email || !fbProfile?.photoURL) return;
      setUser((prev) => {
        if (!prev || String(prev.email || "").toLowerCase() !== fbProfile.email.toLowerCase()) {
          return prev;
        }
        if (prev.photoURL === fbProfile.photoURL) return prev;
        const updated = { ...prev, photoURL: fbProfile.photoURL };
        try {
          sessionStorage.setItem("strata-user", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    });

    ensureDatabaseSeeded().then(() => {
      unsub = subscribeToAccounts((remoteAccounts) => {
        setAccounts(Array.isArray(remoteAccounts) ? remoteAccounts : []);
      });
    });
    return () => {
      if (unsub) unsub();
      if (unsubGoogle) unsubGoogle();
    };
  }, []);

  const [hasVisitedIndex, setHasVisitedIndex] = useState(() => {
    try {
      return (
        sessionStorage.getItem("strata-visited-index") === "1" ||
        Boolean(sessionStorage.getItem("strata-user"))
      );
    } catch {
      return false;
    }
  });

  function markIndexVisited() {
    setHasVisitedIndex(true);
    try {
      sessionStorage.setItem("strata-visited-index", "1");
    } catch {}
  }

  function handleLogin(matchedUser) {
    markIndexVisited();
    setUser(matchedUser);
    try {
      sessionStorage.setItem("strata-user", JSON.stringify(matchedUser));
    } catch {}
  }

  function handleSignup(newAccount) {
    markIndexVisited();
    setAccounts((prev) => [...prev, newAccount]);
    const loggedInUser = {
      name: newAccount.name,
      email: newAccount.email,
      initials: newAccount.initials,
      provider: "email",
      role: newAccount.role || "admin",
      memberKey: newAccount.memberKey,
      uid: newAccount.uid || null,
    };
    setUser(loggedInUser);
    try {
      sessionStorage.setItem("strata-user", JSON.stringify(loggedInUser));
    } catch {}
  }

  function handleGoogleAuth(googleUser) {
    markIndexVisited();
    setUser(googleUser);
    try {
      sessionStorage.setItem("strata-user", JSON.stringify(googleUser));
    } catch {}
  }

  function handleLogout() {
    markIndexVisited();
    signOutFirebase();
    setUser(null);
    try {
      sessionStorage.removeItem("strata-user");
    } catch {}
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<LandingPage user={user} onVisitIndex={markIndexVisited} />}
        />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : !hasVisitedIndex ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                accounts={accounts}
                onLogin={handleLogin}
                onSignup={handleSignup}
                onGoogleAuth={handleGoogleAuth}
              />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardPage user={user} onLogout={handleLogout} />
            ) : hasVisitedIndex ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
