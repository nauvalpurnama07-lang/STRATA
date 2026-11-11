import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from "firebase/ai";
import {
  initialBoard,
  initialSprint,
  initialProjects,
  createEmptyBoard,
  createStarterBoard,
  createDefaultSprint,
  canAccountAccessProject,
  getProjectOwnerEmail,
  MEMBERS,
  SEED_ACCOUNTS,
  registerMember,
} from "./data/board.js";

// Konfigurasi Firebase Web SDK resmi untuk proyek "strata-pat" (Strata)
export const firebaseConfig = {
  apiKey: "AIzaSyALaYZDrLxjtW2HNsju2zEVbo5iGsQuIXw",
  authDomain: "strata-pat.firebaseapp.com",
  projectId: "strata-pat",
  storageBucket: "strata-pat.firebasestorage.app",
  messagingSenderId: "472811554344",
  appId: "1:472811554344:web:e3ae3c1fe4057c046d571d",
  measurementId: "G-DK5HG4LB71",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);

// Inisialisasi Firebase AI Logic (Gemini Developer API Backend terkelola di Firebase)
export const ai = (() => {
  try {
    return getAI(app, { backend: new GoogleAIBackend() });
  } catch (err) {
    console.warn("[STRATA Firebase AI] Inisialisasi AI Logic fallback:", err);
    return null;
  }
})();

export const DEFAULT_WORKSPACE_ID = "peluncuran-q4";

/**
 * Login menggunakan Google OAuth Popup resmi Firebase Authentication,
 * lalu menyimpan/menyinkronkan profil pengguna ke koleksi `accounts` di Cloud Firestore.
 */
export async function signInWithGooglePopup(existingAccounts = []) {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const email = (fbUser.email || "").trim();
  const displayName = (fbUser.displayName || email.split("@")[0] || "Pengguna Google").trim();
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] || "").toUpperCase())
      .join("") || "GG";

  // Cek apakah email ini sudah ada di daftar akun
  const matched = existingAccounts.find(
    (a) => a.email && a.email.toLowerCase() === email.toLowerCase()
  );

  const role = matched?.role || "admin";
  const memberKey =
    matched?.memberKey ||
    "g_" +
      (fbUser.uid ? fbUser.uid.slice(0, 10).toLowerCase() : Date.now().toString(36));
  const googlePhotoURL = fbUser.photoURL || matched?.photoURL || null;

  if (!MEMBERS[memberKey]) {
    const palette = ["#34D399", "#3B82F6", "#F59E0B", "#EC4899", "#22D3EE"];
    MEMBERS[memberKey] = {
      name: displayName,
      initials,
      color: palette[Object.keys(MEMBERS).length % palette.length],
      role,
      email,
      joined: "Hari ini",
      ...(googlePhotoURL ? { photoURL: googlePhotoURL } : {}),
    };
  } else if (googlePhotoURL && !MEMBERS[memberKey].photoURL) {
    MEMBERS[memberKey].photoURL = googlePhotoURL;
  }

  const now = new Date().toISOString();
  const accountDoc = {
    name: matched?.name || displayName,
    email,
    initials: matched?.initials || initials,
    role,
    memberKey,
    provider: "google",
    uid: fbUser.uid,
    color: MEMBERS[memberKey]?.color || "#34D399",
    joined: MEMBERS[memberKey]?.joined || "Hari ini",
    ...(googlePhotoURL ? { photoURL: googlePhotoURL } : {}),
    updatedAt: now,
  };

  try {
    const accRef = doc(db, "accounts", memberKey);
    const snap = await getDoc(accRef);
    if (!snap.exists()) {
      await setDoc(accRef, { ...accountDoc, createdAt: now });
    } else {
      await setDoc(accRef, accountDoc, { merge: true });
    }

    const wsRef = doc(db, "workspaces", DEFAULT_WORKSPACE_ID);
    await setDoc(
      wsRef,
      {
        members: MEMBERS,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[STRATA Auth] Gagal menyinkronkan profil Google ke Firestore:", err);
  }

  return {
    name: accountDoc.name,
    email: accountDoc.email,
    initials: accountDoc.initials,
    provider: "google",
    role: accountDoc.role,
    memberKey: accountDoc.memberKey,
    uid: fbUser.uid,
    photoURL: googlePhotoURL,
  };
}

/**
 * Pendaftaran akun baru menggunakan Firebase Authentication resmi.
 * Tidak menyimpan kata sandi mentah (plaintext password) di Cloud Firestore.
 */
export async function signUpWithEmailPassword(name, email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const initials =
    cleanName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] || "").toUpperCase())
      .join("") || "U";

  let uid = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    uid = cred.user.uid;
  } catch (authErr) {
    if (authErr?.code === "auth/email-already-in-use") {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        uid = cred.user.uid;
      } catch {
        throw authErr;
      }
    } else {
      throw authErr;
    }
  }

  const memberKey = "u_" + (uid ? uid.slice(0, 10).toLowerCase() : Date.now().toString(36));
  const palette = ["#34D399", "#3B82F6", "#F59E0B", "#EC4899", "#22D3EE"];
  if (!MEMBERS[memberKey]) {
    MEMBERS[memberKey] = {
      name: cleanName,
      initials,
      color: palette[Object.keys(MEMBERS).length % palette.length],
      role: "admin",
      email: cleanEmail,
      joined: "Hari ini",
    };
  }

  const newAccount = {
    name: cleanName,
    email: cleanEmail,
    initials,
    role: "admin",
    memberKey,
    uid,
    provider: "email",
    color: MEMBERS[memberKey]?.color || "#34D399",
    joined: "Hari ini",
  };

  await saveNewAccountToFirestore(newAccount);

  return newAccount;
}

/**
 * Masuk akun menggunakan Firebase Authentication resmi.
 */
export async function signInWithEmailPassword(email, password, existingAccounts = []) {
  const cleanEmail = email.trim().toLowerCase();
  let fbUser = null;
  let authError = null;

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    fbUser = cred.user;
  } catch (err) {
    authError = err;
  }

  // Cari profil di daftar akun Firestore
  const matched = existingAccounts.find(
    (a) => a.email && a.email.toLowerCase() === cleanEmail
  );

  if (fbUser) {
    return {
      name: matched?.name || cleanEmail.split("@")[0],
      email: cleanEmail,
      initials: matched?.initials || cleanEmail.slice(0, 2).toUpperCase(),
      photoURL: matched?.photoURL || fbUser.photoURL || "",
      provider: "email",
      role: matched?.role || "admin",
      memberKey: matched?.memberKey || "u_" + fbUser.uid.slice(0, 10).toLowerCase(),
      uid: fbUser.uid,
    };
  }

  // Jika akun lama terdaftar di Firestore dengan password plaintext, lakukan migrasi otomatis ke Firebase Auth
  if (authError && matched && matched.password && matched.password === password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      return {
        name: matched.name,
        email: matched.email,
        initials: matched.initials,
        photoURL: matched.photoURL || "",
        provider: "email",
        role: matched.role || "admin",
        memberKey: matched.memberKey,
        uid: cred.user.uid,
      };
    } catch {
      return {
        name: matched.name,
        email: matched.email,
        initials: matched.initials,
        photoURL: matched.photoURL || "",
        provider: "email",
        role: matched.role || "admin",
        memberKey: matched.memberKey,
      };
    }
  }

  if (authError) {
    throw authError;
  }

  throw new Error("Akun tidak ditemukan.");
}

/**
 * Mendengarkan sesi Firebase Authentication aktif (misal akun Google yang sudah login)
 * untuk menyinkronkan foto profil Google (`photoURL`) secara otomatis tanpa perlu login ulang.
 */
export function subscribeToGoogleAuthProfile(onGoogleUser) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser || !fbUser.email) return;
    const email = fbUser.email.trim().toLowerCase();
    const photoURL = fbUser.photoURL || null;
    const memberKey =
      Object.keys(MEMBERS).find(
        (k) => String(MEMBERS[k]?.email || "").trim().toLowerCase() === email
      ) ||
      "g_" + (fbUser.uid ? fbUser.uid.slice(0, 10).toLowerCase() : "google");

    if (photoURL) {
      MEMBERS[memberKey] = {
        ...(MEMBERS[memberKey] || {}),
        name: MEMBERS[memberKey]?.name || fbUser.displayName || email.split("@")[0],
        email: fbUser.email.trim(),
        photoURL: MEMBERS[memberKey]?.photoURL || photoURL,
      };
      try {
        const accRef = doc(db, "accounts", memberKey);
        await setDoc(
          accRef,
          {
            email: fbUser.email.trim(),
            memberKey,
            photoURL,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {}
    }

    if (typeof onGoogleUser === "function") {
      onGoogleUser({
        uid: fbUser.uid,
        email: fbUser.email.trim(),
        displayName: fbUser.displayName || "",
        photoURL,
        memberKey,
      });
    }
  });
}

/**
 * Logout dari sesi Firebase Authentication
 */
export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("[STRATA Auth] Sign out warning:", err);
  }
}

const LEGACY_DEMO_ACCOUNT_IDS = ["rn", "fr", "dp", "ap"];
const LEGACY_DEMO_EMAILS = new Set([
  "ricky@peluncuran.id",
  "fajar@peluncuran.id",
  "dinda@peluncuran.id",
  "aisyah@peluncuran.id",
]);
const LEGACY_DEMO_PROJECT_IDS = new Set([
  "proj-peluncuran-q4",
  "proj-aplikasi-mobile",
  "proj-sistem-desain",
]);

function isLegacyDemoEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  return LEGACY_DEMO_EMAILS.has(clean) || clean.endsWith("@peluncuran.id");
}

/**
 * Memastikan akun demo lama (`@peluncuran.id`) dan proyek demo bawaan dihapus dari Cloud Firestore
 * sehingga hanya akun pengguna asli yang tersimpan.
 */
export async function ensureDatabaseSeeded() {
  try {
    // 1. Bersihkan akun demo lama dari koleksi `accounts`
    const accountsCol = collection(db, "accounts");
    const accountsSnap = await getDocs(accountsCol);
    const deletePromises = [];

    accountsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        LEGACY_DEMO_ACCOUNT_IDS.includes(docSnap.id) ||
        isLegacyDemoEmail(data?.email)
      ) {
        deletePromises.push(deleteDoc(doc(db, "accounts", docSnap.id)));
      }
    });

    // 2. Bersihkan proyek demo lama dari koleksi `projects`
    const projectsCol = collection(db, "projects");
    const projectsSnap = await getDocs(projectsCol);
    projectsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        LEGACY_DEMO_PROJECT_IDS.has(docSnap.id) ||
        isLegacyDemoEmail(data?.ownerEmail) ||
        isLegacyDemoEmail(data?.createdBy)
      ) {
        deletePromises.push(deleteDoc(doc(db, "projects", docSnap.id)));
      }
    });

    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }
    return true;
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal memeriksa/membersihkan data demo:", err);
    return false;
  }
}

/**
 * Memastikan akun yang sedang login memiliki minimal 1 papan Kanban miliknya sendiri
 * yang terisolasi dari akun lain.
 */
export async function ensureAccountProjectInFirestore(user, existingProjects = []) {
  if (!user || !user.email) return null;
  const email = user.email.trim().toLowerCase();
  const hasAccessible = existingProjects.some((p) => canAccountAccessProject(p, email));
  if (hasAccessible) return null;

  const emailSlug = email
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const projectId = `proj-akun-${emailSlug}`;
  const firstName = (user.name || email.split("@")[0] || "Pengguna").split(" ")[0];
  const projectName = `Ruang Kerja ${firstName}`;
  const now = new Date().toISOString();
  const board = createStarterBoard(projectName);
  const sprint = createDefaultSprint(
    `Menyelesaikan prioritas utama pada papan kerja pribadi ${user.name || firstName}.`
  );

  const accountProject = {
    id: projectId,
    name: projectName,
    tag: "Pribadi",
    dot: "#34D399",
    real: true,
    type: "personal",
    description: `Papan Kanban khusus milik akun ${email}. Akun lain tidak dapat mengakses papan ini.`,
    members: [email],
    ownerEmail: email,
    allowedEmails: [email],
    board,
    sprint,
    lockPriority: false,
    restrictToPriority: false,
    createdBy: email,
    updatedBy: email,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, "projects", projectId), accountProject, { merge: true });
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menyiapkan papan khusus akun:", err);
  }
  return accountProject;
}

/**
 * Membuat dokumen proyek baru di tabel/koleksi `/projects/{projectId}` lengkap dengan papan Kanban-nya sendiri
 * serta mengunci akses hanya ke akun pembuat (+ email yang diizinkan jika ada).
 */
export async function createProjectInFirestore({
  name,
  description = "",
  type = "personal",
  dot = "#34D399",
  tag = "Sprint 1",
  template = "starter",
  createdBy = "",
  ownerEmail = "",
  allowedEmails = [],
  invitedRole = "member",
}) {
  const now = new Date().toISOString();
  const owner = (ownerEmail || createdBy || "").trim().toLowerCase();
  const cleanAllowed = Array.from(
    new Set(
      [owner, ...(Array.isArray(allowedEmails) ? allowedEmails : [])]
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e && e.includes("@"))
    )
  );

  const membersRoleMap = {};
  for (const em of cleanAllowed) {
    membersRoleMap[em] = em === owner ? "admin" : invitedRole === "viewer" ? "viewer" : "member";
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  const projectId = `proj-${slug || "baru"}-${Date.now().toString(36).slice(-4)}`;
  const board =
    template === "empty" ? createEmptyBoard() : createStarterBoard(name.trim());
  const sprint = createDefaultSprint(
    `Menyelesaikan target utama proyek ${name.trim()} pada sprint ini.`
  );

  const effectiveType = cleanAllowed.length > 1 ? "team" : type === "personal" ? "personal" : "team";

  const newProject = {
    id: projectId,
    name: name.trim(),
    tag: tag.trim() || "Sprint 1",
    dot: dot || "#34D399",
    real: true,
    type: effectiveType,
    description:
      description.trim() ||
      `Papan kerja Kanban khusus untuk proyek ${name.trim()} (Milik ${owner}).`,
    members: membersRoleMap,
    ownerEmail: owner,
    allowedEmails: cleanAllowed,
    board,
    sprint,
    lockPriority: false,
    restrictToPriority: false,
    createdBy: owner,
    updatedBy: owner,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const projRef = doc(db, "projects", projectId);
    await setDoc(projRef, newProject);
    await syncTasksCollection(board, now);
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal membuat proyek baru di Firestore:", err);
  }

  return newProject;
}

/**
 * Mengundang atau memperbarui daftar kolaborator (email) beserta peran aktornya ('member' | 'viewer')
 * HANYA untuk satu ruang kerja / papan proyek tertentu (`/projects/{projectId}`).
 */
export async function updateProjectCollaboratorsInFirestore(
  projectId,
  ownerEmail,
  allowedEmails = [],
  updatedBy = "",
  roleMap = {}
) {
  if (!projectId) return null;
  const owner = (ownerEmail || updatedBy || "").trim().toLowerCase();
  const cleanAllowed = Array.from(
    new Set(
      [owner, ...(Array.isArray(allowedEmails) ? allowedEmails : [])]
        .map((e) => String(e || "").trim().toLowerCase())
        .filter((e) => e && e.includes("@"))
    )
  );
  const membersRoleMap = {};
  for (const em of cleanAllowed) {
    if (em === owner) {
      membersRoleMap[em] = "admin";
    } else {
      const requested = roleMap && typeof roleMap === "object" ? roleMap[em] : null;
      membersRoleMap[em] = requested === "viewer" ? "viewer" : "member";
    }
  }
  const effectiveType = cleanAllowed.length > 1 ? "team" : "personal";
  const now = new Date().toISOString();
  const payload = {
    ownerEmail: owner,
    allowedEmails: cleanAllowed,
    members: membersRoleMap,
    type: effectiveType,
    updatedBy: updatedBy || owner,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, "projects", projectId), payload, { merge: true });
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal memperbarui kolaborator proyek:", err);
  }
  return payload;
}

/**
 * Menyimpan perubahan papan Kanban, Sprint, atau pengaturan proyek ke `/projects/{projectId}`
 */
export async function saveProjectToFirestore(projectId, partialData) {
  if (!projectId) return;
  try {
    const projRef = doc(db, "projects", projectId);
    const now = new Date().toISOString();
    const payload = {
      ...partialData,
      updatedAt: now,
    };
    if (typeof partialData.lockPriority === "boolean") {
      payload.restrictToPriority = partialData.lockPriority;
    }
    await setDoc(projRef, payload, { merge: true });

    if (Array.isArray(partialData.board)) {
      await syncTasksCollection(partialData.board);
    }
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menyimpan proyek ke Firestore:", err);
  }
}

/**
 * Menghapus proyek dari koleksi `/projects/{projectId}` di Cloud Firestore
 */
export async function deleteProjectFromFirestore(projectId) {
  if (!projectId) return;
  try {
    await deleteDoc(doc(db, "projects", projectId));
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menghapus proyek dari Firestore:", err);
  }
}

/**
 * Berlangganan secara real-time ke koleksi `/projects` (tabel proyek per papan Kanban)
 */
export function subscribeToProjects(onUpdate, onError) {
  const colRef = collection(db, "projects");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const docId = d?.id || docSnap.id;
        if (
          LEGACY_DEMO_PROJECT_IDS.has(docId) ||
          isLegacyDemoEmail(d?.ownerEmail) ||
          isLegacyDemoEmail(d?.createdBy)
        ) {
          return;
        }
        if (d && d.name && Array.isArray(d.board)) {
          list.push({
            ...d,
            id: docId,
            real: true,
          });
        }
      });
      list.sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
      onUpdate(list);
    },
    (err) => {
      console.warn("[STRATA Firestore] Listener projects error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Menyinkronkan daftar kartu di papan ke koleksi `/tasks/{taskId}`
 */
export async function syncTasksCollection(board, createdTimestamp) {
  try {
    const now = new Date().toISOString();
    const writes = [];
    board.forEach((col) => {
      (col.tasks || []).forEach((t, idx) => {
        const taskRef = doc(db, "tasks", t.id);
        const payload = {
          id: t.id,
          title: t.title || "Tugas tanpa judul",
          desc: t.desc || "",
          priority: t.priority || "medium",
          column: col.id,
          columnId: col.id,
          due: t.due || "Tanpa tenggat",
          assignee: t.assignee || null,
          points: typeof t.points === "number" ? t.points : 3,
          prioritized: !!t.prioritized,
          prioritizedByCaptain: !!t.prioritized,
          checklist: Array.isArray(t.checklist) ? t.checklist : [],
          comments: Array.isArray(t.comments) ? t.comments : [],
          order: idx,
          updatedAt: now,
        };
        if (createdTimestamp) {
          payload.createdAt = createdTimestamp;
        }
        writes.push(setDoc(taskRef, payload, { merge: true }));
      });
    });
    await Promise.all(writes);
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menyinkronkan koleksi tasks:", err);
  }
}

/**
 * Berlangganan daftar akun dari koleksi `accounts` di Firestore
 */
export function subscribeToAccounts(onUpdate) {
  const colRef = collection(db, "accounts");
  return onSnapshot(
    colRef,
    (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (
          LEGACY_DEMO_ACCOUNT_IDS.includes(docSnap.id) ||
          isLegacyDemoEmail(d?.email)
        ) {
          return;
        }
        if (d && d.email) {
          list.push(d);
          if (d.memberKey) {
            MEMBERS[d.memberKey] = {
              ...(MEMBERS[d.memberKey] || {}),
              name: d.name || MEMBERS[d.memberKey]?.name || "Pengguna",
              initials: d.initials || MEMBERS[d.memberKey]?.initials || "U",
              color: d.color || MEMBERS[d.memberKey]?.color || "#22D3EE",
              role: d.role || MEMBERS[d.memberKey]?.role || "member",
              email: d.email,
              joined: d.joined || MEMBERS[d.memberKey]?.joined || "Baru bergabung",
              ...(d.title ? { title: d.title } : {}),
              ...(d.bio ? { bio: d.bio } : {}),
              ...(d.photoURL ? { photoURL: d.photoURL } : {}),
            };
          }
        }
      });
      onUpdate(list);
    },
    (err) => {
      console.warn("[STRATA Firestore] Listener accounts error:", err);
    }
  );
}

/**
 * Memperbarui profil akun pengguna (nama, inisial, warna avatar, jabatan, bio, foto) di Cloud Firestore
 */
export async function updateAccountProfileInFirestore(memberKeyOrEmail, patch = {}) {
  try {
    const now = new Date().toISOString();
    let targetKey = memberKeyOrEmail;
    if (!targetKey || targetKey.includes("@")) {
      const emailLower = String(memberKeyOrEmail || "").trim().toLowerCase();
      const foundKey = Object.keys(MEMBERS).find(
        (k) => String(MEMBERS[k]?.email || "").trim().toLowerCase() === emailLower
      );
      targetKey =
        foundKey ||
        "u_" + emailLower.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 20);
    }

    if (MEMBERS[targetKey]) {
      MEMBERS[targetKey] = {
        ...MEMBERS[targetKey],
        ...patch,
      };
    }

    const accRef = doc(db, "accounts", targetKey);
    await setDoc(
      accRef,
      {
        ...patch,
        memberKey: targetKey,
        updatedAt: now,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menyimpan perubahan profil akun:", err);
    return false;
  }
}

/**
 * Menyimpan akun baru yang mendaftar ke koleksi `accounts` dan memperbarui `members` di workspace
 */
export async function saveNewAccountToFirestore(account) {
  try {
    const now = new Date().toISOString();
    const memberKey = account.memberKey || registerMember(account);
    const memberMeta = MEMBERS[memberKey] || {};
    const accRef = doc(db, "accounts", memberKey);

    const accountPayload = {
      name: account.name,
      email: account.email,
      initials: account.initials || "U",
      role: account.role || "admin",
      memberKey,
      provider: account.provider || "email",
      color: memberMeta.color || "#22D3EE",
      joined: memberMeta.joined || "Hari ini",
      createdAt: now,
      updatedAt: now,
    };
    if (account.uid) accountPayload.uid = account.uid;
    if (account.photoURL) accountPayload.photoURL = account.photoURL;

    await setDoc(accRef, accountPayload);

    const wsRef = doc(db, "workspaces", DEFAULT_WORKSPACE_ID);
    await setDoc(
      wsRef,
      {
        members: MEMBERS,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[STRATA Firestore] Gagal menyimpan akun baru:", err);
  }
}

// Konfigurasi kredensial & model AI terpusat di sisi layanan Firebase / Environment
const BACKEND_GEMINI_KEY =
  import.meta.env?.VITE_GEMINI_API_KEY ||
  import.meta.env?.VITE_LLM_API_KEY ||
  "";

const BACKEND_GEMINI_MODELS = [
  import.meta.env?.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

let firebaseAiLogicAvailable = false;

/**
 * Memanggil layanan AI untuk Koko / Bobi / Cika / Piko langsung melalui
 * layer backend Firebase (`src/firebase.js`) menggunakan `gemini-3.5-flash` / `gemini-3.5-flash-lite`
 * dan SDK `firebase/ai` tanpa meminta input API Key dari pengguna.
 */
export async function generateAIHelperResponse({
  userText,
  persona,
  projectName,
  board,
  sprint,
}) {
  const boardSummary = Array.isArray(board)
    ? board.map((c) => `${c.name} (${c.id}): ${c.tasks?.length || 0} kartu`).join(", ")
    : "Backlog, Perlu Dikerjakan, Sedang Dikerjakan, Selesai";

  const systemPrompt = `Kamu adalah "${persona.fullName}" (${persona.tagline}), asisten cerdas spesialis manajemen proyek, Kanban, dan metodologi Scrum pada platform STRATA.
Konteks papan aktif saat ini:
- Nama Proyek: ${projectName || "Ruang Kerja STRATA"}
- Sprint: Sprint #${sprint?.number || 1} (Tujuan: "${sprint?.goal || "-"}")
- Ringkasan Kolom: ${boardSummary}

Instruksi gaya bahasa:
- Jawab dengan bahasa Indonesia yang jelas, profesional, ringkas, dan solutif.
- SANGAT PENTING: DILARANG KERAS menggunakan emoji apapun (zero emoji slop). Jangan sertakan simbol emoji seperti 🚀, ✨, 💡, 🎯, 🔥, dsb., baik dalam teks balasan, judul tugas, maupun nama template. Gunakan kalimat yang bersih, tajam, dan elegan.

PENTING: Kembalikan respons HANYA dalam format JSON murni (bukan array, tanpa blok kode markdown) dengan struktur objek berikut:
{
  "kind": "text" | "task" | "template",
  "text": "Pesan penjelasan singkat dan solutif (tanpa emoji)",
  "task": { "title": "Judul tugas spesifik dan ringkas (tanpa emoji)", "priority": "urgent" | "high" | "medium" | "low", "column": "backlog" | "todo" | "progress" | "review" },
  "template": {
    "name": "Nama Rencana / Template (tanpa emoji)",
    "tasks": [
      { "title": "Judul tugas (tanpa emoji)", "priority": "urgent" | "high" | "medium" | "low", "column": "todo" }
    ]
  }
}
Aturan "kind":
- Gunakan "task" jika pengguna meminta dibuatkan/ditambahkan 1 tugas spesifik.
- Gunakan "template" jika pengguna meminta rencana proyek, daftar tugas, breakdown fitur, atau beberapa kartu sekaligus (buat 3-5 tugas terarah).
- Gunakan "text" jika pengguna hanya mengobrol, berkonsultasi, bertanya tentang tips Scrum/Kanban, atau menanyakan kondisi papan.`;

  let rawContent = "";
  let lastError = "";

  // 1. Jalur Utama: Backend Gemini terkelola di `src/firebase.js` (gemini-3.5-flash & gemini-3.5-flash-lite)
  if (BACKEND_GEMINI_KEY) {
    const uniqueModels = Array.from(new Set(BACKEND_GEMINI_MODELS));
    for (const modelId of uniqueModels) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelId
        )}:generateContent?key=${encodeURIComponent(BACKEND_GEMINI_KEY.trim())}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const answerPart =
            parts.filter((p) => !p.thought && typeof p.text === "string").pop() ||
            parts[parts.length - 1];
          rawContent = answerPart?.text || "";
          if (rawContent) break;
        } else {
          lastError = `Gemini Backend ${modelId} (${res.status})`;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err?.name === "AbortError" ? `Timeout ${modelId}` : err?.message || "Network error";
      }
    }
  }

  // 2. Fallback Sekunder: Gunakan Firebase AI Logic SDK resmi (`firebase/ai`) bila diaktifkan di Firebase Console
  if (!rawContent && ai && firebaseAiLogicAvailable) {
    try {
      const model = getGenerativeModel(ai, {
        model: "gemini-3.5-flash",
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      });
      const result = await model.generateContent(userText);
      const text = result?.response?.text ? result.response.text() : "";
      if (text) {
        rawContent = text;
      }
    } catch (fbAiErr) {
      const msg = fbAiErr?.message || "";
      if (msg.includes("api-not-enabled") || msg.includes("403") || msg.includes("404")) {
        firebaseAiLogicAvailable = false;
      }
      lastError = msg || "Firebase AI Logic fallback";
    }
  }

  if (!rawContent) {
    throw new Error(lastError || "Layanan AI tidak merespons");
  }

  let cleaned = rawContent
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { kind: "text", text: rawContent };
  }

  const sanitizeText = (str) =>
    typeof str === "string"
      ? str
          .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, "")
          .replace(/[ \t]{2,}/g, " ")
          .replace(/[ \t]+([.,!?:])/g, "$1")
          .trim()
      : str;

  const validPriorities = ["urgent", "high", "medium", "low"];
  const validColumns = ["backlog", "todo", "progress", "review", "done"];
  const normPriority = (p) => {
    const low = String(p || "").toLowerCase().trim();
    return validPriorities.includes(low) ? low : "medium";
  };
  const normColumn = (c) => {
    const low = String(c || "").toLowerCase().trim();
    return validColumns.includes(low) ? low : "todo";
  };
  const kindLow = String(parsed.kind || "").toLowerCase();

  if (
    (kindLow.includes("template") || Array.isArray(parsed.template?.tasks)) &&
    parsed.template &&
    Array.isArray(parsed.template.tasks) &&
    parsed.template.tasks.length > 0
  ) {
    return {
      role: "assistant",
      kind: "template",
      text: sanitizeText(parsed.text) || `Berikut rekomendasi kartu kerja yang disiapkan oleh ${persona.name}.`,
      template: {
        name: sanitizeText(parsed.template.name) || `Rencana Proyek ${persona.name}`,
        tasks: parsed.template.tasks.slice(0, 6).map((t) => ({
          title: sanitizeText(String(t.title || "Tugas baru").slice(0, 100)),
          priority: normPriority(t.priority),
          column: normColumn(t.column),
        })),
      },
    };
  }

  if ((kindLow.includes("task") || parsed.task?.title) && parsed.task) {
    return {
      role: "assistant",
      kind: "task",
      text: sanitizeText(parsed.text) || `Kartu tugas telah disiapkan oleh ${persona.name}.`,
      task: {
        title: sanitizeText(String(parsed.task.title || "Tugas baru").slice(0, 100)),
        priority: normPriority(parsed.task.priority),
        column: normColumn(parsed.task.column),
      },
    };
  }

  return {
    role: "assistant",
    kind: "text",
    text: sanitizeText(parsed.text || rawContent) || `Halo! Ada tugas atau rencana kerja yang ingin ditambahkan ke papan?`,
  };
}

