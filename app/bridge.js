// Pont de la version web (Safari) : remplace l'application Android autour du même moteur.
// Le moteur Go tourne en WebAssembly (engine.wasm) ; ce fichier fait ce que MainActivity fait sous Android :
// connexion Google, comptes mémorisés, clé d'appareil du support, droits administrateur.
(function () {
  "use strict";
  var CLIENT_ID = "1089498165864-np3qt374o6fsrv46l831rlar9e6luo0r.apps.googleusercontent.com";
  var VERSION = "1.0.0";
  var store = {
    get: function (k) { try { return localStorage.getItem("urb4n." + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("urb4n." + k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("urb4n." + k); } catch (e) {} }
  };
  var account = store.get("selectedAccount") || "";
  var registryAdmin = false;
  var engine = null;
  var cfgKey = function () { return "config:" + account; };
  var cfg = function () { return store.get(cfgKey()) || "{}"; };
  var hasSession = function () { try { return (JSON.parse(cfg()).server_token || "").length === 64; } catch (e) { return false; } };
  var registered = function () { return !!account && store.get("registryChoice:" + account) === "registered"; };

  var ready = (async function () {
    var go = new Go();
    var r = await WebAssembly.instantiateStreaming(fetch("engine.wasm"), go.importObject);
    go.run(r.instance);
    engine = window.urb4nEngine;
    engine.setVersion(VERSION);
    // Cache local (modifications en attente hors ligne) : un par compte, dans le navigateur.
    engine.setCache(function () { return account ? (store.get("cache:" + account) || "") : ""; },
      function (json) { if (account) { if (json) store.set("cache:" + account, json); else store.del("cache:" + account); } });
    engine.setSaver(function (json) { if (account) store.set(cfgKey(), json); });
  })();

  function deliver(id, obj) {
    obj.app_version = VERSION;
    obj.registry_choice = account ? (store.get("registryChoice:" + account) || "") : "";
    obj.registry_admin = registryAdmin;
    obj.user_name = account ? (store.get("userName:" + account) || "") : "";
    obj.resume_available = !!account;
    window.urb4nReceive(id, JSON.stringify(obj));
  }
  var parse = function (s) { try { return JSON.parse(s); } catch (e) { return { ok: false, error: "Réponse invalide" }; } };

  // Connexion Google (identité seule) : bouton officiel Google Identity Services dans une fenêtre.
  var gsiLoaded = null;
  function loadGsi() {
    if (gsiLoaded) return gsiLoaded;
    gsiLoaded = new Promise(function (ok, ko) {
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = ok; s.onerror = function () { gsiLoaded = null; ko(new Error("Google indisponible")); };
      document.head.appendChild(s);
    });
    return gsiLoaded;
  }
  function askGoogle() {
    return new Promise(function (resolve, reject) {
      loadGsi().then(function () {
        var d = document.createElement("dialog");
        d.className = "gsi-dialog";
        d.innerHTML = '<p class="eyebrow">URB4N APP</p><h2>Connexion avec Google</h2><p>Google sert uniquement à t’identifier : aucun mot de passe n’est conservé.</p><div id="gsi-button" style="display:flex;justify-content:center;min-height:44px"></div><p></p><button type="button" class="secondary full" id="gsi-cancel">Annuler</button>';
        document.body.appendChild(d);
        var done = false;
        var close = function () { try { d.close(); } catch (e) {} d.remove(); };
        d.querySelector("#gsi-cancel").onclick = function () { if (!done) { done = true; close(); reject(new Error("Connexion Google annulée")); } };
        d.addEventListener("cancel", function (ev) { ev.preventDefault(); d.querySelector("#gsi-cancel").click(); });
        google.accounts.id.initialize({
          client_id: CLIENT_ID, ux_mode: "popup", auto_select: false, use_fedcm_for_prompt: false,
          callback: function (resp) {
            if (done) return; done = true; close();
            if (resp && resp.credential) resolve(resp.credential); else reject(new Error("Connexion Google refusée"));
          }
        });
        google.accounts.id.renderButton(d.querySelector("#gsi-button"), { theme: "filled_black", size: "large", text: "signin_with", shape: "pill", locale: "fr", width: 260 });
        d.showModal();
      }, reject);
    });
  }
  function emailOf(proof) {
    var p = proof.split(".");
    if (p.length !== 3) throw new Error("bad");
    var b = p[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    var claims = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!claims.email) throw new Error("bad");
    return claims.email;
  }
  async function signIn() {
    var proof = await askGoogle();
    var email;
    try { email = emailOf(proof); } catch (e) { throw new Error("La connexion Google n’a pas pu être vérifiée"); }
    account = email;
    store.set("selectedAccount", email);
    store.set("registryChoice:" + email, "registered"); // le compte est créé à la première connexion
    return proof;
  }

  function deviceKey() {
    var k = store.get("supportDevice") || "";
    if (!/^[a-f0-9]{32}$/.test(k)) {
      var raw = new Uint8Array(16); crypto.getRandomValues(raw);
      k = Array.prototype.map.call(raw, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      store.set("supportDevice", k);
    }
    return k;
  }
  var bugKey = function () { return "bugIds:" + account; };
  function rememberBug(id) {
    if (!/^[a-f0-9]{32}$/.test(id)) return;
    var all = (store.get(bugKey()) || "").split(",").filter(function (s) { return /^[a-f0-9]{32}$/.test(s) && s !== id; });
    all.push(id);
    store.set(bugKey(), all.slice(-50).join(","));
  }

  async function authorized(proof, command, payload) {
    var c = parse(await engine.configure(proof, cfg()));
    if (!c.ok) return c;
    return parse(await engine.call(command === "connect" || command === "resume" ? "refresh" : command, payload));
  }

  async function handle(command, payload) {
    var args = {}; try { args = JSON.parse(payload || "{}"); } catch (e) {}
    if (command.indexOf("update") === 0) return { ok: false, error: "Sur le web, la version est toujours à jour : rien à installer." };
    if (command === "exit") return { ok: true };
    if (command === "importDrive") return { ok: false, error: "La reprise de Google Drive se fait depuis l’application Android ou Windows." };
    if (command.indexOf("registry") === 0) {
      if (!account) return { ok: false, error: "Connecte-toi d’abord avec Google" };
      if (hasSession() && (command === "registryRole" || command === "registryList" || command === "registryName")) {
        await engine.configure("", cfg());
        var r = parse(await engine.registry("", command, payload));
        if (r.ok && "admin" in r) registryAdmin = !!r.admin;
        return r;
      }
      if (command === "registryRegister") { var p0 = await signIn(); return authorized(p0, command, payload); }
      if (command === "registryDecline") return { ok: false, error: "Inscription requise. Tu peux te déconnecter sans inscrire ton adresse." };
      if ((command === "registryRegister" || command === "registryWithdraw") && !args.consent) return { ok: false, error: "Ton accord explicite est nécessaire" };
      if (command === "registryName" && store.get("registryChoice:" + account) !== "registered") return { ok: false, error: "Inscris d’abord ton compte pour ajouter un nom" };
      var proof = await askGoogle();
      var mail; try { mail = emailOf(proof); } catch (e) { return { ok: false, error: "La preuve Google n’a pas pu être vérifiée" }; }
      if (mail.toLowerCase() !== account.toLowerCase()) return { ok: false, error: "Choisis le même compte Google que celui connecté" };
      var rr = parse(await engine.registry(proof, command, payload));
      if (rr.ok) {
        if ("admin" in rr) registryAdmin = !!rr.admin;
        if (command === "registryWithdraw") { store.set("registryChoice:" + account, "withdrawn"); store.set("userName:" + account, ""); }
        if (command === "registryName") store.set("userName:" + account, rr.name || "");
      }
      return rr;
    }
    if (command === "connect") { var p1 = await signIn(); return authorized(p1, command, payload); }
    if (!registered()) {
      var open = { snapshot: 1, resume: 1, disconnect: 1, bug: 1, bugsMine: 1, ticketThread: 1, ticketSay: 1 };
      if (!open[command]) return { ok: false, error: "Inscris ton compte Google pour accéder au suivi" };
    }
    if (command.indexOf("admin") === 0) {
      if (!registryAdmin) return { ok: false, error: "Accès éditeur requis" };
      await engine.configure("", cfg());
      return parse(await engine.call(command, payload));
    }
    var direct = { snapshot: 1, announcement: 1, fuel: 1, disconnect: 1, bug: 1, bugsMine: 1, ticketThread: 1, ticketSay: 1 };
    if (direct[command]) {
      if (command.indexOf("ticket") === 0 && !/^[a-f0-9]{32}$/.test(args.id || "")) return { ok: false, error: "Ticket introuvable" };
      if (command === "bugsMine") args.ids = store.get(bugKey()) || "";
      args.device = deviceKey();
      var reply = parse(await engine.call(command, JSON.stringify(args)));
      if (command === "bug" && reply.ok && reply.bug_id) rememberBug(reply.bug_id);
      if (command === "disconnect" && reply.ok) {
        registryAdmin = false;
        store.del(cfgKey()); store.del("selectedAccount"); account = "";
        try { google.accounts.id.disableAutoSelect(); } catch (e) {}
      }
      return reply;
    }
    if (!account) return { ok: false, error: "Clique sur Connexion Google pour te connecter" };
    if (hasSession()) return authorized("", command, payload);
    var p2 = await signIn();
    return authorized(p2, command, payload);
  }

  window.Urb4nNative = {
    request: function (id, command, payload) {
      ready.then(function () { return handle(command, payload); })
        .then(function (obj) { deliver(id, obj); })
        .catch(function (e) { deliver(id, { ok: false, error: (e && e.message) || "Opération impossible" }); });
    }
  };
})();
