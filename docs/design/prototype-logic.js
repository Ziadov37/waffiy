
class Component extends DCLogic {
  state = {
    role: 'client', appScreen: 'welcome',
    cScreen: 'home', mScreen: 'home', cardIdx: 0,
    overlay: null, busy: false, push: null,
    selProg: 'burger', cProg: 'burger',
    stamps: { burger: 8, pizza: 3, boisson: 0 },
    programs: [
      { id: 'burger', name: 'Burger gratuit', emoji: '🍔', threshold: 10, desc: 'Burger classique au choix', members: 248, status: 'Actif' },
      { id: 'pizza', name: 'Pizza offerte', emoji: '🍕', threshold: 5, desc: 'Pizza medium au choix', members: 96, status: 'Actif' },
      { id: 'boisson', name: 'Boisson offerte', emoji: '🥤', threshold: 8, desc: 'Boisson 33 cl au choix', members: 0, status: 'Brouillon' }
    ],
    cards: [
      { id: 'bh', name: 'Burger House', emoji: '🍔', stamps: 8, threshold: 10, reward: 'Burger gratuit', surface: '#FDEEE3', border: '#F6DCC8' },
      { id: 'cl', name: 'Coffee Lab', emoji: '☕', stamps: 4, threshold: 6, reward: 'Café offert', surface: '#EDF1FA', border: '#DCE3F2' },
      { id: 'bs', name: 'Beauty Studio', emoji: '💇', stamps: 2, threshold: 8, reward: 'Soin offert', surface: '#F3EDFA', border: '#E4DAF2' }
    ],
    totalVisits: 23, rewardsUsed: 2, lastVisit: '12 septembre 2026', lastVisitShort: '12 sept',
    notifs: [
      { icon: '⭐', title: '+1 visite', body: 'Burger House vient d\'ajouter une visite. 8 / 10 visites', time: "Aujourd'hui • 12:21", surface: '#fff', border: '#E6E9F0' },
      { icon: '🔥', title: "Plus qu'une visite\u202F!", body: 'Encore une visite avant votre café offert chez Coffee Lab.', time: 'Hier • 18:04', surface: '#fff', border: '#E6E9F0' },
      { icon: '🎁', title: 'Récompense utilisée', body: 'Votre café offert chez Coffee Lab a été utilisé.', time: '28 juillet • 10:12', surface: '#fff', border: '#E6E9F0' }
    ],
    usedRewards: [
      { label: 'Burger gratuit', place: 'Burger House', date: '12 août 2026' },
      { label: 'Café offert', place: 'Coffee Lab', date: '28 juillet 2026' }
    ],
    activity: [
      { initials: 'SB', name: 'Sarah B.', label: '+1 visite', time: '14:32', kind: 'v' },
      { initials: 'AK', name: 'Amine K.', label: '🎁 Récompense utilisée', time: '14:25', kind: 'r' },
      { initials: 'YM', name: 'Yacine M.', label: '+1 visite', time: '14:18', kind: 'v' },
      { initials: 'LB', name: 'Lina B.', label: '+1 visite', time: '13:55', kind: 'v' },
      { initials: 'RT', name: 'Riad T.', label: '🎁 Récompense utilisée', time: '13:40', kind: 'r' },
      { initials: 'NH', name: 'Nadia H.', label: '+1 visite', time: '13:02', kind: 'v' }
    ],
    history: [
      { date: '15 sep', label: '+1 visite', staff: 'Karim', kind: 'v' },
      { date: '12 sep', label: '+1 visite', staff: 'Amina', kind: 'v' },
      { date: '03 sep', label: '🎁 Récompense utilisée', staff: 'Karim', kind: 'r' },
      { date: '25 aoû', label: '+1 visite', staff: 'Karim', kind: 'v' }
    ],
    scansToday: 37
  };

  componentDidMount() {
    const s = this.props.startStamps;
    if (typeof s === 'number' && s !== 8) this.setState(st => ({ stamps: Object.assign({}, st.stamps, { burger: Math.max(0, s) }) }));
    this._qrTimer = setInterval(() => {
      if (window.qrcode) { clearInterval(this._qrTimer); this.forceUpdate(); }
    }, 180);
    setTimeout(() => { if (this._qrTimer) clearInterval(this._qrTimer); }, 8000);
  }
  componentWillUnmount() { clearInterval(this._qrTimer); }

  bump(n) {
    this.setState(st => {
      const s = Object.assign({}, st.stamps);
      s[st.selProg] = Math.max(0, (s[st.selProg] || 0) + n);
      return { stamps: s };
    });
  }

  prog(id) {
    const key = id || this.state.selProg;
    const list = this.state.programs;
    for (let i = 0; i < list.length; i++) if (list[i].id === key) return list[i];
    return list[0];
  }

  selectProg = (id) => () => this.setState({ selProg: id });
  selectCProg = (id) => () => this.setState({ cProg: id });

  cprog() {
    const list = this.state.programs;
    for (let i = 0; i < list.length; i++) if (list[i].id === this.state.cProg) return list[i];
    return list[0];
  }

  qrSvg(text, cells) {
    if (window.qrcode) {
      try {
        const q = window.qrcode(0, 'M');
        q.addData(text); q.make();
        return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
      } catch (e) { /* fall through */ }
    }
    const n = cells || 25; let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 99991;
    let r = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      if ((h >> 7) % 2) r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" width="100%" height="100%" shape-rendering="crispEdges"><rect width="' + n + '" height="' + n + '" fill="#fff"/><g fill="#0F172A">' + r + '</g></svg>';
  }
  qrEl(text) {
    return React.createElement('div', {
      style: { width: '100%', height: '100%' },
      dangerouslySetInnerHTML: { __html: this.qrSvg(text) }
    });
  }

  go(role, screen) {
    return () => this.setState(role === 'c'
      ? { role: 'client', cScreen: screen }
      : { role: 'merchant', mScreen: screen, overlay: null });
  }

  goWelcome = () => this.setState({ role: 'none', appScreen: 'welcome', overlay: null });
  goRole = () => this.setState({ role: 'none', appScreen: 'role' });
  goRoleLogin = () => this.setState({ role: 'none', appScreen: 'roleLogin' });
  regClient = () => this.setState({ role: 'client', cScreen: 'reg' });
  regMerchant = () => this.setState({ role: 'merchant', mScreen: 'reg' });
  loginClient = () => this.setState({ role: 'client', cScreen: 'home' });
  loginMerchant = () => this.setState({ role: 'merchant', mScreen: 'login' });
  sessClient = () => this.setState({ role: 'client' });
  sessMerchant = () => this.setState({ role: 'merchant', overlay: null });

  pushNotif(title, body) {
    this.setState({ push: { title, body } });
    clearTimeout(this._pushT);
    this._pushT = setTimeout(() => this.setState({ push: null }), 4200);
  }

  startScan = () => {
    this.setState({ role: 'merchant', mScreen: 'scan', overlay: null });
    clearTimeout(this._scanT);
    this._scanT = setTimeout(() => {
      const st = this.state;
      const best = st.programs.filter(p => p.status === 'Actif').slice().sort((a, b) =>
        (st.stamps[b.id] || 0) / b.threshold - (st.stamps[a.id] || 0) / a.threshold)[0];
      const p = best || this.prog();
      this.setState({ selProg: p.id, mScreen: (st.stamps[p.id] || 0) >= p.threshold ? 'reward' : 'scanned' });
    }, 1600);
  };

  askAdd = () => this.setState({ overlay: 'confirmAdd' });
  askRedeem = () => this.setState({ overlay: 'confirmRedeem' });
  closeOverlay = () => this.setState({ overlay: null, busy: false });

  doAdd = () => {
    if (this.state.busy) return;
    this.setState({ busy: true });
    setTimeout(() => {
      if (this.props.simulateError) { this.setState({ busy: false, overlay: 'error' }); return; }
      this.bump(1);
      this.setState(st => ({
        busy: false, overlay: 'successAdd',
        totalVisits: st.totalVisits + 1, scansToday: st.scansToday + 1,
        lastVisit: "aujourd'hui", lastVisitShort: "auj.",
        activity: [{ initials: 'SB', name: 'Sarah B.', label: '+1 visite', time: 'à l\'instant', kind: 'v' }].concat(st.activity),
        history: [{ date: "auj.", label: '+1 visite', staff: 'Karim', kind: 'v' }].concat(st.history)
      }));
      setTimeout(() => {
        const p = this.prog();
        const cur = this.state.stamps[p.id];
        const done = cur >= p.threshold;
        this.setState(st => ({
          overlay: null, mScreen: done ? 'reward' : 'scanned',
          cScreen: done ? 'unlock' : (st.cScreen === 'qr' ? 'detail' : st.cScreen),
          notifs: [done
            ? { icon: '🎁', title: 'Récompense débloquée', body: 'Vous avez gagné ' + p.name + ' chez Burger House.', time: "Aujourd'hui • 14:32", surface: '#FFF8E8', border: '#F1DCA9' }
            : { icon: '⭐', title: '+1 visite', body: 'Burger House — ' + p.name + ' : ' + cur + ' / ' + p.threshold + ' visites', time: "Aujourd'hui • 14:32", surface: '#EFFBF4', border: '#C8EEDA' }
          ].concat(st.notifs)
        }));
        this.pushNotif(done ? '🎁 Récompense prête\u202F!' : '⭐ +1 visite chez Burger House',
          done ? 'Votre ' + p.name + ' chez Burger House est disponible.' : p.name + ' — ' + cur + ' / ' + p.threshold + ' visites, encore ' + (p.threshold - cur) + '.');
      }, 1500);
    }, 650);
  };

  doRedeem = () => {
    if (this.state.busy) return;
    this.setState({ busy: true });
    setTimeout(() => {
      const p = this.prog();
      this.bump(-p.threshold);
      this.setState(st => ({
        busy: false, overlay: 'successRedeem', rewardsUsed: st.rewardsUsed + 1,
        activity: [{ initials: 'SB', name: 'Sarah B.', label: '🎁 Récompense utilisée', time: 'à l\'instant', kind: 'r' }].concat(st.activity),
        history: [{ date: "auj.", label: '🎁 Récompense utilisée', staff: 'Karim', kind: 'r' }].concat(st.history),
        usedRewards: [{ label: p.name, place: 'Burger House', date: "aujourd'hui" }].concat(st.usedRewards)
      }));
      setTimeout(() => {
        this.setState(st => ({
          overlay: null, mScreen: 'home', cScreen: 'rewards',
          notifs: [{ icon: '🎁', title: 'Récompense utilisée', body: 'Votre récompense Burger House a été utilisée.', time: "Aujourd'hui • 14:36", surface: '#FFF8E8', border: '#F1DCA9' }].concat(st.notifs)
        }));
        this.pushNotif('🎁 Récompense utilisée', 'Votre récompense Burger House a été utilisée. Nouveau cycle démarré.');
      }, 1700);
    }, 700);
  };

  resetDemo = () => {
    clearTimeout(this._scanT);
    this.setState({ role: 'client', appScreen: 'welcome' });
    this.setState({ role: 'client', cScreen: 'home', mScreen: 'home', overlay: null, busy: false, push: null, selProg: 'burger', cProg: 'burger', stamps: { burger: 8, pizza: 3, boisson: 0 }, totalVisits: 23, rewardsUsed: 2, lastVisit: '12 septembre 2026', lastVisitShort: '12 sept' });
  };

  setThreshold(d) {
    this.setState(st => ({
      programs: st.programs.map(p => p.id === st.selProg
        ? Object.assign({}, p, { threshold: Math.min(20, Math.max(2, p.threshold + d)) })
        : p)
    }));
  }
  incThreshold = () => this.setThreshold(1);
  decThreshold = () => this.setThreshold(-1);

  dots(stamps, threshold) {
    const ready = stamps >= threshold;
    return Array.from({ length: threshold }, (_, i) => {
      const on = i < stamps;
      return {
        bg: on ? (ready ? '#B7791F' : '#16A36A') : '#fff',
        bd: on ? (ready ? '#B7791F' : '#16A36A') : '#DFE3EB',
        fg: '#fff', label: on ? '✓' : ''
      };
    });
  }

  chip(active) {
    return active
      ? { bg: '#0F172A', bd: '#0F172A', fg: '#fff' }
      : { bg: '#fff', bd: '#DFE3EB', fg: '#56606F' };
  }

  renderVals() {
    const st = this.state;
    const prog = this.prog();
    const cprog = this.cprog();
    const th = prog.threshold;
    const cs = st.cScreen, ms = st.mScreen;
    const cl = st.role === 'client', mr = st.role === 'merchant';
    const base = { stamps: st.cardIdx === 0 ? (st.stamps[prog.id] || 0) : st.cards[st.cardIdx].stamps };

    const decorate = (c, i) => {
      const stamps = i === 0 ? (st.stamps[cprog.id] || 0) : c.stamps;
      const thr = i === 0 ? cprog.threshold : c.threshold;
      const rw = i === 0 ? cprog.name : c.reward;
      const ready = stamps >= thr;
      const remaining = Math.max(0, thr - stamps);
      const accent = ready ? '#B7791F' : '#16A36A';
      return Object.assign({}, c, {
        threshold: thr, ready, accent,
        count: stamps + ' / ' + thr,
        reward: rw, extra: i === 0 ? '  ·  3 programmes' : '',
        lastLine: i === st.cardIdx ? 'Dernière visite : ' + st.lastVisit : (i === 1 ? 'Dernière visite : 8 sept' : 'Dernière visite : 21 août'),
        pct: Math.min(100, (stamps / thr) * 100) + '%',
        remain: ready ? 'Récompense disponible\u202F!' : 'Encore ' + remaining + (remaining > 1 ? ' visites' : ' visite'),
        remainLong: ready ? 'Récompense disponible\u202F🎉' : 'Plus que ' + remaining + (remaining > 1 ? ' visites' : ' visite') + ' avant la récompense',
        rule: thr + ' visites = ' + rw,
        dots: this.dots(stamps, thr),
        btnBg: ready ? '#B7791F' : '#16A36A',
        btnFg: '#fff',
        btnLabel: ready ? 'Utiliser ma récompense' : 'Afficher mon QR',
        open: () => this.setState({ cardIdx: i, cScreen: 'detail' }),
        showQr: (e) => { if (e) e.stopPropagation(); this.setState({ cardIdx: i, cScreen: 'qr' }); }
      });
    };
    const cards = st.cards.map(decorate);
    const active = cards[st.cardIdx];
    const ready = active.ready;
    const after = Math.max(0, base.stamps - th);

    const progRows = st.programs.map(p => {
      const s = st.stamps[p.id] || 0;
      const rdy = s >= p.threshold;
      const sel = p.id === st.selProg;
      const left = Math.max(0, p.threshold - s);
      return {
        id: p.id, name: p.name, emoji: p.emoji, desc: p.desc, status: p.status,
        thrLabel: p.threshold + ' visites',
        membersLabel: p.members > 0 ? p.members + ' clients inscrits' : 'Aucun client inscrit',
        count: s + ' / ' + p.threshold,
        pct: Math.min(100, (s / p.threshold) * 100) + '%',
        accent: rdy ? '#B7791F' : '#16A36A',
        bg: sel ? (rdy ? '#FFF8E8' : '#EFFBF4') : '#fff',
        bd: sel ? (rdy ? '#B7791F' : '#16A36A') : '#E6E9F0',
        badgeBg: p.status === 'Actif' ? '#EFFBF4' : '#F2F4F8',
        badgeFg: p.status === 'Actif' ? '#0F7E51' : '#8A93A3',
        remain: rdy ? 'Récompense disponible\u202F!' : 'Encore ' + left + (left > 1 ? ' visites' : ' visite'),
        previewDots: this.dots(0, p.threshold),
        select: this.selectProg(p.id),
        selectC: this.selectCProg(p.id),
        selectAndEdit: () => this.setState({ selProg: p.id, mScreen: 'progsettings' })
      };
    });

    const tint = a => a.kind === 'r'
      ? { surface: '#FFF8E8', border: '#F1DCA9', fg: '#8A6A1E' }
      : { surface: '#fff', border: '#E6E9F0', fg: '#16A36A' };

    const mkIndex = (role, items, cur) => items.map(it => {
      const c = this.chip(it[0] === cur);
      return { label: it[1], bg: c.bg, bd: c.bd, fg: c.fg, go: this.go(role, it[0]) };
    });

    const customers = [
      { initials: 'SB', name: 'Sarah Benali', stamps: base.stamps, thr: th, last: 'Dernière visite : ' + st.lastVisit, open: () => this.setState({ mScreen: 'customer' }) },
      { initials: 'YM', name: 'Yacine Meziane', stamps: 3, thr: th, last: 'Dernière visite : hier', open: this.go('m', 'customer') },
      { initials: 'AK', name: 'Amine Kaci', stamps: 10, thr: th, last: "Dernière visite : aujourd'hui", open: this.go('m', 'customer') },
      { initials: 'LB', name: 'Lina Belkacem', stamps: 1, thr: th, last: 'Nouvelle cliente', open: this.go('m', 'customer') },
      { initials: 'NH', name: 'Nadia Hamdi', stamps: 6, thr: th, last: 'Dernière visite : 10 sept', open: this.go('m', 'customer') }
    ].map(c => {
      const rdy = c.stamps >= c.thr;
      return Object.assign({}, c, {
        count: c.stamps + ' / ' + c.thr,
        pct: Math.min(100, (c.stamps / c.thr) * 100) + '%',
        accent: rdy ? '#B7791F' : '#16A36A',
        border: rdy ? '#F1DCA9' : '#E6E9F0',
        avatarBg: rdy ? '#FFF8E8' : '#F2F4F8',
        avatarFg: rdy ? '#8A6A1E' : '#56606F'
      });
    });

    const stepState = (n) => {
      const doneMap = { 1: cs === 'qr' || base.stamps > 8, 2: ms === 'scanned' || ms === 'reward' || base.stamps > 8, 3: base.stamps > 8, 4: ready || base.stamps < 8, 5: base.stamps < 8, 6: base.stamps < 8 };
      return doneMap[n]
        ? { bg: '#EFFBF4', bd: '#C8EEDA', numBg: '#16A36A', numFg: '#fff' }
        : { bg: '#fff', bd: '#E6E9F0', numBg: '#F2F4F8', numFg: '#8A93A3' };
    };
    const steps = [
      ['1', 'Sarah ouvre son QR', 'Bouton central QR — un seul tap depuis n\'importe quel écran.'],

      ['2', 'Le commerçant scanne', 'Bouton SCAN dominant, détection automatique, profil affiché.'],
      ['3', '+ Ajouter une visite', 'Confirmation, puis 8 / 10 → 9 / 10 et notification côté client.'],
      ['4', 'Seuil atteint', '10 / 10 affiche « Récompense disponible » en or. Jamais automatique.'],
      ['5', 'Le commerçant valide', 'Modal de confirmation : 10 tampons seront déduits.'],
      ['6', 'Nouveau cycle', 'Solde 0 / 10 (le surplus est conservé), notification envoyée.']
    ].map(s => Object.assign({ n: s[0], title: s[1], body: s[2] }, stepState(s[0])));

    const cats = ['Restaurant', 'Café', 'Fast-food', 'Boulangerie', 'Beauté', 'Retail', 'Autre'];

    const vals = {
      cards, active,
      progRows, otherProgs: progRows.filter(p => p.id !== st.cProg),
      progCount: st.programs.length + ' programmes',
      multiProg: st.cardIdx === 0,
      rewardName: prog.name, rewardLine: '🎁 ' + prog.name,
      progEditTitle: prog.name, progEmoji: prog.emoji,
      progEditName: prog.name, progEditDesc: prog.desc,
      progWarn: prog.members > 0, progNoWarn: prog.members === 0,
      progWarnText: prog.members + " clients ont déjà de la progression en cours sur « " + prog.name + " ». Augmenter le seuil retardera leurs récompenses ; le diminuer peut en débloquer immédiatement.",
      progNoWarnText: "Aucun client n'est encore inscrit à « " + prog.name + " » : vous pouvez ajuster le seuil librement.",
      mPrograms: mr && ms === 'programs', gmPrograms: this.go('m', 'programs'),
      appWelcome: st.role === 'none' && st.appScreen === 'welcome',
      appRole: st.role === 'none' && st.appScreen === 'role',
      appRoleLogin: st.role === 'none' && st.appScreen === 'roleLogin',
      goWelcome: this.goWelcome, goRole: this.goRole, goRoleLogin: this.goRoleLogin,
      regClient: this.regClient, regMerchant: this.regMerchant,
      loginClient: this.loginClient, loginMerchant: this.loginMerchant,
      sessClient: this.sessClient, sessMerchant: this.sessMerchant,
      sessionLabel: st.role === 'client' ? 'Session cliente — Sarah' : (st.role === 'merchant' ? 'Session commerçant — Karim' : 'Non connecté'),
      sessCBg: st.role === 'client' ? '#16A36A' : '#fff', sessCBd: st.role === 'client' ? '#16A36A' : '#DFE3EB', sessCFg: st.role === 'client' ? '#fff' : '#56606F',
      sessMBg: st.role === 'merchant' ? '#0F172A' : '#fff', sessMBd: st.role === 'merchant' ? '#0F172A' : '#DFE3EB', sessMFg: st.role === 'merchant' ? '#fff' : '#56606F',
      sessNBg: st.role === 'none' ? '#0F172A' : '#fff', sessNBd: st.role === 'none' ? '#0F172A' : '#DFE3EB', sessNFg: st.role === 'none' ? '#fff' : '#56606F',
      cReg: cl && cs === 'reg', cHome: cl && cs === 'home', cCards: cl && cs === 'cards',
      cDetail: cl && cs === 'detail', cQR: cl && cs === 'qr', cUnlock: cl && cs === 'unlock', cRewards: cl && cs === 'rewards',
      cNotifs: cl && cs === 'notifs', cProfile: cl && cs === 'profile', cEmpty: cl && cs === 'empty',
      cNav: cl && cs !== 'reg' && cs !== 'qr',
      navCHome: cs === 'home' ? '#16A36A' : '#9AA3B0',
      navCCards: (cs === 'cards' || cs === 'detail' || cs === 'empty') ? '#16A36A' : '#9AA3B0',
      navCNotifs: cs === 'notifs' ? '#16A36A' : '#9AA3B0',
      navCProfile: cs === 'profile' ? '#16A36A' : '#9AA3B0',
      notifCount: st.notifs.length,
      notifs: st.notifs, usedRewards: st.usedRewards,
      hasReward: ready, noReward: !ready,
      qrCustomer: this.qrEl('WFY:CUST:4182-0093:SARAH-BENALI'),
      qrEnroll: this.qrEl('WFY:JOIN:BURGER-HOUSE:ALG-0142'),
      push: !!st.push, pushVisible: !!st.push && st.role === 'client', pushTitle: st.push ? st.push.title : '', pushBody: st.push ? st.push.body : '',

      mLogin: mr && ms === 'login', mReg: mr && ms === 'reg', mProgram: mr && ms === 'program',
      mHome: mr && ms === 'home', mScan: mr && ms === 'scan', mScanned: mr && ms === 'scanned', mReward: mr && ms === 'reward',
      mCustomers: mr && ms === 'customers', mCustomer: mr && ms === 'customer', mActivity: mr && ms === 'activity',
      mProgSettings: mr && ms === 'progsettings', mSettings: mr && ms === 'settings', mEnroll: mr && ms === 'enroll', mEmpty: mr && ms === 'empty',
      mNav: mr && ms !== 'login' && ms !== 'reg' && ms !== 'program' && ms !== 'scan',
      mStatusColor: (mr && ms === 'scan') ? '#fff' : '#0F172A',
      navMHome: ms === 'home' ? '#16A36A' : '#9AA3B0',
      navMCust: (ms === 'customers' || ms === 'customer' || ms === 'empty') ? '#16A36A' : '#9AA3B0',
      navMAct: ms === 'activity' ? '#16A36A' : '#9AA3B0',
      navMSet: (ms === 'settings' || ms === 'progsettings' || ms === 'programs' || ms === 'enroll') ? '#16A36A' : '#9AA3B0',

      stats: [
        { label: 'Clients', value: '248', delta: '+12 ce mois' },
        { label: "Scans aujourd'hui", value: String(st.scansToday), delta: '+6 vs hier' },
        { label: 'Récompenses utilisées', value: String(10 + st.rewardsUsed), delta: 'ce mois' },
        { label: 'Clients fidèles', value: '64%', delta: 'reviennent' }
      ],
      recent: st.activity.slice(0, 3).map(a => Object.assign({}, a, tint(a))),
      activity: st.activity.map(a => Object.assign({}, a, tint(a))),
      history: st.history.map(h => Object.assign({}, h, { fg: h.kind === 'r' ? '#8A6A1E' : '#16A36A' })),
      customers,
      custFilters: ['Tous', 'Actifs', 'Récompense disponible', 'Nouveaux'].map((l, i) => Object.assign({ label: l }, this.chip(i === 0))),
      actFilters: ['Tous', 'Visites', 'Récompenses'].map((l, i) => Object.assign({ label: l }, this.chip(i === 0))),
      categories: cats.map((l, i) => Object.assign({ label: l }, i === 2 ? { bg: '#EFFBF4', bd: '#16A36A', fg: '#0F7E51' } : { bg: '#fff', bd: '#DFE3EB', fg: '#56606F' })),

      progThreshold: th,
      progDots: this.dots(th - 1, th),
      progPreviewLabel: (th - 1) + ' / ' + th + ' visites',
      totalVisits: st.totalVisits, rewardsUsed: st.rewardsUsed,
      lastVisit: st.lastVisit, lastVisitShort: st.lastVisitShort,
      addPreview: base.stamps + ' / ' + th + ' → ' + (base.stamps + 1) + ' / ' + th,
      successCount: base.stamps + ' / ' + th,
      afterRedeem: base.stamps + ' / ' + th + ' → ' + after + ' / ' + th,
      confirmLabel: st.busy ? 'Enregistrement…' : 'Confirmer',
      busyBg: st.busy ? '#8FC6AE' : '#16A36A',
      busyBgGold: st.busy ? '#D9B77E' : '#B7791F',
      ovConfirmAdd: st.overlay === 'confirmAdd', ovSuccessAdd: st.overlay === 'successAdd',
      ovConfirmRedeem: st.overlay === 'confirmRedeem', ovSuccessRedeem: st.overlay === 'successRedeem',
      ovError: st.overlay === 'error',

      components: ['PrimaryButton', 'SecondaryButton', 'LoyaltyCard', 'RewardCard', 'CustomerCard', 'ProgressStampGrid', 'ProgressBar', 'QRScanner', 'QRCodeCard', 'TransactionItem', 'StatCard', 'NotificationItem', 'BottomNavigation', 'MerchantScanButton', 'SuccessModal', 'ConfirmationModal', 'EmptyState'].map(n => ({ name: n })),

      cIndex: mkIndex('c', [['reg', 'Inscription'], ['home', 'Accueil'], ['cards', 'Mes cartes'], ['detail', 'Carte'], ['qr', 'Mon QR'], ['unlock', 'Récompense débloquée'], ['rewards', 'Mes récompenses'], ['notifs', 'Notifications'], ['profile', 'Profil'], ['empty', 'État vide']], cs),
      mIndex: mkIndex('m', [['login', 'Connexion'], ['reg', 'Créer commerce'], ['program', 'Programme'], ['home', 'Dashboard'], ['scan', 'Scanner'], ['scanned', 'Client scanné'], ['reward', 'Récompense dispo'], ['customers', 'Clients'], ['customer', 'Fiche client'], ['activity', 'Activité'], ['programs', 'Mes programmes'], ['progsettings', 'Éditer un programme'], ['settings', 'Réglages'], ['enroll', "QR d'inscription"], ['empty', 'État vide']], ms),

      indexLabel: cl ? 'Écrans client' : (mr ? 'Écrans commerçant' : 'Inscription'),
      startScan: this.startScan, askAdd: this.askAdd, askRedeem: this.askRedeem,
      doAdd: this.doAdd, doRedeem: this.doRedeem, closeOverlay: this.closeOverlay,
      incThreshold: this.incThreshold, decThreshold: this.decThreshold, resetDemo: this.resetDemo,
      gcReg: this.go('c', 'reg'), gcHome: this.go('c', 'home'),
      gcCards: this.go('c', 'cards'), gcQR: this.go('c', 'qr'), gcNotifs: this.go('c', 'notifs'),
      gcProfile: this.go('c', 'profile'), gcRewards: this.go('c', 'rewards'),
      gmLogin: this.go('m', 'login'), gmReg: this.go('m', 'reg'),
      gmProgram: this.go('m', 'program'), gmHome: this.go('m', 'home'), gmCustomers: this.go('m', 'customers'),
      gmActivity: this.go('m', 'activity'), gmSettings: this.go('m', 'settings'),
      gmProgSettings: this.go('m', 'progsettings'), gmEnroll: this.go('m', 'enroll')
    };
    vals.screenIndex = cl ? vals.cIndex : (mr ? vals.mIndex : []);
    return vals;
  }
}
