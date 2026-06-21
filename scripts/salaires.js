(function () {
    'use strict';

    /* ══════════════════════════════════════════════════════════════════
       Business rule constants — change here to update the entire page
    ══════════════════════════════════════════════════════════════════ */
    var QUOTA          = { A: 10, B: 8 };  // colis par tournée par zone
    var PENALTY_DH     = 10;               // DH par colis manquant
    var BONUS_DH       = 15;               // DH par colis excédentaire
    var FUEL_RATE      = 0.05;             // 5 % appliqué au bonus brut total

    /* ══════════════════════════════════════════════════════════════════
       Module state
    ══════════════════════════════════════════════════════════════════ */
    var users      = [];
    var livraisons = [];
    var coursiers  = [];
    var resultats  = [];   // stored for detail modal access
    var bsModal    = null;

    /* ══════════════════════════════════════════════════════════════════
       Helpers
    ══════════════════════════════════════════════════════════════════ */
    function el(id) { return document.getElementById(id); }

    function round2(n) { return Math.round(n * 100) / 100; }

    function currentYM() {
        var now = new Date();
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }

    /** Parse "YYYY-MM-DD" in local time to avoid UTC day-shift. */
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

    /** "2025-05" → "Mai 2025" */
    function formatMoisFR(ym) {
        var p    = ym.split('-');
        var d    = new Date(+p[0], +p[1] - 1, 1);
        var raw  = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    /* ══════════════════════════════════════════════════════════════════
       Populate courier filter
    ══════════════════════════════════════════════════════════════════ */
    function populerFiltreCoursier() {
        var sel = el('sal-coursier');
        while (sel.options.length > 1) sel.remove(1);

        coursiers.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value       = c.id;
            opt.textContent = c.nom + ' — Zone ' + c.zone;
            sel.appendChild(opt);
        });

        /* Non-admin: lock to their own account */
        if (!estAdmin) {
            sel.value    = userId;
            sel.disabled = true;
        }
    }

    /* ══════════════════════════════════════════════════════════════════
       Core per-courier calculation
       Returns a full result object including a per-day details array.
    ══════════════════════════════════════════════════════════════════ */
    function calculerCoursier(coursier, tournees) {
        var quota          = QUOTA[coursier.zone] || QUOTA.A;
        var totalColis     = 0;
        var totalPenalties = 0;
        var totalRawBonus  = 0;
        var details        = [];

        tournees.forEach(function (l) {
            var colis   = Number(l.nombreColis) || 0;
            var delta   = colis - quota;
            totalColis += colis;

            var detail = {
                date:        l.date,
                colis:       colis,
                quota:       quota,
                delta:       delta,
                type:        delta < 0 ? 'penalty' : (delta > 0 ? 'bonus' : 'exact'),
                penaltyDH:   0,
                rawBonusDH:  0,
                fuelBonusDH: 0
            };

            if (delta < 0) {
                detail.penaltyDH  = Math.abs(delta) * PENALTY_DH;
                totalPenalties   += detail.penaltyDH;
            } else if (delta > 0) {
                detail.rawBonusDH  = delta * BONUS_DH;
                totalRawBonus     += detail.rawBonusDH;
            }

            details.push(detail);
        });

        /* Fuel bonus is 5 % of the raw bonus total — computed once then
           distributed back to each bonus day for the detail table. */
        var totalFuelBonus = round2(totalRawBonus * FUEL_RATE);

        /* Pro-rate fuelBonusDH per day proportional to its rawBonusDH */
        if (totalRawBonus > 0) {
            details.forEach(function (d) {
                if (d.type === 'bonus') {
                    d.fuelBonusDH = round2(d.rawBonusDH * FUEL_RATE);
                }
            });
        }

        var totalBonus   = round2(totalRawBonus + totalFuelBonus);
        totalPenalties   = round2(totalPenalties);
        totalRawBonus    = round2(totalRawBonus);
        var salaireFinal = round2(coursier.salaire_base - totalPenalties + totalBonus);

        return {
            coursierId:       coursier.id,
            nom:              coursier.nom,
            zone:             coursier.zone,
            salaireBase:      Number(coursier.salaire_base),
            joursTravailles:  tournees.length,
            totalColis:       totalColis,
            totalPenalties:   totalPenalties,
            rawBonus:         totalRawBonus,
            fuelBonus:        totalFuelBonus,
            totalBonus:       totalBonus,
            salaireFinal:     salaireFinal,
            details:          details
        };
    }

    /* ══════════════════════════════════════════════════════════════════
       Main calculation — reads filters, computes, displays
    ══════════════════════════════════════════════════════════════════ */
    function calculer() {
        var mois       = el('sal-month').value;
        var coursierId = estAdmin ? el('sal-coursier').value : userId;

        /* Which couriers to process */
        var cibles = coursierId
            ? coursiers.filter(function (c) { return c.id === coursierId; })
            : coursiers;

        /* Livraisons: only "Livré", in selected month */
        resultats = cibles.map(function (c) {
            var tournees = livraisons.filter(function (l) {
                if (l.statut !== 'Livré')                      return false;
                if (l.courier_id !== c.id)                     return false;
                if (mois && (!l.date || l.date.slice(0, 7) !== mois)) return false;
                return true;
            });
            return calculerCoursier(c, tournees);
        });

        afficherResultats(resultats, mois);
    }

    /* ══════════════════════════════════════════════════════════════════
       Display function
    ══════════════════════════════════════════════════════════════════ */
    function afficherResultats(results, mois) {
        var tbody  = el('salaires-body');
        var tfoot  = el('salaires-footer');
        tbody.innerHTML = '';
        tfoot.innerHTML = '';

        if (results.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="10" class="text-center text-muted" style="padding:2.5rem;">' +
                '<i class="bi bi-inbox" style="font-size:1.5rem; display:block; margin-bottom:.5rem;"></i>' +
                'Aucun résultat pour cette sélection.' +
                '</td></tr>';
            return;
        }

        /* ── Totaux pour le footer ── */
        var totaux = { jours: 0, colis: 0, penalties: 0, rawBonus: 0, fuelBonus: 0, salaire: 0, base: 0 };

        results.forEach(function (r) {
            totaux.base       += r.salaireBase;
            totaux.jours      += r.joursTravailles;
            totaux.colis      += r.totalColis;
            totaux.penalties  += r.totalPenalties;
            totaux.rawBonus   += r.rawBonus;
            totaux.fuelBonus  += r.fuelBonus;
            totaux.salaire    += r.salaireFinal;
        });

        /* ── Body rows ── */
        results.forEach(function (r) {
            var zoneClass = r.zone === 'A' ? 'zone-a' : 'zone-b';

            var finalClass = r.salaireFinal > r.salaireBase ? 'amount-bonus'
                           : r.salaireFinal < r.salaireBase ? 'amount-penalty'
                           : '';

            var penCell  = r.totalPenalties > 0
                ? '<span class="amount-penalty">−' + r.totalPenalties.toFixed(2) + '</span>'
                : '<span class="amount-neutral">—</span>';
            var bonCell  = r.rawBonus > 0
                ? '<span class="amount-bonus">+' + r.rawBonus.toFixed(2) + '</span>'
                : '<span class="amount-neutral">—</span>';
            var fuelCell = r.fuelBonus > 0
                ? '<span class="amount-bonus">+' + r.fuelBonus.toFixed(2) + '</span>'
                : '<span class="amount-neutral">—</span>';
            var finalCell =
                '<strong class="' + finalClass + '">' + r.salaireFinal.toFixed(2) + ' DH</strong>';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><strong>' + r.nom + '</strong></td>' +
                '<td><span class="zone-badge ' + zoneClass + '">' + r.zone + '</span></td>' +
                '<td>' + r.salaireBase.toFixed(2) + ' DH</td>' +
                '<td style="text-align:center;">' + r.joursTravailles + '</td>' +
                '<td style="text-align:center;">' + r.totalColis + '</td>' +
                '<td>' + penCell + '</td>' +
                '<td>' + bonCell + '</td>' +
                '<td>' + fuelCell + '</td>' +
                '<td>' + finalCell + '</td>' +
                '<td>' +
                    '<button class="btn btn-sm btn-outline btn-detail" ' +
                    'data-id="' + r.coursierId + '" data-mois="' + (mois || '') + '">' +
                    '<i class="bi bi-eye"></i>' +
                    '</button>' +
                '</td>';
            tbody.appendChild(tr);
        });

        /* Attach detail listeners */
        tbody.querySelectorAll('.btn-detail').forEach(function (btn) {
            btn.addEventListener('click', function () {
                ouvrirDetail(this.dataset.id, this.dataset.mois);
            });
        });

        /* ── Footer — grand totals ── */
        var footFinalClass = totaux.salaire > totaux.base ? 'amount-bonus'
                           : totaux.salaire < totaux.base ? 'amount-penalty' : '';

        tfoot.innerHTML =
            '<tr>' +
            '<td colspan="2">Total général</td>' +
            '<td>' + round2(totaux.base).toFixed(2) + ' DH</td>' +
            '<td style="text-align:center;">' + totaux.jours + '</td>' +
            '<td style="text-align:center;">' + totaux.colis + '</td>' +
            '<td class="amount-penalty">' +
                (totaux.penalties > 0 ? '−' + round2(totaux.penalties).toFixed(2) : '—') +
            '</td>' +
            '<td class="amount-bonus">' +
                (totaux.rawBonus > 0 ? '+' + round2(totaux.rawBonus).toFixed(2) : '—') +
            '</td>' +
            '<td class="amount-bonus">' +
                (totaux.fuelBonus > 0 ? '+' + round2(totaux.fuelBonus).toFixed(2) : '—') +
            '</td>' +
            '<td><span class="' + footFinalClass + '">' + round2(totaux.salaire).toFixed(2) + ' DH</span></td>' +
            '<td></td>' +
            '</tr>';
    }

    /* ══════════════════════════════════════════════════════════════════
       Detail modal — day-by-day breakdown
    ══════════════════════════════════════════════════════════════════ */
    function ouvrirDetail(coursierId, mois) {
        var result = resultats.find(function (r) { return r.coursierId === coursierId; });
        if (!result) return;

        var moisLabel = mois ? formatMoisFR(mois) : 'Toutes périodes';
        el('detail-titre').textContent = 'Détail — ' + result.nom + ' — ' + moisLabel;
        el('detail-body').innerHTML    = construireDetailHTML(result);

        bsModal.show();
    }

    function construireDetailHTML(result) {
        /* ── Day-by-day table rows ── */
        var rows = '';

        if (result.details.length === 0) {
            rows =
                '<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem;">' +
                'Aucune tournée « Livré » pour ce mois.' +
                '</td></tr>';
        } else {
            result.details.forEach(function (d) {
                var rowClass = d.type === 'bonus'   ? 'detail-row-bonus'
                             : d.type === 'penalty' ? 'detail-row-penalty'
                             : '';

                /* Δ column */
                var deltaStr = d.delta === 0 ? '='
                             : d.delta > 0   ? '+' + d.delta
                             : String(d.delta);

                /* "What was applied" text */
                var application;
                if (d.type === 'bonus') {
                    application = 'Bonus : ' + d.delta + ' × ' + BONUS_DH + ' DH' +
                                  ' + prime carburant (' + (FUEL_RATE * 100) + ' %)';
                } else if (d.type === 'penalty') {
                    application = 'Pénalité : ' + Math.abs(d.delta) + ' × ' + PENALTY_DH + ' DH';
                } else {
                    application = 'Quota atteint exactement';
                }

                /* Net DH amount for this day */
                var montantHTML;
                if (d.type === 'bonus') {
                    var dayTotal = round2(d.rawBonusDH + d.fuelBonusDH);
                    montantHTML =
                        '<span class="amount-bonus">+' + dayTotal.toFixed(2) + ' DH</span>';
                } else if (d.type === 'penalty') {
                    montantHTML =
                        '<span class="amount-penalty">−' + d.penaltyDH.toFixed(2) + ' DH</span>';
                } else {
                    montantHTML = '<span class="amount-neutral">—</span>';
                }

                rows +=
                    '<tr class="' + rowClass + '">' +
                    '<td>' + formatDateFR(d.date) + '</td>' +
                    '<td style="text-align:center;"><strong>' + d.colis + '</strong></td>' +
                    '<td style="text-align:center;">' + d.quota + '</td>' +
                    '<td style="text-align:center; font-weight:600;">' + deltaStr + '</td>' +
                    '<td style="font-size:0.875rem; color: var(--gray-700);">' + application + '</td>' +
                    '<td style="text-align:right;">' + montantHTML + '</td>' +
                    '</tr>';
            });
        }

        /* ── Day-by-day table ── */
        var tableHTML =
            '<div class="table-wrapper mb-4">' +
            '<table>' +
            '<thead><tr>' +
            '<th>Date</th>' +
            '<th style="text-align:center;">Colis</th>' +
            '<th style="text-align:center;">Quota</th>' +
            '<th style="text-align:center;">Δ</th>' +
            '<th>Application</th>' +
            '<th style="text-align:right;">Montant</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table>' +
            '</div>';

        /* ── Summary calc box ── */
        var finalClass = result.salaireFinal > result.salaireBase ? 'amount-bonus'
                       : result.salaireFinal < result.salaireBase ? 'amount-penalty'
                       : '';

        var penHTML  = result.totalPenalties > 0
            ? '<span class="amount-penalty">−' + result.totalPenalties.toFixed(2) + ' DH</span>'
            : '<span class="amount-neutral">—</span>';
        var bonHTML  = result.rawBonus > 0
            ? '<span class="amount-bonus">+' + result.rawBonus.toFixed(2) + ' DH</span>'
            : '<span class="amount-neutral">—</span>';
        var fuelHTML = result.fuelBonus > 0
            ? '<span class="amount-bonus">+' + result.fuelBonus.toFixed(2) + ' DH ' +
              '<small style="font-weight:400; opacity:.75;">(5 % × ' +
              result.rawBonus.toFixed(2) + ')</small></span>'
            : '<span class="amount-neutral">—</span>';

        var summaryHTML =
            '<div class="calc-summary">' +
            '<div class="calc-title">Récapitulatif — ' + result.nom + '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Tournées « Livré » ce mois</span>' +
                '<strong>' + result.joursTravailles + '</strong>' +
            '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Total colis livrés</span>' +
                '<strong>' + result.totalColis + '</strong>' +
            '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Salaire de base</span>' +
                '<strong>' + result.salaireBase.toFixed(2) + ' DH</strong>' +
            '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Pénalités</span>' +
                penHTML +
            '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Bonus brut</span>' +
                bonHTML +
            '</div>' +

            '<div class="calc-row">' +
                '<span class="calc-label">Prime carburant (5 % du bonus brut)</span>' +
                fuelHTML +
            '</div>' +

            '<div class="calc-row calc-total">' +
                '<span>Salaire final</span>' +
                '<strong class="' + finalClass + '" style="font-size: 1.375rem;">' +
                result.salaireFinal.toFixed(2) + ' DH' +
                '</strong>' +
            '</div>' +

            '</div>';

        return tableHTML + summaryHTML;
    }

    /* ══════════════════════════════════════════════════════════════════
       Init
    ══════════════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {

        /* Load data synchronously */
        users      = DB.getUsers();
        livraisons = DB.getLivraisons();
        coursiers  = users.filter(function (u) { return !u.is_admin; });

        /* Bootstrap modal instance */
        bsModal = new bootstrap.Modal(el('modal-detail'));

        /* Populate filter and default month */
        populerFiltreCoursier();
        el('sal-month').value = currentYM();

        /* Run calculation immediately on page load */
        calculer();

        /* Wire up Calculer button */
        el('btn-calculer').addEventListener('click', calculer);
    });

})();
