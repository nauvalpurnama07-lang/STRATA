import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Icon, Logo } from "../components/icons";
import Toast from "../components/Toast";
import { signInWithGooglePopup, signInWithEmailPassword, signUpWithEmailPassword } from "../firebase";

export default function LoginPage({ accounts, onLogin, onSignup, onGoogleAuth }) {
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({});
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginErr, setLoginErr] = useState({});
  const [loginFormError, setLoginFormError] = useState("");

  const [signup, setSignup] = useState({ name: "", email: "", password: "" });
  const [signupErr, setSignupErr] = useState({});
  const [signupFormError, setSignupFormError] = useState("");

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function submitLogin(e) {
    e.preventDefault();
    const err = {};
    if (!isValidEmail(login.email)) err.email = true;
    if (login.password.length < 8) err.password = true;
    setLoginErr(err);
    setLoginFormError("");
    if (Object.keys(err).length) return;

    setLoading(true);
    try {
      const user = await signInWithEmailPassword(login.email, login.password, accounts);
      setLoading(false);
      onLogin(user);
    } catch (authErr) {
      setLoading(false);
      const code = authErr?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setLoginFormError("Email atau kata sandi tidak cocok. Silakan periksa kembali.");
      } else if (code === "auth/too-many-requests") {
        setLoginFormError("Terlalu banyak percobaan gagal. Silakan coba lagi beberapa saat lagi.");
      } else {
        setLoginFormError(authErr?.message || "Gagal masuk. Periksa koneksi internet Anda.");
      }
    }
  }

  async function submitSignup(e) {
    e.preventDefault();
    const err = {};
    if (!signup.name.trim()) err.name = true;
    if (!isValidEmail(signup.email)) err.email = true;
    if (signup.password.length < 8) err.password = true;
    setSignupErr(err);
    setSignupFormError("");
    if (Object.keys(err).length) return;

    setLoading(true);
    try {
      const newAccount = await signUpWithEmailPassword(signup.name, signup.email, signup.password);
      setLoading(false);
      onSignup(newAccount);
    } catch (authErr) {
      setLoading(false);
      const code = authErr?.code || "";
      if (code === "auth/email-already-in-use") {
        setSignupFormError("Email ini sudah terdaftar. Coba masuk sebagai gantinya.");
      } else if (code === "auth/weak-password") {
        setSignupFormError("Kata sandi terlalu lemah. Gunakan minimal 8 karakter.");
      } else {
        setSignupFormError(authErr?.message || "Gagal mendaftar. Silakan coba lagi.");
      }
    }
  }

  async function googleFlow() {
    setLoginFormError("");
    setSignupFormError("");
    setLoading(true);
    try {
      const googleUser = await signInWithGooglePopup(accounts);
      setLoading(false);
      onGoogleAuth(googleUser);
    } catch (err) {
      setLoading(false);
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        showToast("Login Google dibatalkan.");
      } else if (code === "auth/popup-blocked") {
        showToast("Popup Google diblokir oleh browser. Izinkan popup untuk situs ini.");
      } else if (code === "auth/unauthorized-domain") {
        showToast("Domain ini belum diotorisasi di Firebase Console (Authorized Domains).");
      } else if (code === "auth/operation-not-allowed") {
        showToast("Metode login Google sedang diaktifkan di Firebase Console.");
      } else {
        showToast("Gagal masuk dengan Google: " + (err?.message || "Coba lagi."));
      }
    }
  }

  const inputBase = "w-full px-4 py-3 rounded-2xl border text-sm bg-zinc-900/80 text-zinc-50 placeholder-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:outline-none focus:ring-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]";
  const inputOk = "border-zinc-800/70 hover:border-zinc-700 focus:ring-emerald-500/20 focus:border-emerald-500/70";
  const inputBad = "border-rose-500/80 bg-rose-950/30 focus:ring-rose-500/25";

  return (
    <div className="min-h-dvh grid grid-cols-1 md:grid-cols-2 bg-zinc-950 text-zinc-50 relative overflow-hidden">
      <div className="strata-grain" aria-hidden="true" />
      <div className="strata-ambient-glow" aria-hidden="true" />
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-14 relative z-10">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <Link to="/" className="relative flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight mb-12 w-max group">
          <Logo /> <span>STRATA</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="font-display text-3xl sm:text-[2.15rem] font-extrabold tracking-tight text-balance text-zinc-50 leading-[1.12]">
            {tab === "login" ? "Masuk ke ruang kerja kamu" : "Buat ruang kerja baru"}
          </h1>
          <p className="mt-2.5 text-zinc-400 text-[14px] leading-relaxed max-w-sm">
            {tab === "login"
              ? "Kelola papan, tugas, dan tim kamu dari satu tempat."
              : "Gratis untuk individu & tim. Tidak perlu kartu kredit."}
          </p>

          <div className="inline-flex mt-7 bg-zinc-900/80 border border-zinc-800/60 p-1 rounded-full gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <button
              onClick={() => { setTab("login"); setLoginFormError(""); }}
              className={"px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " + (tab === "login" ? "bg-zinc-800 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]" : "text-zinc-500 hover:text-zinc-300")}
            >
              Masuk
            </button>
            <button
              onClick={() => { setTab("signup"); setSignupFormError(""); }}
              className={"px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] " + (tab === "signup" ? "bg-zinc-800 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]" : "text-zinc-500 hover:text-zinc-300")}
            >
              Daftar
            </button>
          </div>

          {tab === "login" ? (
            <form className="mt-6 max-w-md" onSubmit={submitLogin} noValidate>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold mb-1.5 text-zinc-200">Alamat email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Icon.Mail /></span>
                  <input
                    type="email"
                    value={login.email}
                    onChange={(e) => setLogin({ ...login, email: e.target.value })}
                    placeholder="kamu@perusahaan.com"
                    className={inputBase + " pl-10 " + (loginErr.email ? inputBad : inputOk)}
                  />
                </div>
                {loginErr.email && <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"><Icon.Warn />Masukkan alamat email yang valid.</p>}
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold mb-1.5 text-zinc-200">Kata sandi</label>
                <div className="relative">
                  <input
                    type={showPw.login ? "text" : "password"}
                    value={login.password}
                    onChange={(e) => setLogin({ ...login, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    className={inputBase + " pr-10 " + (loginErr.password ? inputBad : inputOk)}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, login: !showPw.login })} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-zinc-500 hover:text-zinc-50 hover:bg-zinc-800 transition-all duration-200">
                    <Icon.Eye />
                  </button>
                </div>
                {loginErr.password && <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"><Icon.Warn />Kata sandi minimal 8 karakter.</p>}
              </div>
              {loginFormError && (
                <p className="mb-4 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3.5 py-2.5"><Icon.Warn />{loginFormError}</p>
              )}
              <div className="flex items-center justify-between mb-5 text-[13px]">
                <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded accent-emerald-500" /> Ingat saya
                </label>
                <button type="button" className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline active:scale-95 transition-all duration-200" onClick={() => showToast("Silakan masuk menggunakan akun Google atau hubungi admin ruang kerja.")}>
                  Lupa kata sandi?
                </button>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-emerald-400 text-zinc-950 text-sm font-bold hover:bg-emerald-300 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-70">
                {loading ? "Memeriksa..." : "Masuk"}
              </button>
              <div className="flex items-center gap-3 my-5 text-xs text-zinc-600">
                <span className="flex-1 h-px bg-zinc-800/70" />atau lanjutkan dengan<span className="flex-1 h-px bg-zinc-800/70" />
              </div>
              <button type="button" onClick={googleFlow} disabled={loading} className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/80 text-zinc-50 text-sm font-semibold hover:bg-zinc-800/90 hover:border-zinc-700 hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <Icon.Google /> {loading ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
              </button>
              <p className="mt-6 text-sm text-zinc-400">
                Belum punya akun?{" "}
                <button type="button" className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors" onClick={() => { setTab("signup"); setSignupFormError(""); }}>Daftar sekarang</button>
              </p>
            </form>
          ) : (
            <form className="mt-6 max-w-md" onSubmit={submitSignup} noValidate>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold mb-1.5 text-zinc-200">Nama lengkap</label>
                <input
                  type="text"
                  value={signup.name}
                  onChange={(e) => setSignup({ ...signup, name: e.target.value })}
                  placeholder="Nama kamu"
                  className={inputBase + " " + (signupErr.name ? inputBad : inputOk)}
                />
                {signupErr.name && <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"><Icon.Warn />Nama tidak boleh kosong.</p>}
              </div>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold mb-1.5 text-zinc-200">Alamat email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"><Icon.Mail /></span>
                  <input
                    type="email"
                    value={signup.email}
                    onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                    placeholder="kamu@perusahaan.com"
                    className={inputBase + " pl-10 " + (signupErr.email ? inputBad : inputOk)}
                  />
                </div>
                {signupErr.email && <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"><Icon.Warn />Masukkan alamat email yang valid.</p>}
              </div>
              <div className="mb-5">
                <label className="block text-[13px] font-semibold mb-1.5 text-zinc-200">Kata sandi</label>
                <div className="relative">
                  <input
                    type={showPw.signup ? "text" : "password"}
                    value={signup.password}
                    onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    className={inputBase + " pr-10 " + (signupErr.password ? inputBad : inputOk)}
                  />
                  <button type="button" onClick={() => setShowPw({ ...showPw, signup: !showPw.signup })} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-zinc-500 hover:text-zinc-50 hover:bg-zinc-800 transition-all duration-200">
                    <Icon.Eye />
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Gunakan kombinasi huruf dan angka.</p>
                {signupErr.password && <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1"><Icon.Warn />Kata sandi minimal 8 karakter.</p>}
              </div>
              {signupFormError && (
                <p className="mb-4 text-xs text-rose-400 flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3.5 py-2.5"><Icon.Warn />{signupFormError}</p>
              )}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-emerald-400 text-zinc-950 text-sm font-bold hover:bg-emerald-300 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-70">
                {loading ? "Memeriksa..." : "Buat akun"}
              </button>
              <div className="flex items-center gap-3 my-5 text-xs text-zinc-600">
                <span className="flex-1 h-px bg-zinc-800/70" />atau lanjutkan dengan<span className="flex-1 h-px bg-zinc-800/70" />
              </div>
              <button type="button" onClick={googleFlow} disabled={loading} className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/80 text-zinc-50 text-sm font-semibold hover:bg-zinc-800/90 hover:border-zinc-700 hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.98] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                <Icon.Google /> {loading ? "Menghubungkan ke Google..." : "Daftar dengan Google"}
              </button>
              <p className="mt-6 text-sm text-zinc-400">
                Sudah punya akun?{" "}
                <button type="button" className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors" onClick={() => { setTab("login"); setLoginFormError(""); }}>Masuk di sini</button>
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="hidden md:flex relative flex-col justify-center px-16 overflow-hidden bg-zinc-900/30 border-l border-zinc-800/50">
        <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        {/* Doppelrand Double-Bezel Board Preview */}
        <div className="relative bg-zinc-900/50 border border-zinc-800/60 rounded-[32px] p-2.5 -rotate-1 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="bg-zinc-900/95 border border-zinc-800/80 rounded-3xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/60 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-zinc-300 tracking-tight">Peluncuran Produk — Q4</span>
              </div>
              <Icon.Dots className="text-zinc-600" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-2">
                <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-transform duration-300">
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-950/80 text-rose-400 border border-rose-900/40 mb-1.5">Mendesak</span>
                  <div className="text-[11px] font-semibold text-zinc-100 leading-snug">Bangun API pembayaran</div>
                </div>
                <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-transform duration-300">
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950/80 text-amber-400 border border-amber-900/40 mb-1.5">Tinggi</span>
                  <div className="text-[11px] font-semibold text-zinc-100 leading-snug">Migrasi skema database</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-transform duration-300">
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 mb-1.5">Sedang</span>
                  <div className="text-[11px] font-semibold text-zinc-100 leading-snug">Uji alur checkout</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-zinc-800/70 border border-zinc-700/50 rounded-xl p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-transform duration-300">
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60 mb-1.5">Rendah</span>
                  <div className="text-[11px] font-semibold text-zinc-100 leading-snug">Halaman login</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-9 max-w-sm">
          <p className="font-display text-lg font-medium text-zinc-100 leading-relaxed tracking-tight">
            "Sejak pindah ke STRATA, tim kami akhirnya tahu siapa mengerjakan apa — tanpa harus menanyakan di grup chat."
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
            <span className="w-8.5 h-8.5 rounded-xl bg-emerald-400 text-zinc-950 flex items-center justify-center text-xs font-extrabold shadow-lg shadow-emerald-500/20">RN</span>
            <span className="font-medium text-zinc-300">Ricky Nugraha <span className="text-zinc-500 font-normal">— Product Lead, Peluncuran Produk Q4</span></span>
          </div>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
