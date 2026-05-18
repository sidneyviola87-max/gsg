const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','10minutemail.com','throwaway.email',
  'yopmail.com','trashmail.com','dispostable.com','fakeinbox.com','getairmail.com',
  'maildrop.cc','sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'guerrillamail.biz','guerrillamail.de','guerrillamail.net','guerrillamail.org','spam4.me',
  'trashmail.at','trashmail.io','trashmail.me','trashmail.net','trashmail.org',
  'mailnull.com','spamgourmet.com','spamgourmet.net','spamgourmet.org',
  'tempr.email','discard.email','spambox.us','maildax.me','throwam.com',
  'burnermail.io','tempinbox.com','tempinbox.co.uk','emailondeck.com',
  'moakt.com','anonaddy.com','spamwc.de','mailsac.com','mailtemp.info',
  'crazymailing.com','getnada.com','tempm.com','spamhereplease.com',
  'fakemailgenerator.com','mailboxy.fun','tempemails.net','emailfake.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
