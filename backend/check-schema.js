require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
    const { data, error } = await supabase.from('videohubweb').select('*').limit(1);
    if (error) {
        console.error("Error fetching data:", error);
    } else {
        if (data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, trying to insert dummy record to see schema error...");
            const dummy = { 
                title: "Dummy", 
                category: "All", 
                videoUrl: "http://dummy", 
                sourceType: "bunny",
                bunnyVideoId: "test"
            };
            const res = await supabase.from('videohubweb').insert([dummy]);
            console.log("Insert result:", res);
        }
    }
}
checkSchema();
