const PAT = "sbp_5d452550b2597b486ddd851fe3ecb5b909005504";
const PROJECT_REF = "mheqfhiyfsgnsglvxdrn";

const query = `
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id uuid default gen_random_uuid() primary key,
  tenant_id text not null,
  order_id text,
  job_type text not null,
  payload jsonb,
  printer_type text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'Enable all for users based on tenant_id'
  ) THEN
    CREATE POLICY "Enable all for users based on tenant_id"
    ON public.print_jobs FOR ALL
    USING (true);
  END IF;
END $$;
`;

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PAT}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Error executing query:", res.status, errorText);
    process.exit(1);
  } else {
    console.log("Success:", await res.json());
  }
}

run();
