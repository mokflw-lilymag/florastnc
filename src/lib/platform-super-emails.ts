/** DB에 super_admin이 아니어도 앱에서 플랫폼 슈퍼로 취급하는 로그인 이메일 */
export const PLATFORM_SUPER_EMAILS = new Set(
  ["lilymag0301@gmail.com", "test@test.com", "mokflw@gmail.com"].map((e) => e.toLowerCase())
);

export function isPlatformSuperEmail(email: string | null | undefined): boolean {
  return !!email && PLATFORM_SUPER_EMAILS.has(email.trim().toLowerCase());
}
