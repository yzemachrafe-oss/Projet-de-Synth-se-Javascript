/**
 * ColisTrack — localStorage-backed fake database.
 * Drop this script before any page script; it exposes window.DB globally.
 */
(function () {
  /* ------------------------------------------------------------------ */
  /* Synchronous SHA-256 (public-domain compact implementation)           */
  /* ------------------------------------------------------------------ */
  function sha256(str) {
    function ror(v, n) {
      return (v >>> n) | (v << (32 - n));
    }

    var pow = Math.pow,
      maxWord = pow(2, 32);
    var result = "",
      words = [],
      bitLen = str.length * 8;
    var H = [],
      K = [],
      primes = 0,
      composite = {};

    for (var c = 2; primes < 64; c++) {
      if (!composite[c]) {
        for (var m = 0; m < 313; m += c) composite[m] = c;
        H[primes] = (pow(c, 0.5) * maxWord) | 0;
        K[primes++] = (pow(c, 1 / 3) * maxWord) | 0;
      }
    }

    str += "\x80";
    while (str.length % 64 !== 56) str += "\x00";

    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      words[i >> 2] = (words[i >> 2] || 0) | (ch << ((3 - (i % 4)) * 8));
    }
    words[words.length] = (bitLen / maxWord) | 0;
    words[words.length] = bitLen;

    for (var j = 0; j < words.length; ) {
      var w = words.slice(j, (j += 16));
      var oldH = H.slice(0, 8);

      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15] | 0,
          w2 = w[i - 2] | 0;
        var a = H[0],
          e = H[4];
        var s0 = ror(w15, 7) ^ ror(w15, 18) ^ (w15 >>> 3);
        var s1 = ror(w2, 17) ^ ror(w2, 19) ^ (w2 >>> 10);
        w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch2 = (e & H[5]) ^ (~e & H[6]);
        var temp1 = (H[7] + S1 + ch2 + K[i] + w[i]) | 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]);
        var temp2 = (S0 + maj) | 0;

        H = [
          (temp1 + temp2) | 0,
          a,
          H[1],
          H[2],
          (H[4] + temp1) | 0,
          e,
          H[5],
          H[6],
        ];
      }

      H = H.map(function (v, i) {
        return (v + oldH[i]) | 0;
      });
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        var b = (H[i] >> (j * 8)) & 0xff;
        result += (b < 16 ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  /* ------------------------------------------------------------------ */
  /* Seed data                                                            */
  /* ------------------------------------------------------------------ */
  var SEED_USERS = [
    {
      id: "u1",
      nom: "Achraf Yzem",
      email: "achraf@colistrack.ma",
      password: "Achraf123",
      is_admin: true,
      salaire_base: 4500,
      zone: null,
    },
    {
      id: "u2",
      nom: "Youssef Alaoui",
      email: "youssef@colistrack.ma",
      password: "100900",
      is_admin: false,
      salaire_base: 2800,
      zone: "A",
    },
    {
      id: "u3",
      nom: "Fatima Zahra Mansouri",
      email: "fatima@colistrack.ma",
      password: "100900",
      is_admin: false,
      salaire_base: 2600,
      zone: "B",
    },
    {
      id: "u4",
      nom: "Karim Tazi",
      email: "karim@colistrack.ma",
      password: "100900",
      is_admin: false,
      salaire_base: 2950,
      zone: "A",
    },
  ];

  /*
   * Livraisons spread across May 2025.
   * nombreColis intentionally spans below / at / above the 10-colis quota
   * so that salary bonus/penalty calculations are non-trivial.
   * Statuts: 'Livré' | 'En attente' | 'Retourné'
   */
  var SEED_LIVRAISONS = [
    {
      id: "l01",
      courier_id: "u2",
      date: "2025-05-02",
      nombreColis: 8,
      statut: "Livré",
    },
    {
      id: "l02",
      courier_id: "u3",
      date: "2025-05-03",
      nombreColis: 5,
      statut: "Livré",
    },
    {
      id: "l03",
      courier_id: "u4",
      date: "2025-05-05",
      nombreColis: 14,
      statut: "Livré",
    },
    {
      id: "l04",
      courier_id: "u2",
      date: "2025-05-07",
      nombreColis: 3,
      statut: "Retourné",
    },
    {
      id: "l05",
      courier_id: "u3",
      date: "2025-05-09",
      nombreColis: 15,
      statut: "Livré",
    },
    {
      id: "l06",
      courier_id: "u4",
      date: "2025-05-10",
      nombreColis: 7,
      statut: "En attente",
    },
    {
      id: "l07",
      courier_id: "u2",
      date: "2025-05-12",
      nombreColis: 10,
      statut: "Livré",
    },
    {
      id: "l08",
      courier_id: "u3",
      date: "2025-05-14",
      nombreColis: 4,
      statut: "Retourné",
    },
    {
      id: "l09",
      courier_id: "u4",
      date: "2025-05-16",
      nombreColis: 13,
      statut: "Livré",
    },
    {
      id: "l10",
      courier_id: "u2",
      date: "2025-05-19",
      nombreColis: 6,
      statut: "En attente",
    },
    {
      id: "l11",
      courier_id: "u3",
      date: "2025-05-22",
      nombreColis: 11,
      statut: "Livré",
    },
    {
      id: "l12",
      courier_id: "u4",
      date: "2025-05-26",
      nombreColis: 9,
      statut: "Livré",
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Storage helpers                                                      */
  /* ------------------------------------------------------------------ */
  var KEYS = {
    users: "colistrack_users",
    livraisons: "colistrack_livraisons",
  };

  function read(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }

  function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function shortId(prefix) {
    return (
      (prefix || "x") +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 5)
    );
  }

  function seed() {
    write(KEYS.users, SEED_USERS);
    write(KEYS.livraisons, SEED_LIVRAISONS);
  }

  /* First-load check -------------------------------------------------- */
  if (!localStorage.getItem(KEYS.users)) {
    seed();
  }

  /* ------------------------------------------------------------------ */
  /* Public DB object                                                     */
  /* ------------------------------------------------------------------ */
  window.DB = {
    /* ---- Users ---------------------------------------------------- */

    getUsers: function () {
      return read(KEYS.users);
    },

    getUserById: function (id) {
      return (
        this.getUsers().find(function (u) {
          return u.id === id;
        }) || null
      );
    },

    getUserByEmail: function (email) {
      return (
        this.getUsers().find(function (u) {
          return u.email === email;
        }) || null
      );
    },

    addUser: function (obj) {
      var users = this.getUsers();
      var newUser = Object.assign({ id: shortId("u") }, obj);
      users.push(newUser);
      write(KEYS.users, users);
      return newUser;
    },

    updateUser: function (id, changes) {
      var users = this.getUsers();
      var idx = users.findIndex(function (u) {
        return u.id === id;
      });
      if (idx === -1) return null;
      users[idx] = Object.assign({}, users[idx], changes);
      write(KEYS.users, users);
      return users[idx];
    },

    deleteUser: function (id) {
      write(
        KEYS.users,
        this.getUsers().filter(function (u) {
          return u.id !== id;
        }),
      );
    },

    /* ---- Livraisons ----------------------------------------------- */

    getLivraisons: function () {
      return read(KEYS.livraisons);
    },

    getLivraisonById: function (id) {
      return (
        this.getLivraisons().find(function (l) {
          return l.id === id;
        }) || null
      );
    },

    addLivraison: function (obj) {
      var livraisons = this.getLivraisons();
      var newL = Object.assign({ id: shortId("l") }, obj);
      livraisons.push(newL);
      write(KEYS.livraisons, livraisons);
      return newL;
    },

    updateLivraison: function (id, changes) {
      var livraisons = this.getLivraisons();
      var idx = livraisons.findIndex(function (l) {
        return l.id === id;
      });
      if (idx === -1) return null;
      livraisons[idx] = Object.assign({}, livraisons[idx], changes);
      write(KEYS.livraisons, livraisons);
      return livraisons[idx];
    },

    deleteLivraison: function (id) {
      write(
        KEYS.livraisons,
        this.getLivraisons().filter(function (l) {
          return l.id !== id;
        }),
      );
    },

    /* ---- Utilities ------------------------------------------------- */

    /**
     * Wipes both localStorage keys and re-seeds from scratch.
     * Useful for dev / testing.
     */
    reset: function () {
      localStorage.removeItem(KEYS.users);
      localStorage.removeItem(KEYS.livraisons);
      seed();
    },

    /**
     * Synchronous SHA-256 helper exposed so login pages can hash
     * a typed password and compare it against stored hashes.
     * Usage: DB.hashPassword('100900') === user.password
     */
    hashPassword: sha256,
  };
})();
