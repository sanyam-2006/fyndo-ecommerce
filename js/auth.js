// ===================================================================
// FYNDO CLOUD AUTHENTICATION & FIRESTORE DATABASE (Google Firebase)
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyAOPO-rR1LIFOl32aRAoimP9G3Sb7r0S68",
  authDomain: "fyndo-ecommerce.firebaseapp.com",
  projectId: "fyndo-ecommerce",
  storageBucket: "fyndo-ecommerce.firebasestorage.app",
  messagingSenderId: "379006164341",
  appId: "1:379006164341:web:e2192691d854ac2ca6c73c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUserProfile = null;

// 1. Open & Close Full-Screen Auth View
function openAuthModal(defaultTab = "signin") {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  switchAuthTab(defaultTab);
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
  clearAuthErrors();
}

function switchAuthTab(tab) {
  const signinForm = document.getElementById("auth-signin-form");
  const registerForm = document.getElementById("auth-register-form");
  const tabSignin = document.getElementById("tab-btn-signin");
  const tabRegister = document.getElementById("tab-btn-register");

  clearAuthErrors();

  if (tab === "signin") {
    signinForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabSignin.classList.add("active");
    tabRegister.classList.remove("active");
  } else {
    signinForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    tabSignin.classList.remove("active");
    tabRegister.classList.add("active");
  }
}

function clearAuthErrors() {
  const errBox = document.getElementById("auth-error-msg");
  if (errBox) {
    errBox.innerText = "";
    errBox.classList.add("hidden");
  }
}

function showAuthError(message) {
  const errBox = document.getElementById("auth-error-msg");
  if (errBox) {
    errBox.innerText = message;
    errBox.classList.remove("hidden");
  }
}

// 2. Register User (Stores Password in Auth + Details in Cloud Firestore)
async function handleUserRegister(e) {
  e.preventDefault();
  clearAuthErrors();

  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const address = document.getElementById("reg-address").value.trim();
  const pincode = document.getElementById("reg-pincode").value.trim();
  const password = document.getElementById("reg-password").value;

  if (password.length < 6) {
    showAuthError("Password must be at least 6 characters long.");
    return;
  }

  const submitBtn = document.getElementById("btn-register-submit");
  submitBtn.disabled = true;
  submitBtn.innerText = "Saving to Google Database...";

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.updateProfile({ displayName: name });

    const userDocData = {
      uid: user.uid,
      name: name,
      email: email,
      phone: phone,
      address: address,
      city: "Tindola",
      pincode: pincode || "225003",
      state: "Uttar Pradesh",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(user.uid).set(userDocData);

    currentUserProfile = userDocData;
    closeAuthModal();
    showToastNotification(`🎉 Welcome to Fyndo, ${name}! Account Created.`);
  } catch (error) {
    console.error("Registration Error:", error);
    if (error.code === "auth/email-already-in-use") {
      showAuthError("This email is already registered. Please sign in.");
    } else {
      showAuthError(error.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Register to Fyndo";
  }
}

// 3. User Sign In
async function handleUserSignIn(e) {
  e.preventDefault();
  clearAuthErrors();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const submitBtn = document.getElementById("btn-signin-submit");
  submitBtn.disabled = true;
  submitBtn.innerText = "Signing in...";

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const userDoc = await db.collection("users").doc(user.uid).get();
    if (userDoc.exists) {
      currentUserProfile = userDoc.data();
    } else {
      currentUserProfile = {
        name: user.displayName || "Shopper",
        email: user.email,
        phone: "9876543210",
        address: "Village Tindola",
        city: "Tindola",
        pincode: "225003",
        state: "Uttar Pradesh"
      };
    }

    closeAuthModal();
    showToastNotification(`👋 Welcome back, ${currentUserProfile.name}!`);
  } catch (error) {
    console.error("Login Error:", error);
    if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      showAuthError("Invalid email or password. Please try again.");
    } else {
      showAuthError(error.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Sign In to Fyndo";
  }
}

// 4. User Sign Out
async function handleUserSignOut() {
  try {
    await auth.signOut();
    currentUserProfile = null;
    showToastNotification("Logged out successfully.");
  } catch (error) {
    console.error("Sign out error:", error);
  }
}

// 5. Real-Time State Sync with Header
auth.onAuthStateChanged(async (user) => {
  const authContainer = document.getElementById("header-auth-container");
  if (!authContainer) return;

  if (user) {
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        currentUserProfile = doc.data();
      } else {
        currentUserProfile = { name: user.displayName || user.email.split("@")[0] };
      }
    } catch (e) {
      currentUserProfile = { name: user.displayName || "User" };
    }

    const firstName = (currentUserProfile.name || "User").split(" ")[0];
    authContainer.innerHTML = `
      <div class="user-logged-box">
        <span class="user-avatar"><i class="fa-solid fa-circle-user"></i></span>
        <div class="user-meta">
          <span class="user-hello">Hi,</span>
          <span class="user-display-name">${firstName}</span>
        </div>
        <button class="btn-logout" onclick="handleUserSignOut()" title="Sign Out">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;

    if (typeof userAddress !== "undefined" && currentUserProfile.address) {
      userAddress.fullName = currentUserProfile.name || userAddress.fullName;
      userAddress.phone = currentUserProfile.phone || userAddress.phone;
      userAddress.houseNo = currentUserProfile.address || userAddress.houseNo;
    }
  } else {
    currentUserProfile = null;
    authContainer.innerHTML = `
      <button class="action-btn" id="login-btn" onclick="openAuthModal('signin')">
        <i class="fa-regular fa-user"></i>
        <span>Sign In</span>
      </button>
    `;
  }
});

function showToastNotification(msg) {
  let toast = document.getElementById("cart-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-toast";
    toast.className = "cart-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <i class="fa-solid fa-circle-check"></i>
    <div class="toast-text">
      <strong>Fyndo Account</strong>
      <span>${msg}</span>
    </div>
  `;
  toast.classList.add("show");
  clearTimeout(toast.toastTimeout);
  toast.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}