import fs from 'fs';
const path = 'C:/Users/ldlsl/OneDrive/Documentos/discord bot/dashboard/app.js';
let c = fs.readFileSync(path, 'utf8');

const start = c.indexOf('async function saveTicketPanel()');
const end = c.indexOf('\n\n// ========================', start);
const oldFunc = c.substring(start, end);

const newFunc = sync function saveTicketPanel() {
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
};

c = c.substring(0, start) + newFunc + c.substring(end);
fs.writeFileSync(path, c);
console.log('saveTicketPanel actualizado');
