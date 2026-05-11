const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Handle both names for flexibility during deployment
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: Supabase credentials missing from environment!');
}

let supabase = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ SUPABASE CONNECTION INITIALIZED');
  }
} catch (error) {
  console.error('❌ SUPABASE INITIALIZATION FAILED:', error.message);
}

module.exports = supabase;
