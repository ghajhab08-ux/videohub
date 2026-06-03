require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
    const newVideo = {
        title: "Test Video",
        description: "test",
        category: "All",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnail: "",
        sourceType: "embedded",
        views: 0,
        rating: "100%",
        createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase.from('videohubweb').insert([newVideo]).select();
    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUCCESS:", data);
    }
}

test();
