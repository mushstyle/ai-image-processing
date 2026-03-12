const ALLOWED_EMAIL_ADDRESSES = [
  "tim@mush.style",
  "anna@mush.style",
  "willbach@gmail.com",
  "timgalebachukraine@gmail.com",
  "d.venhreniuk@gmail.com",
  "jesse@hyperware.ai",
  "sam@hyperware.ai",
  "tim@hyperware.ai",
  "volodymyrsvchuk@gmail.com",
  "lizadudina14@gmail.com",
  "jul.sergeevna08@gmail.com",
];

const allowedEmailSet = new Set(
  ALLOWED_EMAIL_ADDRESSES.map((email) => email.toLowerCase()),
);

export { ALLOWED_EMAIL_ADDRESSES };

export function isAllowedEmailAddress(email: string): boolean {
  return allowedEmailSet.has(email.toLowerCase());
}
