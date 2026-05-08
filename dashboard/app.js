// ========================
// CONFIG — Supabase
// ========================
const SUPABASE_URL = 'https://syysgixmzajfnxoxcmrm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXNnaXhtemFqZm54b3hjbXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwOTU2MjAsImV4cCI6MjA5MzY3MTYyMH0.zSv-MphehVkF2A0pv8roC5-NhWgCSJo_C5TLu12exdA';
const GIF_URL = 'https://cdn-longterm.mee6.xyz/plugins/welcome/images/1014210083955163197/da9da3b39a05bc51b1d3bd75b6e4ec40da3b7a81c43e3263a996c2201ba192aa.gif';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================
// COMMANDS DATA (from bot)
// ========================
const BOT_COMMANDS = [
  { name: '/announce', desc: 'Envía un anuncio a un canal', perm: 'Administrador' },
  { name: '/clear',    desc: 'Elimina mensajes del canal (1-100)', perm: 'Administrador' },
  { name: '/setupticket', desc: 'Configura el panel de tickets en el canal', perm: 'Administrador' },
  { name: '/tickets',  desc: 'Muestra todos los tickets activos', perm: 'Administrador' },
  { name: '/closeticket', desc: 'Cierra el ticket actual', perm: 'Administrador' },
  { name: '/info',     desc: 'Muestra información del servidor', perm: 'Administrador' },
  { name: '!ban',      desc: 'Banea a un usuario del servidor', perm: 'Administrador' },
];

// ========================
// STAR CANVAS
// ========================
(function initStars() {
  const canvas = document.getElementById('starCanvas');
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    const count = Math.floor((canvas.width * canvas.height) / 4000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.2,
        alpha: Math.random(),
        speed: Math.random() * 0.004 + 0.001,
        phase: Math.random() * Math.PI * 2,
        // some stars have red tint
        red: Math.random() < 0.12
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now() / 1000;
    for (const s of stars) {
      const a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase + now * s.speed * 10));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      if (s.red) {
        ctx.fillStyle = `rgba(220,60,60,${a * 0.85})`;
      } else {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
      }
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  draw();
  window.addEventListener('resize', () => { resize(); createStars(); });
})();

// ========================
// NAVIGATION
// ========================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    const sec = item.dataset.section;
    document.getElementById(sec).classList.add('active');
    if (sec === 'tickets') loadTickets();
    if (sec === 'logs') loadAllLogs();
    if (sec === 'moderacion') loadModLogs();
  });
});

// ========================
// TOAST
// ========================
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.classList.remove('show'); }, 3200);
}

// ========================
// CONFIRM MODAL
// ========================
let confirmCallback = null;
function showConfirm(title, msg, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmModal').style.display = 'flex';
  confirmCallback = cb;
  document.getElementById('confirmBtn').onclick = () => { closeConfirm(); cb(); };
}
function closeConfirm() {
  document.getElementById('confirmModal').style.display = 'none';
}

// ========================
// TOGGLE PASSWORD
// ========================
function togglePass(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ========================
// RENDER COMMANDS
// ========================
function renderCommands(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = BOT_COMMANDS.map(c => `
    <div class="cmd-item">
      <div class="cmd-left">
        <span class="cmd-name">${c.name}</span>
        <span class="cmd-desc">${c.desc}</span>
        <span class="cmd-perm">🔒 ${c.perm}</span>
      </div>
    </div>
  `).join('');
}

// ========================
// LOAD TICKETS (Supabase)
// ========================
async function loadTickets() {
  try {
    const { data: tickets, error } = await sb
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Stats
    const open = tickets ? tickets.filter(t => t.status === 'open').length : 0;
    document.getElementById('statTickets').textContent = open;

    // Dashboard recent
    const dashEl = document.getElementById('dashTickets');
    if (dashEl) {
      if (!tickets || tickets.length === 0) {
        dashEl.innerHTML = '<div class="empty-state">No hay tickets aún</div>';
      } else {
        dashEl.innerHTML = tickets.slice(0, 6).map(t => `
          <div class="recent-item">
            <div>
              <div style="font-size:.85rem;color:#fff">Ticket #${String(t.ticket_number || '?').padStart(4,'0')} — ${t.subject || 'Sin asunto'}</div>
              <div class="ri-label">${new Date(t.created_at).toLocaleDateString('es-ES')}</div>
            </div>
            <span class="badge badge-${t.status === 'open' ? 'open' : t.status === 'closed' ? 'closed' : 'progress'}">${t.status}</span>
          </div>
        `).join('');
      }
    }

    // Full table
    const tbody = document.getElementById('ticketRows');
    const emptyEl = document.getElementById('ticketEmpty');
    if (!tbody) return;

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    tbody.innerHTML = tickets.map(t => `
      <tr>
        <td style="font-family:'Rajdhani',sans-serif;color:#ff6666">#${String(t.ticket_number || '?').padStart(4,'0')}</td>
        <td>${t.subject || '—'}</td>
        <td style="font-size:.76rem;color:var(--text-dim)">${t.channel_id || '—'}</td>
        <td><span class="badge badge-${t.status === 'open' ? 'open' : t.status === 'closed' ? 'closed' : 'progress'}">${t.status || '?'}</span></td>
        <td style="font-size:.76rem;color:var(--text-dim)">${new Date(t.created_at).toLocaleDateString('es-ES')}</td>
        <td>
          ${t.status === 'open' ? `<button class="btn-danger" style="padding:4px 10px;font-size:.75rem" onclick="closeTicketById('${t.id}')">Cerrar</button>` : '<span style="color:var(--text-dim);font-size:.78rem">Cerrado</span>'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error cargando tickets:', e);
    showToast('Error al cargar tickets desde Supabase', 'error');
  }
}

async function closeTicketById(id) {
  showConfirm('Cerrar ticket', '¿Seguro que quieres marcar este ticket como cerrado?', async () => {
    const { error } = await sb.from('tickets').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast('Error al cerrar ticket', 'error'); return; }
    showToast('Ticket cerrado correctamente', 'success');
    loadTickets();
  });
}

// ========================
// MODERATION LOGS
// ========================
async function logMod(action) {
  const fields = {
    ban:      { user: 'banUser',  reason: 'banReason' },
    kick:     { user: 'kickUser', reason: 'kickReason' },
    mute:     { user: 'muteUser', reason: 'muteReason' },
    warn:     { user: 'warnUser', reason: 'warnReason' },
    clear:    { user: 'clearCh',  reason: null },
    announce: { user: 'annTitle', reason: 'annMsg' },
  };
  const f = fields[action];
  const user = document.getElementById(f.user)?.value || '';
  const reason = f.reason ? document.getElementById(f.reason)?.value || '' : '';

  if (!user) { showToast('Completa los campos requeridos', 'error'); return; }

  try {
    await sb.from('moderation_logs').insert({
      guild_id: 'dashboard',
      action: action,
      moderator_id: 'dashboard_user',
      target_user_id: user,
      reason: reason || 'Sin razón',
    });
    showToast(`Acción [${action}] registrada en Supabase ✓`, 'success');
    loadModLogs();
  } catch (e) {
    showToast(`Acción [${action}] registrada localmente ✓`, 'success');
    addLocalLog(action, user, reason);
  }
}

const localLogs = [];
function addLocalLog(action, user, reason) {
  localLogs.unshift({ action, user, reason, time: new Date() });
  renderLocalLogs();
}

function renderLocalLogs() {
  const el = document.getElementById('modLogList');
  if (!el) return;
  if (localLogs.length === 0) {
    el.innerHTML = '<div class="empty-state">Sin logs locales</div>';
    return;
  }
  el.innerHTML = localLogs.map(l => `
    <div class="log-entry">
      <span class="log-time">${l.time.toLocaleTimeString('es-ES')}</span>
      <span class="log-action">${l.action.toUpperCase()}</span>
      <span class="log-detail">${l.user} — ${l.reason}</span>
    </div>
  `).join('');
}

async function loadModLogs() {
  try {
    const { data, error } = await sb
      .from('moderation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) throw error;

    const el = document.getElementById('modLogList');
    if (!el) return;

    if (!data || data.length === 0) {
      el.innerHTML = '<div class="empty-state">No hay logs de moderación</div>';
      return;
    }

    el.innerHTML = data.map(l => `
      <div class="log-entry">
        <span class="log-time">${new Date(l.created_at).toLocaleString('es-ES')}</span>
        <span class="log-action">${(l.action || '?').toUpperCase()}</span>
        <span class="log-detail">Target: ${l.target_user_id || '?'} — ${l.reason || ''}</span>
      </div>
    `).join('');
  } catch (e) {
    renderLocalLogs();
  }
}

async function loadAllLogs() {
  try {
    const { data, error } = await sb
      .from('moderation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const el = document.getElementById('allLogsContainer');
    if (!el) return;

    if (error || !data || data.length === 0) {
      el.innerHTML = '<div class="empty-state">No hay logs disponibles en Supabase</div>';
      return;
    }

    el.innerHTML = data.map(l => `
      <div class="log-entry">
        <span class="log-time">${new Date(l.created_at).toLocaleString('es-ES')}</span>
        <span class="log-action">${(l.action || '?').toUpperCase()}</span>
        <span class="log-detail">
          Mod: ${l.moderator_id || '?'} →
          Target: ${l.target_user_id || '?'}
          ${l.reason ? '— ' + l.reason : ''}
        </span>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('allLogsContainer').innerHTML =
      '<div class="empty-state">Error al conectar con Supabase</div>';
  }
}

function clearLocalLogs() {
  const el = document.getElementById('allLogsContainer');
  if (el) el.innerHTML = '<div class="empty-state">Vista limpiada</div>';
}

// ========================
// BANNER
// ========================
function previewBanner() {
  const url = document.getElementById('bannerUrl').value.trim();
  if (!url) return;
  document.getElementById('activeBanner').src = url;
  showToast('Preview del banner actualizado', 'success');
}

function saveBanner() {
  const url = document.getElementById('bannerUrl').value.trim();
  if (!url) { showToast('Introduce una URL válida', 'error'); return; }
  document.getElementById('activeBanner').src = url;
  showToast('Banner guardado ✓', 'success');
}

// ========================
// CONFIG
// ========================
function saveConfig() {
  const cfg = {
    supabaseUrl: document.getElementById('cfgSupaUrl').value,
    supabaseKey: document.getElementById('cfgSupaKey').value,
    token: document.getElementById('cfgToken').value,
    guildId: document.getElementById('cfgGuildId').value,
    gifUrl: document.getElementById('cfgGif').value,
    maintenance: document.getElementById('maintenance').checked,
    welcomeDM: document.getElementById('welcomeDM').checked,
  };
  localStorage.setItem('botPanelConfig', JSON.stringify(cfg));
  showToast('Configuración guardada localmente ✓', 'success');
}

function loadConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem('botPanelConfig') || '{}');
    if (cfg.supabaseUrl) document.getElementById('cfgSupaUrl').value = cfg.supabaseUrl;
    if (cfg.supabaseKey) document.getElementById('cfgSupaKey').value = cfg.supabaseKey;
    if (cfg.token) document.getElementById('cfgToken').value = cfg.token;
    if (cfg.guildId) document.getElementById('cfgGuildId').value = cfg.guildId;
    if (cfg.gifUrl) document.getElementById('cfgGif').value = cfg.gifUrl;
    if (cfg.maintenance !== undefined) document.getElementById('maintenance').checked = cfg.maintenance;
    if (cfg.welcomeDM !== undefined) document.getElementById('welcomeDM').checked = cfg.welcomeDM;
  } catch (e) {}
}

// ========================
// LOAD STATS
// ========================
async function loadStats() {
  try {
    const { count: ticketCount } = await sb
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    document.getElementById('statTickets').textContent = ticketCount ?? '—';

    const { count: logCount } = await sb
      .from('moderation_logs')
      .select('*', { count: 'exact', head: true });

    document.getElementById('statServidores').textContent = '1';
    document.getElementById('statUsuarios').textContent = '—';
    document.getElementById('statComandos').textContent = BOT_COMMANDS.length;

    document.getElementById('statusDot').className = 'status-dot online';
    document.getElementById('statusLabel').textContent = 'Supabase conectado';
  } catch (e) {
    document.getElementById('statusDot').className = 'status-dot offline';
    document.getElementById('statusLabel').textContent = 'Sin conexión';
  }
}

// ========================
// BOT API CONFIG (auto-detect: Railway or local)
// ========================
const API_URL = window.location.origin;

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    return await res.json();
  } catch (e) {
    throw new Error('Bot API no disponible');
  }
}

// ========================
// FETCH BOT STATUS
// ========================
async function fetchBotStatus() {
  try {
    const data = await apiFetch('/api/status');
    const indicator = document.getElementById('botStatusIndicator');
    const text = document.getElementById('botStatusText');
    const detail = document.getElementById('botStatusDetail');
    const status = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');

    if (data.online) {
      indicator.style.background = '#44ff88';
      indicator.style.boxShadow = '0 0 12px #44ff88';
      text.textContent = '🟢 En línea';
      text.style.color = '#44ff88';
      detail.textContent = `Bot: ${data.username || 'Desconocido'} — ${data.guilds || 0} servidores`;
      status.className = 'status-dot online';
      label.textContent = `🟢 ${data.username || 'Bot'} conectado`;

      document.getElementById('statGuilds').textContent = data.guilds || '—';
      document.getElementById('statUsers').textContent = data.users || '—';
      document.getElementById('statChannels').textContent = data.channels || '—';
      document.getElementById('statUptime').textContent = data.uptime || '—';
      document.getElementById('statLatency').textContent = data.latency ? `${data.latency}ms` : '—';

      document.getElementById('btnStartBot').disabled = true;
      document.getElementById('btnStartBot').style.opacity = '0.5';
      document.getElementById('btnStopBot').disabled = false;
      document.getElementById('btnStopBot').style.opacity = '1';
    } else {
      indicator.style.background = '#ff4444';
      indicator.style.boxShadow = '0 0 12px #ff4444';
      text.textContent = '🔴 Desconectado';
      text.style.color = '#ff6666';
      detail.textContent = 'El bot no está respondiendo';
      status.className = 'status-dot offline';
      label.textContent = 'Desconectado';
      document.getElementById('btnStartBot').disabled = false;
      document.getElementById('btnStartBot').style.opacity = '1';
      document.getElementById('btnStopBot').disabled = true;
      document.getElementById('btnStopBot').style.opacity = '0.5';
    }
  } catch (e) {
    // Bot offline
    const indicator = document.getElementById('botStatusIndicator');
    if (indicator) {
      indicator.style.background = '#ff4444';
      indicator.style.boxShadow = '0 0 12px #ff4444';
    }
  }
}

// ========================
// CONTROL BOT (start/shutdown/restart)
// ========================
async function controlBot(action) {
  const actions = {
    start: { endpoint: '/api/start', method: 'POST', label: '▶ Iniciando...' },
    shutdown: { endpoint: '/api/shutdown', method: 'POST', label: '⏹ Apagando...' },
    restart: { endpoint: '/api/restart', method: 'POST', label: '🔄 Reiniciando...' }
  };
  const a = actions[action];
  if (!a) return;

  showToast(a.label, 'info');
  try {
    const data = await apiFetch(a.endpoint, { method: a.method });
    if (data.success) {
      showToast(`✅ ${data.message || 'Comando ejecutado'}`, 'success');
      setTimeout(fetchBotStatus, 2000);
    } else {
      showToast(`❌ ${data.message || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('❌ No se pudo conectar con el bot', 'error');
  }
}

// ========================
// UPDATE BOT NAME
// ========================
async function updateBotName() {
  const name = document.getElementById('botNewName').value.trim();
  if (!name) { showToast('Introduce un nombre', 'error'); return; }
  try {
    const data = await apiFetch('/api/setname', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    if (data.success) {
      showToast(`✅ Nombre cambiado a "${name}"`, 'success');
      document.getElementById('botNewName').value = '';
      setTimeout(fetchBotStatus, 2000);
    } else {
      showToast(`❌ ${data.message || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('❌ No se pudo conectar con el bot', 'error');
  }
}

// ========================
// UPDATE BOT DESCRIPTION
// ========================
async function updateBotDesc() {
  const desc = document.getElementById('botNewDesc').value.trim();
  if (!desc) { showToast('Introduce una descripción', 'error'); return; }
  try {
    const data = await apiFetch('/api/setdescription', {
      method: 'POST',
      body: JSON.stringify({ description: desc })
    });
    if (data.success) {
      showToast('✅ Descripción actualizada', 'success');
      document.getElementById('botNewDesc').value = '';
    } else {
      showToast(`❌ ${data.message || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('❌ No se pudo conectar con el bot', 'error');
  }
}

// ========================
// UPDATE BOT AVATAR
// ========================
async function updateBotAvatar() {
  const url = document.getElementById('botNewAvatar').value.trim();
  if (!url) { showToast('Introduce una URL de imagen', 'error'); return; }
  try {
    const data = await apiFetch('/api/setavatar', {
      method: 'POST',
      body: JSON.stringify({ avatar: url })
    });
    if (data.success) {
      showToast('✅ Avatar actualizado', 'success');
      document.getElementById('botNewAvatar').value = '';
    } else {
      showToast(`❌ ${data.message || 'Error'}`, 'error');
    }
  } catch (e) {
    showToast('❌ No se pudo conectar con el bot', 'error');
  }
}

// ========================
// SAVE TICKET PANEL VIA API
// ========================
async function saveTicketPanel() {
  const title = document.getElementById('ticketTitle')?.value;
  const desc = document.getElementById('ticketDesc')?.value;
  const btn = document.getElementById('ticketBtn')?.value;

  // Try API first
  try {
    const data = await apiFetch('/api/ticketpanel', {
      method: 'POST',
      body: JSON.stringify({ title, description: desc, button_label: btn })
    });
    if (data.success) {
      showToast('✅ Panel de tickets actualizado en Discord', 'success');
      return;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // Fallback: save to Supabase
  try {
    const { error } = await sb.from('ticket_panels').upsert({
      guild_id: 'dashboard',
      title: title,
      description: desc,
      button_label: btn
    }, { onConflict: 'guild_id' });
    if (error) throw error;
    showToast('Panel de tickets guardado en Supabase ✓', 'success');
  } catch (e) {
    showToast('Panel guardado localmente ✓', 'success');
  }
}

// ========================
// INIT
// ========================
(async function init() {
  loadConfig();
  renderCommands('dashCmdList');
  renderCommands('cmdListFull');
  await loadStats();
  await loadTickets();
  fetchBotStatus();
  // Poll bot status every 15 seconds
  setInterval(fetchBotStatus, 15000);
})();
