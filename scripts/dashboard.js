(function () {
    'use strict';

    /* ── Business rule constants ──────────────────────────────────────── */
    var QUOTA        = { A: 10, B: 8 };   // colis/tournée par zone
    var PENALTY_DH   = 10;                 // DH par colis manquant
    var BONUS_DH     = 15;                 // DH par colis excédentaire
    var FUEL_PCT     = 0.05;              // 5 % de prime carburant sur le gain brut

    /* ── Helpers ──────────────────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }

    /** Round to two decimal places without floating-point drift */
    function round2(n) { return Math.round(n * 100) / 100; }

    /**
     * Format an amount for display in a table cell.
     * prefix: '+' or '-', cssClass from styles.css utility classes.
     * Returns '—' (with neutral class) when amount is 0.
     */
    function formatAmount(amount, prefix, cssClass) {
        if (amount === 0) {
            return '<span class="amount-neutral">—</span>';
        }
        return (
            '<span class="' + cssClass + '">' +
            prefix + amount.toFixed(2) + ' DH' +
            '</span>'
        );
    }

    /** Medal emoji for top 3 ranks, plain number after that */
    function rankLabel(n) {
        return ['🥇', '🥈', '🥉'][n - 1] || String(n);
    }

    /* ── Main ─────────────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {

        /* ── 1. Resolve current month ──────────────────────────────────
           All date comparisons use the year+month extracted directly
           from the ISO date string ("2025-05-02") to avoid timezone
           issues with new Date().
        ───────────────────────────────────────────────────────────────── */
        var now       = new Date();
        var curYear   = now.getFullYear();
        var curMonth  = now.getMonth() + 1;       // 1-based to match "YYYY-MM"
        var curYM     = curYear + '-' + String(curMonth).padStart(2, '0');

        /* French month label — "Juin 2026" */
        var rawLabel  = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        var monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
        el('current-month').textContent = '— ' + monthLabel;

        /* ── 2. Load data from localStorage (synchronous) ──────────── */
        var users      = DB.getUsers();
        var livraisons = DB.getLivraisons();

        /* ── 3. Split users ─────────────────────────────────────────── */
        var coursiers  = users.filter(function (u) { return !u.is_admin; });

        /* ── 4. Filter livraisons to the current month ──────────────── */
        var livraisonsMois = livraisons.filter(function (l) {
            /* Compare "YYYY-MM" prefix of the stored date string */
            return l.date && l.date.slice(0, 7) === curYM;
        });

        /* ── 5. Compute statistics ──────────────────────────────────── */

        /* Stat 1 — Nombre de coursiers */
        el('stat-coursiers').textContent = coursiers.length;

        /* Stat 2 — Tournées réussies (statut "Livré" ce mois) */
        var livrees = livraisonsMois.filter(function (l) {
            return l.statut === 'Livré';
        });
        el('stat-livraisons').textContent = livrees.length;

        /* Stat 3 — Taux de réussite */
        var taux = livraisonsMois.length > 0
            ? Math.round((livrees.length / livraisonsMois.length) * 100)
            : 0;
        el('stat-taux').textContent = taux + ' %';

        /* Stat 4 — Anomalies (Retourné + En attente) */
        var anomalies = livraisonsMois.filter(function (l) {
            return l.statut === 'Retourné' || l.statut === 'En attente';
        });
        el('stat-anomalies').textContent = anomalies.length;

        /* ── 6. Build ranking ───────────────────────────────────────── */
        var ranking = coursiers.map(function (coursier) {

            var quota = QUOTA[coursier.zone] || QUOTA.A;

            /* Only "Livré" records count toward performance */
            var tournees = livraisonsMois.filter(function (l) {
                return l.courier_id === coursier.id && l.statut === 'Livré';
            });

            var totalColis   = 0;
            var totalPenalty = 0;
            var totalBonus   = 0;

            tournees.forEach(function (l) {
                var colis = Number(l.nombreColis) || 0;
                totalColis += colis;

                var diff = colis - quota;

                if (diff < 0) {
                    /* Below quota — penalty */
                    totalPenalty += Math.abs(diff) * PENALTY_DH;
                } else if (diff > 0) {
                    /* Above quota — bonus + 5 % fuel bonus on raw gain */
                    var rawGain   = diff * BONUS_DH;
                    totalBonus   += rawGain + rawGain * FUEL_PCT;
                }
                /* diff === 0 → exactly at quota, no effect */
            });

            totalBonus   = round2(totalBonus);
            totalPenalty = round2(totalPenalty);

            /* Performance badge — penalty takes priority */
            var badge;
            if (totalPenalty > 0) {
                badge = 'En dessous';
            } else if (totalBonus > 0) {
                badge = 'Excellent';
            } else {
                badge = 'Dans les normes';
            }

            return {
                nom:     coursier.nom,
                zone:    coursier.zone || '—',
                colis:   totalColis,
                penalty: totalPenalty,
                bonus:   totalBonus,
                badge:   badge
            };
        });

        /* Sort by packages delivered — highest first */
        ranking.sort(function (a, b) { return b.colis - a.colis; });

        /* ── 7. Render ranking table ─────────────────────────────────── */
        var tbody = el('ranking-body');
        tbody.innerHTML = '';

        if (ranking.length === 0) {
            var empty = document.createElement('tr');
            empty.innerHTML =
                '<td colspan="7" class="text-center text-muted" style="padding:2rem;">' +
                'Aucun coursier enregistré.' +
                '</td>';
            tbody.appendChild(empty);
            return;
        }

        ranking.forEach(function (entry, index) {
            var rang = index + 1;

            /* Zone badge */
            var zoneClass  = entry.zone === 'A' ? 'zone-a' : 'zone-b';
            var zoneBadge  =
                '<span class="zone-badge ' + zoneClass + '">' +
                entry.zone +
                '</span>';

            /* Performance badge */
            var badgeClass;
            if (entry.badge === 'Excellent') {
                badgeClass = 'status-badge status-livre';
            } else if (entry.badge === 'Dans les normes') {
                badgeClass = 'status-badge badge-normes';
            } else {
                badgeClass = 'status-badge status-retourne';
            }
            var perfBadge =
                '<span class="' + badgeClass + '">' + entry.badge + '</span>';

            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td><strong>' + rankLabel(rang) + '</strong></td>' +
                '<td>' + entry.nom + '</td>' +
                '<td>' + zoneBadge + '</td>' +
                '<td><strong>' + entry.colis + '</strong></td>' +
                '<td>' + formatAmount(entry.penalty, '-', 'amount-penalty') + '</td>' +
                '<td>' + formatAmount(entry.bonus,   '+', 'amount-bonus')   + '</td>' +
                '<td>' + perfBadge + '</td>';

            tbody.appendChild(tr);
        });
    });

})();
