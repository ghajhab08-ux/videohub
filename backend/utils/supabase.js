const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing from environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
