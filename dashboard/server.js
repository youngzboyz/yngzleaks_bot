import express from 'express';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar que los archivos existen
const publicDir = path.join(__dirname, 'public');
const indexPath = path.join(publicDir, 'index.html');

console.log('Current directory:', __dirname);
console.log('Public directory:', publicDir);
console.log('Index.html path:', indexPath);
console.log('Public directory exists:', fs.existsSync(publicDir));
console.log('Index.html exists:', fs.existsSync(indexPath));

if (fs.existsSync(publicDir)) {
  console.log('Files in public directory:', fs.readdirSync(publicDir));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  console.log('Serving index.html from:', filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

// API: Get all ticket panels
app.get('/api/panels', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ticket_panels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get panel by guild_id
app.get('/api/panels/:guildId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ticket_panels')
      .select('*')
      .eq('guild_id', req.params.guildId)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Update panel
app.put('/api/panels/:guildId', async (req, res) => {
  try {
    const { title, description, button_label } = req.body;
    
    const { data, error } = await supabase
      .from('ticket_panels')
      .update({
        title,
        description,
        button_label
      })
      .eq('guild_id', req.params.guildId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get tickets statistics
app.get('/api/stats', async (req, res) => {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*');

    if (error) throw error;

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      pending: tickets.filter(t => t.status === 'pending').length
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get recent tickets
app.get('/api/tickets/recent', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get moderation logs
app.get('/api/modlogs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('moderation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Made with Bob
