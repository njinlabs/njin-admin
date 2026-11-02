import type { ReactNode } from "react";

// Abstract shapes only, drawn with the theme tokens so they follow the primary colour and
// dark mode. Decorative: hidden from assistive tech.
const Artwork = () => (
  <svg
    aria-hidden
    viewBox="0 0 600 800"
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 size-full"
  >
    <defs>
      <linearGradient id="login-fade" x1="0" y1="0" x2="1" y2="1">
        <stop
          offset="0"
          stopColor="var(--color-primary-foreground)"
          stopOpacity="0.35"
        />
        <stop
          offset="1"
          stopColor="var(--color-primary-foreground)"
          stopOpacity="0"
        />
      </linearGradient>
      <radialGradient id="login-glow" cx="0.3" cy="0.25" r="0.8">
        <stop
          offset="0"
          stopColor="var(--color-primary-foreground)"
          stopOpacity="0.25"
        />
        <stop
          offset="1"
          stopColor="var(--color-primary-foreground)"
          stopOpacity="0"
        />
      </radialGradient>
    </defs>

    <rect width="600" height="800" fill="url(#login-glow)" />

    <g
      fill="none"
      stroke="var(--color-primary-foreground)"
      strokeOpacity="0.28"
    >
      <circle cx="120" cy="160" r="90" />
      <circle cx="120" cy="160" r="150" />
      <circle cx="120" cy="160" r="220" />
      <circle cx="120" cy="160" r="300" />
    </g>

    <g fill="var(--color-primary-foreground)">
      <circle cx="430" cy="250" r="110" fillOpacity="0.12" />
      <circle cx="500" cy="330" r="70" fillOpacity="0.16" />
      <path
        d="M0 560 C150 470 260 650 420 560 S560 500 600 530 V800 H0 Z"
        fillOpacity="0.1"
      />
      <path
        d="M0 640 C160 560 280 740 440 650 S570 610 600 630 V800 H0 Z"
        fillOpacity="0.14"
      />
      <path
        d="M0 720 C170 650 300 800 460 730 S580 700 600 710 V800 H0 Z"
        fillOpacity="0.2"
      />
    </g>

    <g
      stroke="url(#login-fade)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    >
      <path d="M60 470 L240 380" />
      <path d="M90 500 L300 395" />
      <path d="M130 530 L350 420" />
    </g>

    <g fill="var(--color-primary-foreground)" fillOpacity="0.5">
      <circle cx="300" cy="90" r="4" />
      <circle cx="540" cy="140" r="3" />
      <circle cx="70" cy="380" r="3" />
      <circle cx="360" cy="480" r="5" />
      <circle cx="210" cy="300" r="2.5" />
    </g>
  </svg>
);

// The two columns of the pages shown before a session (login, setup): shapes on one side, the
// form on the other.
export const AuthLayout = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <main className="grid min-h-screen lg:grid-cols-2">
    <title>{`${title} · njin`}</title>
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-primary lg:block"
    >
      <Artwork />
    </aside>

    <section className="flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>
    </section>
  </main>
);
