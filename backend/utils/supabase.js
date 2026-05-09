const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

console.log('--- SUPABASE INITIALIZATION START ---');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('⚠️  SUPABASE ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.');
  console.log('Status: SUPABASE FAILED (Client not initialized)');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Status: SUPABASE LOADED SUCCESSFULLY');
  } catch (error) {
    console.error('⚠️  SUPABASE ERROR: Failed to create client:', error.message);
    console.log('Status: SUPABASE FAILED (Crash prevented)');
  }
}

console.log('--------------------------------------');

module.exports = supabase;
