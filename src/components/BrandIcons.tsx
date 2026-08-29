import React from 'react';

/**
 * Authentic brand icons for WhatsApp, Call/Phone, Email, and Facebook.
 */

// Real WhatsApp Vector Logo (Official green & white speech bubble with phone)
export function WhatsAppLogo({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.82 12.04 21.82C17.5 21.82 21.96 17.37 21.96 11.91C21.96 6.45 17.5 2 12.04 2Z"
      />
      <path
        fill="#FFFFFF"
        d="M17.52 14.33C17.29 14.21 16.14 13.64 15.93 13.56C15.71 13.48 15.55 13.44 15.39 13.68C15.23 13.92 14.77 14.47 14.63 14.63C14.49 14.79 14.35 14.81 14.12 14.69C13.88 14.57 13.12 14.32 12.21 13.51C11.5 12.88 11.03 12.1 10.89 11.86C10.75 11.62 10.88 11.49 11 11.37C11.11 11.26 11.24 11.09 11.36 10.95C11.48 10.81 11.52 10.71 11.6 10.55C11.68 10.39 11.64 10.25 11.58 10.13C11.52 10.01 11.05 8.84 10.85 8.36C10.66 7.89 10.46 7.95 10.31 7.94C10.17 7.93 10.01 7.93 9.85 7.93C9.69 7.93 9.43 7.99 9.21 8.23C8.99 8.47 8.38 9.04 8.38 10.21C8.38 11.38 9.23 12.51 9.35 12.67C9.47 12.83 11.03 15.24 13.41 16.27C13.98 16.51 14.42 16.66 14.77 16.77C15.34 16.95 15.86 16.93 16.27 16.87C16.73 16.8 17.68 16.29 17.88 15.73C18.08 15.17 18.08 14.69 18.02 14.59C17.96 14.49 17.8 14.43 17.52 14.33Z"
      />
    </svg>
  );
}

// Real WhatsApp Outline / Monochrome Vector Icon
export function WhatsAppIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
}

// Real Call / Phone Dial Handset Logo (Colorized circular badge)
export function CallLogo({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10.5" fill="#10B981" />
      <path
        fill="#FFFFFF"
        d="M8.5 7C8.1 7 7.7 7.2 7.4 7.5L6.5 8.4C6 8.9 5.8 9.7 6.1 10.4C7.2 13 9.1 14.9 11.7 16C12.4 16.3 13.2 16.1 13.7 15.6L14.6 14.7C15.2 14.1 15.2 13.1 14.6 12.5L13.3 11.2C12.7 10.6 11.8 10.6 11.2 11.2L10.8 11.6C10.7 11.7 10.5 11.7 10.4 11.6C9.5 11.1 8.9 10.5 8.4 9.6C8.3 9.5 8.3 9.3 8.4 9.2L8.8 8.8C9.4 8.2 9.4 7.3 8.8 6.7L8.5 7Z"
      />
      <path
        fill="#FFFFFF"
        d="M13.5 6C15.4 6.3 16.9 7.8 17.2 9.7M13.5 8.5C14.3 8.8 14.9 9.4 15.2 10.2"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Real Phone / Call Handset Icon (Classic phone receiver)
export function PhoneCallIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.28-.27.36-.67.25-1.02A11.36 11.36 0 019 4.31c0-.55-.45-1-1-1H4.5c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z" />
    </svg>
  );
}

// Real Email / Gmail Logo (Multi-color Google / Modern Envelope)
export function EmailLogo({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {/* Background shape */}
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#EA4335" />
      {/* White envelope flap */}
      <path
        d="M2 7.5L12 13.5L22 7.5V6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V7.5Z"
        fill="#FBBC05"
      />
      <path
        d="M12 13.5L2 7.5V17C2 18.1 2.9 19 4 19H8V11.1L12 13.5Z"
        fill="#4285F4"
      />
      <path
        d="M12 13.5L22 7.5V17C22 18.1 21.1 19 20 19H16V11.1L12 13.5Z"
        fill="#34A853"
      />
      <path
        d="M8 19H16V11.1L12 13.5L8 11.1V19Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Real Email Envelope Icon (Clean 2-tone / high-contrast mail icon)
export function EmailEnvelopeIcon({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#EA4335" />
      <path
        d="M3 6.5L12 12.5L21 6.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="#DC2626" strokeWidth="1" />
    </svg>
  );
}

// Real Facebook Brand Logo (Official Blue circle + White f)
export function FacebookLogo({ className = "h-4 w-4", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      className={className}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10.5" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M13.6 18V12.3H15.5L15.8 10.1H13.6V8.7C13.6 8.1 13.8 7.6 14.7 7.6H15.9V5.6C15.3 5.5 14.5 5.5 13.8 5.5C11.9 5.5 10.7 6.6 10.7 8.7V10.1H8.8V12.3H10.7V18H13.6Z"
      />
    </svg>
  );
}
