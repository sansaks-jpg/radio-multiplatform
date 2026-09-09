const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://idnxegollxhdcoexvndx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbnhlZ29sbHhoZGNvZXh2bmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk3MDAxMSwiZXhwIjoyMTA0NTQ2MDExfQ.qC8U4-VV1VkUDaHziPLy4v04jS118cG1sQC0EWUXutk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const photos = [
  { file: 'attaya.png', name: 'Attaya' },
  { file: 'ega-ratu.png', name: 'Ega Ratu' },
  { file: 'kara-ferina.png', name: 'Kara Ferina' },
  { file: 'nafa.png', name: 'Nafa' },
  { file: 'nanda.png', name: 'Nanda' },
  { file: 'rizky.png', name: 'Rizky' },
  { file: 'tyas.png', name: 'Tyas' },
];

async function main() {
  for (const p of photos) {
    const filePath = path.resolve('admin/public/penyiar', p.file);
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      continue;
    }
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`Uploading ${p.file} (${fileBuffer.length} bytes)...`);
    const { data, error } = await supabase.storage
      .from('penyiar')
      .upload(p.file, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });
    if (error) {
      console.error(`Error uploading ${p.file}:`, error);
    } else {
      console.log(`Successfully uploaded ${p.file}:`, data);
    }
  }
}

main().catch(console.error);
