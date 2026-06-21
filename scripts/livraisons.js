(function () {
    'use strict';

    /* ── Badge CSS classes per statut ────────────────────────────────── */
    var BADGE_CLASS = {
        'Livré':      'status-badge status-livre',
        'En attente': 'status-badge status-attente',
        'Retourné':   'status-badge status-retourne'
    };

    /* ── Module state ────────────────────────────────────────────────── */
    var users      = [];
    var livraisons = [];
    var coursiers  = [];   // non-admin users only
    var bsModal    = null;

    /* ── Helpers ─────────────────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }

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

    /** Parse "YYYY-MM-DD" without timezone shift. */
    function parseDate(str) {
        var p = str.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]);
    }

    function formatDateFR(str) {
        if (!str) return '—';
        return parseDate(str).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function getCoursierNom(id) {
        var u = users.find(function (u) { return u.id === id; });
        return u ? u.nom : '—';
    }

    function currentYM() {
        var now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }

    /* ── Dropdown population ─────────────────────────────────────────── */
    function populerCoursiers() {
        var filterSel = el('filter-coursier');
        var modalSel  = el('livraison-coursier');

        /* Keep the "Tous" placeholder in the filter dropdown */
        while (filterSel.options.length > 1) filterSel.remove(1);
        /* Keep the disabled placeholder in the modal dropdown */
        while (modalSel.options.length > 1) modalSel.remove(1);

        coursiers.forEach(function (c) {
            var label = c.nom + ' — Zone ' + c.zone;

            var of = document.createElement('option');
            of.value = c.id;
            of.textContent = label;
            filterSel.appendChild(of);

            var om = document.createElement('option');
            om.value = c.id;
            om.textContent = label;
            modalSel.appendChild(om);
        });
    }

    /* ── Filter & render ─────────────────────────────────────────────── */
    function appliquerFiltres() {
        var mois       = el('filter-month').value;              // "YYYY-MM" | ""
        var coursierId = estAdmin ? el('filter-coursier').value : userId;
        var statut     = el('filter-statut').value;

        var filtered = livraisons.filter(function (l) {
            /* Month filter: compare YYYY-MM prefix of stored date */
            if (mois && (!l.date || l.date.slice(0, 7) !== mois)) return false;
            /* Courier filter: admin uses dropdown; non-admin always filters to self */
            if (coursierId && l.courier_id !== coursierId) return false;
            /* Status filter */
            if (statut && l.statut !== statut) return false;
            return true;
        });

        afficherLivraisons(filtered);
    }

    function reinitialiserFiltres() {
        el('filter-month').value = currentYM();
        if (estAdmin) el('filter-coursier').value = '';
        el('filter-statut').value = '';
        appliquerFiltres();
    }

    /* ── Table rendering ─────────────────────────────────────────────── */
    function afficherLivraisons(data) {
        var tbody   = el('livraisons-body');
        var colSpan = estAdmin ? 6 : 5;
        tbody.innerHTML = '';

        if (data.length === 0) {
            var empty = document.createElement('tr');
            empty.innerHTML =
                '<td colspan="' + colSpan + '" ' +
                'class="text-center text-muted" style="padding: 2.5rem;">' +
                '<i class="bi bi-inbox" style="font-size:1.5rem; display:block; margin-bottom:.5rem;"></i>' +
                'Aucune livraison trouvée.' +
                '</td>';
            tbody.appendChild(empty);
            return;
        }

        data.forEach(function (l) {
            var badge = BADGE_CLASS[l.statut] || 'status-badge';
            var actions = '';
            if (estAdmin) {
                actions =
                    '<td>' +
                    '<button class="btn btn-sm btn-secondary me-1 btn-edit" ' +
                    'data-id="' + l.id + '" title="Modifier">' +
                    '<i class="bi bi-pencil"></i></button>' +
                    '<button class="btn btn-sm btn-danger btn-delete" ' +
                    'data-id="' + l.id + '" title="Supprimer">' +
                    '<i class="bi bi-trash"></i></button>' +
                    '</td>';
            }

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><span class="text-muted" style="font-size:0.78rem; font-family:monospace;">' +
                l.id + '</span></td>' +
                '<td>' + getCoursierNom(l.courier_id) + '</td>' +
                '<td>' + formatDateFR(l.date) + '</td>' +
                '<td><strong>' + l.nombreColis + '</strong></td>' +
                '<td><span class="' + badge + '">' + l.statut + '</span></td>' +
                actions;

            tbody.appendChild(tr);
        });

        /* Attach edit / delete handlers */
        tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var record = DB.getLivraisonById(this.dataset.id);
                if (record) ouvrirModal(record);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                supprimerLivraison(this.dataset.id);
            });
        });
    }

    /* ── Modal ───────────────────────────────────────────────────────── */
    /**
     * ouvrirModal()            → mode ajout  (champs vides)
     * ouvrirModal(livraison)   → mode édition (champs pré-remplis)
     */
    function ouvrirModal(livraison) {
        var coursierSel = el('livraison-coursier');
        var dateInput   = el('livraison-date');
        var colisInput  = el('livraison-colis');
        var statutSel   = el('livraison-statut');
        var idField     = el('livraison-id');

        resetValidation([coursierSel, dateInput, colisInput]);

        if (livraison) {
            /* ── Mode édition ── */
            el('modal-titre').textContent = 'Modifier la livraison';
            idField.value      = livraison.id;
            dateInput.value    = livraison.date   || '';
            colisInput.value   = livraison.nombreColis !== undefined ? livraison.nombreColis : '';
            statutSel.value    = livraison.statut || 'Livré';
            /* Courier: admins can change it; non-admins are locked to self */
            if (!coursierSel.disabled) coursierSel.value = livraison.courier_id || '';
        } else {
            /* ── Mode ajout ── */
            el('modal-titre').textContent = 'Nouvelle livraison';
            idField.value    = '';
            dateInput.value  = '';
            colisInput.value = '';
            statutSel.value  = 'Livré';
            if (!coursierSel.disabled) coursierSel.value = '';
        }

        bsModal.show();
    }

    /* ── Save ────────────────────────────────────────────────────────── */
    function sauvegarder() {
        var coursierSel = el('livraison-coursier');
        var dateInput   = el('livraison-date');
        var colisInput  = el('livraison-colis');
        var idField     = el('livraison-id');

        /* For non-admins the select is disabled; fall back to own userId */
        var coursierId = estAdmin ? coursierSel.value : userId;
        var dateVal    = dateInput.value.trim();
        var colisVal   = colisInput.value;
        var colisNum   = Number(colisVal);
        var valid      = true;

        /* ── Validation ── */
        if (!coursierId) {
            setInvalid(coursierSel, 'Veuillez sélectionner un coursier.');
            valid = false;
        } else {
            setValid(coursierSel);
        }

        if (!dateVal) {
            setInvalid(dateInput, 'La date est requise.');
            valid = false;
        } else {
            setValid(dateInput);
        }

        if (colisVal === '' || isNaN(colisNum) || colisNum < 0) {
            setInvalid(colisInput, 'Le nombre de colis est requis (minimum 0).');
            valid = false;
        } else {
            setValid(colisInput);
        }

        if (!valid) return;

        /* ── Persist ── */
        var payload = {
            courier_id:  coursierId,
            date:        dateVal,
            nombreColis: colisNum,
            statut:      el('livraison-statut').value
        };

        if (idField.value) {
            DB.updateLivraison(idField.value, payload);
        } else {
            DB.addLivraison(payload);
        }

        /* Reload from localStorage so the array reflects the change */
        livraisons = DB.getLivraisons();

        bsModal.hide();
        appliquerFiltres();
    }

    /* ── Delete ──────────────────────────────────────────────────────── */
    function supprimerLivraison(id) {
        var record    = DB.getLivraisonById(id);
        var nomInfo   = record
            ? getCoursierNom(record.courier_id) + ' le ' + formatDateFR(record.date)
            : '';
        var message   = nomInfo
            ? 'Voulez-vous vraiment supprimer la livraison de ' + nomInfo + ' ?'
            : 'Voulez-vous vraiment supprimer cette livraison ?';

        if (!window.confirm(message)) return;

        DB.deleteLivraison(id);
        livraisons = DB.getLivraisons();
        appliquerFiltres();
    }

    /* ── Init ────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {

        /* Load data synchronously from localStorage */
        users      = DB.getUsers();
        livraisons = DB.getLivraisons();
        coursiers  = users.filter(function (u) { return !u.is_admin; });

        /* Bootstrap modal instance */
        bsModal = new bootstrap.Modal(el('modal-livraison'));

        /* Populate both courier dropdowns */
        populerCoursiers();

        /* Default month filter to current month */
        el('filter-month').value = currentYM();

        /* Non-admin: lock both courier selects to own account */
        if (!estAdmin) {
            /* Filter dropdown is already hidden by session.js (admin-seulement)
               but lock the value in case it becomes visible */
            el('filter-coursier').value    = userId;
            el('filter-coursier').disabled = true;

            /* Modal courier: visible but disabled and pre-selected */
            el('livraison-coursier').value    = userId;
            el('livraison-coursier').disabled = true;
        }

        /* Initial render — current month, all couriers, all statuts */
        appliquerFiltres();

        /* Wire up buttons */
        el('btn-filter').addEventListener('click',  appliquerFiltres);
        el('btn-reset').addEventListener('click',   reinitialiserFiltres);
        el('btn-save').addEventListener('click',    sauvegarder);

        /* "Nouvelle livraison" button — admin-seulement in HTML */
        var btnNouvelle = el('btn-nouvelle');
        if (btnNouvelle) {
            btnNouvelle.addEventListener('click', function () { ouvrirModal(); });
        }
    });

})();
