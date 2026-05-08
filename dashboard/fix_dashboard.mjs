import fs from 'fs';

const path = 'C:\\Users\\ldlsl\\OneDrive\\Documentos\\discord bot\\dashboard\\app.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Agregar SUPABASE_ALLOWED_ACTIONS antes de localLogs
const marker = 'const localLogs = [];';
const newMarker = "const SUPABASE_ALLOWED_ACTIONS = ['kick', 'ban', 'mute', 'warn', 'unban', 'unmute'];\n\n" + marker;
content = content.replace(marker, newMarker);

// 2. Reemplazar logMod
const oldLogMod = `async function logMod(action) {
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
    showToast(Acción [\${action}] registrada en Supabase ✓, 'success');
    loadModLogs();
  } catch (e) {
    showToast(Acción [\${action}] registrada localmente ✓, 'success');
    addLocalLog(action, user, reason);
  }
}`;

const newLogMod = `async function logMod(action) {
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

  if (!user) { showToast('\u274c Completa los campos requeridos', 'error'); return; }

  // Clear y announce no existen en Supabase (CHECK constraint), solo local
  if (!SUPABASE_ALLOWED_ACTIONS.includes(action)) {
    showToast('\ud83d\udcdd [' + action + '] registrada localmente (no disponible en Supabase)', 'info');
    addLocalLog(action, user, reason);
    return;
  }

  try {
    const { error } = await sb.from('moderation_logs').insert({
      guild_id: 'dashboard',
      action: action,
      moderator_id: 'dashboard_user',
      target_user_id: user,
      reason: reason || 'Sin raz\u00f3n',
    });
    if (error) throw error;
    showToast('\u2705 [' + action + '] registrada en Supabase', 'success');
    loadModLogs();
  } catch (e) {
    console.error('Error Supabase logMod:', e);
    showToast('\ud83d\udcdd [' + action + '] registrada localmente (error: ' + e.message + ')', 'info');
    addLocalLog(action, user, reason);
  }
}`;

content = content.replace(oldLogMod, newLogMod);

// 3. Reemplazar saveTicketPanel
const oldSavePanel = `async function saveTicketPanel() {
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
      showToast('\u2705 Panel de tickets actualizado en Discord', 'success');
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
    showToast('Panel de tickets guardado en Supabase \u2713', 'success');
  } catch (e) {
    showToast('Panel guardado localmente \u2713', 'success');
  }
}`;

const newSavePanel = `async function saveTicketPanel() {
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
      showToast('\u2705 Panel de tickets actualizado en Discord', 'success');
      return;
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // Fallback: save to Supabase (message_id y channel_id son NOT NULL)
  try {
    const { error } = await sb.from('ticket_panels').upsert({
      guild_id: 'dashboard',
      message_id: 'dashboard_panel',
      channel_id: 'dashboard_channel',
      title: title || '\ud83c\udfab Support Ticket System',
      description: desc || 'Need help? Click the button below to open a support ticket.',
      button_label: btn || '\ud83d\udce9 Create Ticket'
    }, { onConflict: 'guild_id' });
    if (error) throw error;
    showToast('\u2705 Panel de tickets guardado en Supabase', 'success');
  } catch (e) {
    console.error('Error Supabase saveTicketPanel:', e);
    showToast('\u274c Error al guardar en Supabase: ' + e.message, 'error');
  }
}`;

content = content.replace(oldSavePanel, newSavePanel);

fs.writeFileSync(path, content, 'utf8');
console.log('Cambios aplicados correctamente');
process.exit(0);