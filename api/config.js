// Entrega al navegador la configuración pública de Supabase desde las variables de entorno de Vercel.
module.exports = function handler(req, res) {
  const env = { supabaseUrl: process.env.SUPABASE_URL || "", supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "" };
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(`window.CASE_ENV = ${JSON.stringify(env)};`);
};
