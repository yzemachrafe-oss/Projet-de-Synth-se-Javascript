(function () {
  "use strict";

  /* ─────────────────────────────────────────────────────────────────
       Simple plain text password (no hashing)
    ───────────────────────────────────────────────────────────────── */
  function hashPassword(plain) {
    return plain;
  }

  /* ─────────────────────────────────────────────────────────────────
       Session guard — redirect immediately if already logged in
    ───────────────────────────────────────────────────────────────── */
  if (localStorage.getItem("userId")) {
    window.location.replace("pages/dashboard.html");
  }

  /* ─────────────────────────────────────────────────────────────────
       Remember-me — pre-fill login fields if saved credentials exist
    ───────────────────────────────────────────────────────────────── */
  var loginEmailEl = document.getElementById("login-email");
  var loginPwdEl = document.getElementById("login-password");
  var rememberEl = document.getElementById("remember-me");

  var savedEmail = localStorage.getItem("ct_remember_email");
  var savedPwd = localStorage.getItem("ct_remember_pwd");

  if (savedEmail) loginEmailEl.value = savedEmail;
  if (savedPwd) loginPwdEl.value = savedPwd;
  if (savedEmail && savedPwd) rememberEl.checked = true;

  /* ─────────────────────────────────────────────────────────────────
       Shared helpers
    ───────────────────────────────────────────────────────────────── */
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  /**
   * Mark a field invalid; optionally override its feedback message.
   * Passing null as message keeps the existing HTML text.
   */
  function setInvalid(input, message) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    if (message !== null) {
      var fb = input.parentElement.querySelector(".invalid-feedback");
      if (fb) fb.textContent = message;
    }
  }

  function setValid(input) {
    input.classList.remove("is-invalid");
    input.classList.add("is-valid");
  }

  function resetField(input) {
    input.classList.remove("is-invalid", "is-valid");
  }

  function showAlert(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function hideAlert(el) {
    el.textContent = "";
    el.classList.add("hidden");
  }

  /* ═════════════════════════════════════════════════════════════════
       LOGIN
    ═════════════════════════════════════════════════════════════════ */
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideAlert(loginError);

    var email = loginEmailEl.value.trim();
    var password = loginPwdEl.value;
    var valid = true;

    /* ── per-field format checks ── */
    if (!email || !isValidEmail(email)) {
      setInvalid(loginEmailEl, null);
      valid = false;
    } else {
      setValid(loginEmailEl);
    }

    if (!password) {
      setInvalid(loginPwdEl, null);
      valid = false;
    } else {
      setValid(loginPwdEl);
    }

    if (!valid) return;

    /* ── verify password ── */
    var user = DB.getUserByEmail(email);

    if (!user || user.password !== password) {
      showAlert(loginError, "Email ou mot de passe incorrect.");
      return;
    }

    /* ── remember-me ── */
    if (rememberEl.checked) {
      localStorage.setItem("ct_remember_email", email);
      localStorage.setItem("ct_remember_pwd", password);
    } else {
      localStorage.removeItem("ct_remember_email");
      localStorage.removeItem("ct_remember_pwd");
    }

    /* ── save session and redirect ── */
    localStorage.setItem("userId", user.id);
    localStorage.setItem("userNom", user.nom);
    localStorage.setItem("is_admin", String(user.is_admin));

    window.location.replace("pages/dashboard.html");
  });

  /* ═════════════════════════════════════════════════════════════════
       REGISTRATION
    ═════════════════════════════════════════════════════════════════ */
  var registerForm = document.getElementById("register-form");
  var registerError = document.getElementById("register-error");
  var registerSuccess = document.getElementById("register-success");

  var regNom = document.getElementById("reg-nom");
  var regZone = document.getElementById("reg-zone");
  var regSalaire = document.getElementById("reg-salaire");
  var regEmail = document.getElementById("reg-email");
  var regPwd = document.getElementById("reg-password");
  var regConfirm = document.getElementById("reg-confirm");

  var ALL_REG_FIELDS = [
    regNom,
    regZone,
    regSalaire,
    regEmail,
    regPwd,
    regConfirm,
  ];

  /* Allows French accented letters, spaces, hyphens, apostrophes */
  var NAME_RE = /^[a-zA-ZÀ-ÿ\s'\-]+$/;

  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideAlert(registerError);
    hideAlert(registerSuccess);

    var nom = regNom.value.trim();
    var zone = regZone.value;
    var salaire = Number(regSalaire.value);
    var email = regEmail.value.trim();
    var pwd = regPwd.value;
    var confirm = regConfirm.value;

    var valid = true;

    /* ── Nom complet ── */
    if (nom.length < 3) {
      setInvalid(regNom, "Le nom complet est requis (minimum 3 caractères).");
      valid = false;
    } else if (!NAME_RE.test(nom)) {
      setInvalid(
        regNom,
        "Le nom ne peut contenir que des lettres, espaces ou tirets.",
      );
      valid = false;
    } else {
      setValid(regNom);
    }

    /* ── Zone ── */
    if (!zone) {
      setInvalid(regZone, "Veuillez sélectionner une zone de livraison.");
      valid = false;
    } else {
      setValid(regZone);
    }

    /* ── Salaire de base ── */
    if (!regSalaire.value || isNaN(salaire) || salaire < 1500) {
      setInvalid(
        regSalaire,
        "Le salaire de base doit être d'au moins 1 500 DH.",
      );
      valid = false;
    } else {
      setValid(regSalaire);
    }

    /* ── Email — format then unicité ── */
    if (!email || !isValidEmail(email)) {
      setInvalid(regEmail, "Veuillez saisir une adresse e-mail valide.");
      valid = false;
    } else if (DB.getUserByEmail(email)) {
      setInvalid(regEmail, "Cette adresse e-mail est déjà utilisée.");
      valid = false;
    } else {
      setValid(regEmail);
    }

    /* ── Mot de passe ── */
    if (pwd.length < 6) {
      setInvalid(
        regPwd,
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      valid = false;
    } else {
      setValid(regPwd);
    }

    /* ── Confirmation ── */
    if (!confirm || confirm !== pwd) {
      setInvalid(regConfirm, "Les mots de passe ne correspondent pas.");
      valid = false;
    } else {
      setValid(regConfirm);
    }

    if (!valid) return;

    /* ── All valid — create account ── */
    DB.addUser({
      nom: nom,
      email: email,
      password: pwd,
      is_admin: false,
      salaire_base: salaire,
      zone: zone,
    });

    /* ── Reset form to neutral state ── */
    registerForm.reset();
    ALL_REG_FIELDS.forEach(resetField);

    /* ── Success banner ── */
    showAlert(
      registerSuccess,
      "Compte créé avec succès ! Vous pouvez maintenant vous connecter.",
    );

    /* ── Pre-fill login email for convenience ── */
    loginEmailEl.value = email;

    /* ── Switch to connexion tab after a short delay so the
              user can read the success message ── */
    setTimeout(function () {
      hideAlert(registerSuccess);
      bootstrap.Tab.getOrCreateInstance(
        document.getElementById("connexion-tab"),
      ).show();
    }, 1800);
  });
})();
