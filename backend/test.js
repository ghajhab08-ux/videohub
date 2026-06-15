const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const dummyFile = path.join(__dirname, 'dummy.mp4');
        fs.writeFileSync(dummyFile, 'dummy content');
        
        const form = new FormData();
        form.append('title', 'Test Bulk');
        form.append('description', '');
        form.append('categories', '[]');
        form.append('thumbnail', '');
        form.append('status', 'published');
        form.append('uploadType', 'bulk');
        form.append('file', fs.createReadStream(dummyFile));

        const res = await fetch('http://localhost:4000/api/admin/upload-video-file', {
            method: 'POST',
            body: form
        });

        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
    } catch (e) {
        console.error(e);
    }
}

test();
