(function () {
    'use strict';

    /* ── Module state ────────────────────────────────────────────────── */
    var users      = [];
    var livraisons = [];
    var coursiers  = [];
    var bsModal    = null;

    /* ── Regex — French names ────────────────────────────────────────── */
    var NAME_RE = /^[a-zA-ZÀ-ÿ\s'\-]+$/;

    /* ── Helpers ─────────────────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function setInvalid(input, msg) {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        if (msg) {
            var fb = input.parentElement.querySelector('.invalid-feedback');
            if (fb) fb.textContent = msg;
        }
    }

    function setValid(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
    }

    function resetValidation(fields) {
        fields.forEach(function (f) { f.classList.remove('is-valid', 'is-invalid'); });
    }

    /* ── Table rendering ─────────────────────────────────────────────── */
    function afficherCoursiers() {
        var tbody = el('coursiers-body');
        tbody.innerHTML = '';

        if (coursiers.length === 0) {
            var empty = document.createElement('tr');
            empty.innerHTML =
                '<td colspan="6" class="text-center text-muted" style="padding: 2rem;">' +
                'Aucun coursier enregistré.' +
                '</td>';
            tbody.appendChild(empty);
            return;
        }

        coursiers.forEach(function (c) {
            var total     = livraisons.filter(function (l) { return l.courier_id === c.id; }).length;
            var zoneClass = c.zone === 'A' ? 'zone-a' : 'zone-b';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><strong>' + c.nom + '</strong></td>' +
                '<td style="color: var(--gray-500); font-size: 0.9rem;">' + c.email + '</td>' +
                '<td><span class="zone-badge ' + zoneClass + '">' + c.zone + '</span></td>' +
                '<td>' + Number(c.salaire_base).toFixed(2) + ' DH</td>' +
                '<td>' + total + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-secondary me-1 btn-edit-crs" ' +
                    'data-id="' + c.id + '" title="Modifier">' +
                    '<i class="bi bi-pencil"></i></button>' +
                    '<button class="btn btn-sm btn-danger btn-delete-crs" ' +
                    'data-id="' + c.id + '" title="Supprimer">' +
                    '<i class="bi bi-trash"></i></button>' +
                '</td>';
            tbody.appendChild(tr);
        });

        /* Action listeners */
        tbody.querySelectorAll('.btn-edit-crs').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var user = users.find(function (u) { return u.id === this.dataset.id; }, this);
                if (user) ouvrirModal(user);
            });
        });

        tbody.querySelectorAll('.btn-delete-crs').forEach(function (btn) {
            btn.addEventListener('click', function () {
                supprimerCoursier(this.dataset.id);
            });
        });
    }

    /* ── Modal ───────────────────────────────────────────────────────── */
    function ouvrirModal(coursier) {
        var nomInput  = el('crs-nom');
        var zoneInput = el('crs-zone');
        var salInput  = el('crs-salaire');
        var emInput   = el('crs-email');
        var pwdInput  = el('crs-password');
        var idField   = el('crs-id');

        resetValidation([nomInput, zoneInput, salInput, emInput, pwdInput]);

        if (coursier) {
            el('modal-coursier-titre').textContent = 'Modifier le coursier';
            idField.value    = coursier.id;
            nomInput.value   = coursier.nom   || '';
            zoneInput.value  = coursier.zone  || '';
            salInput.value   = coursier.salaire_base || '';
            emInput.value    = coursier.email || '';
            pwdInput.value   = '';  // never pre-fill password
        } else {
            el('modal-coursier-titre').textContent = 'Nouveau coursier';
            idField.value    = '';
            nomInput.value   = '';
            zoneInput.value  = '';
            salInput.value   = '';
            emInput.value    = '';
            pwdInput.value   = '';
        }

        bsModal.show();
    }

    /* ── Save ────────────────────────────────────────────────────────── */
    function sauvegarder() {
        var nomInput  = el('crs-nom');
        var zoneInput = el('crs-zone');
        var salInput  = el('crs-salaire');
        var emInput   = el('crs-email');
        var pwdInput  = el('crs-password');
        var idField   = el('crs-id');

        var nom       = nomInput.value.trim();
        var zone      = zoneInput.value;
        var salaire   = Number(salInput.value);
        var email     = emInput.value.trim();
        var password  = pwdInput.value;
        var isEditing = !!idField.value;
        var valid     = true;

        /* ── Nom ── */
        if (nom.length < 3) {
            setInvalid(nomInput, 'Le nom est requis (minimum 3 caractères).');
            valid = false;
        } else if (!NAME_RE.test(nom)) {
            setInvalid(nomInput, 'Le nom ne peut contenir que des lettres, espaces ou tirets.');
            valid = false;
        } else {
            setValid(nomInput);
        }

        /* ── Zone ── */
        if (!zone) {
            setInvalid(zoneInput, 'Veuillez sélectionner une zone.');
            valid = false;
        } else {
            setValid(zoneInput);
        }

        /* ── Salaire ── */
        if (!salInput.value || isNaN(salaire) || salaire < 1500) {
            setInvalid(salInput, 'Le salaire de base doit être d\'au moins 1 500 DH.');
            valid = false;
        } else {
            setValid(salInput);
        }

        /* ── Email — format + unicité ── */
        if (!email || !isValidEmail(email)) {
            setInvalid(emInput, 'Veuillez saisir une adresse e-mail valide.');
            valid = false;
        } else {
            var existing = DB.getUserByEmail(email);
            /* Allow same email when editing the same user */
            if (existing && existing.id !== idField.value) {
                setInvalid(emInput, 'Cette adresse e-mail est déjà utilisée.');
                valid = false;
            } else {
                setValid(emInput);
            }
        }

        /* ── Mot de passe ── */
        if (!isEditing && !password) {
            /* Required for new courier */
            setInvalid(pwdInput, 'Le mot de passe est requis pour un nouveau coursier (minimum 6 caractères).');
            valid = false;
        } else if (password && password.length < 6) {
            setInvalid(pwdInput, 'Le mot de passe doit contenir au moins 6 caractères.');
            valid = false;
        } else {
            setValid(pwdInput);
        }

        if (!valid) return;

        /* ── Build payload ── */
        var payload = {
            nom:          nom,
            zone:         zone,
            salaire_base: salaire,
            email:        email,
            is_admin:     false
        };

        /* Hash only if a new password was typed */
        if (password) {
            payload.password = DB.hashPassword(password);
        }

        if (isEditing) {
            DB.updateUser(idField.value, payload);
        } else {
            DB.addUser(payload);
        }

        /* Reload state */
        users      = DB.getUsers();
        livraisons = DB.getLivraisons();
        coursiers  = users.filter(function (u) { return !u.is_admin; });

        bsModal.hide();
        afficherCoursiers();
    }

    /* ── Delete ──────────────────────────────────────────────────────── */
    function supprimerCoursier(id) {
        var user = users.find(function (u) { return u.id === id; });
        if (!user) return;

        var nbLivraisons = livraisons.filter(function (l) { return l.courier_id === id; }).length;
        var message =
            'Voulez-vous vraiment supprimer le compte de ' + user.nom + ' ?\n\n' +
            (nbLivraisons > 0
                ? 'Attention : ' + nbLivraisons + ' livraison(s) associée(s) resteront dans la base.'
                : 'Ce coursier n\'a aucune livraison associée.');

        if (!window.confirm(message)) return;

        DB.deleteUser(id);
        users     = DB.getUsers();
        coursiers = users.filter(function (u) { return !u.is_admin; });

        afficherCoursiers();
    }

    /* ── Init ────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {

        /* Admin guard — session.js handles unauthenticated users */
        if (!estAdmin) {
            alert('Accès refusé. Cette page est réservée aux administrateurs.');
            window.location.replace('dashboard.html');
            return;
        }

        /* Load data */
        users      = DB.getUsers();
        livraisons = DB.getLivraisons();
        coursiers  = users.filter(function (u) { return !u.is_admin; });

        /* Bootstrap modal instance */
        bsModal = new bootstrap.Modal(el('modal-coursier'));

        /* Initial render */
        afficherCoursiers();

        /* Wire up buttons */
        el('btn-nouveau-coursier').addEventListener('click', function () { ouvrirModal(null); });
        el('btn-save-coursier').addEventListener('click', sauvegarder);
    });

})();
