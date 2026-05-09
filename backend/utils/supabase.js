const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("SUPABASE LOADED SUCCESSFULLY");
  } catch (error) {
    console.log("SUPABASE FAILED (non-fatal)");
  }
}

module.exports = supabase;
