/**
 * PP 브릿지 단독 설치용 Supabase 설정 (pkg 빌드에 포함).
 * 웹 ZIP 다운로드 시 Vercel .env 주입 없이도 설치·기동되도록 합니다.
 * 지점 ID는 웹앱 접속 시 /set_tenant 로 페어링합니다.
 */
module.exports = {
  SUPABASE_URL: "https://ubroyskoxaixstgaralk.supabase.co",
  SUPABASE_SERVICE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVicm95c2tveGFpeHN0Z2FyYWxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxODcwMCwiZXhwIjoyMDc0MTk0NzAwfQ.D4y4vePt2z34e5FRyRnULATiUer9fkDEEcQGqbxRZP8",
};
