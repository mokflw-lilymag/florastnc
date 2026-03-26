import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mheqfhiyfsgnsglvxdrn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZXFmaGl5ZnNnbnNnbHZ4ZHJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDM5OTMsImV4cCI6MjA4OTcxOTk5M30.PR8EVqcCJW0dBv2GLLsCtJ97YvXb1sXE_g9w4ULZMX4'
);

async function check() {
  const { data, error } = await supabase.from('orders').select('id').limit(1);
  if (error) {
    console.error("Order read error:", error);
  } else {
    console.log("Order read success. Data length:", data?.length);
  }
}

check();
