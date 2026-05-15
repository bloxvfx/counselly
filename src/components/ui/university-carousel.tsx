"use client";
/* eslint-disable @next/next/no-img-element */

// Only entries with confirmed files in /public/universities/
const universities = [
  // India
  { name: "IIT Bombay",      slug: "iit-bombay",      ext: "svg"  },
  { name: "IIT Delhi",       slug: "iit-delhi",       ext: "svg"  },
  { name: "BITS Pilani",     slug: "bits-pilani",     ext: "webp" },
  { name: "Ashoka",          slug: "ashoka",          ext: "webp" },
  { name: "IIM Ahmedabad",   slug: "iim-ahmedabad",   ext: "svg"  },
  { name: "Plaksha",         slug: "plaksha",         ext: "webp" },
  // USA
  { name: "MIT",             slug: "mit",             ext: "svg"  },
  { name: "Harvard",         slug: "harvard",         ext: "svg"  },
  { name: "Stanford",        slug: "stanford",        ext: "webp" },
  { name: "UC Berkeley",     slug: "uc-berkeley",     ext: "svg"  },
  { name: "Cornell",         slug: "cornell",         ext: "webp" },
  { name: "Yale",            slug: "yale",            ext: "svg"  },
  { name: "Carnegie Mellon", slug: "carnegie-mellon", ext: "webp" },
  // UK
  { name: "Oxford",          slug: "oxford",          ext: "webp" },
  { name: "Cambridge",       slug: "cambridge",       ext: "webp" },
  { name: "LSE",             slug: "lse",             ext: "webp" },
  { name: "Imperial",        slug: "imperial",        ext: "webp" },
  { name: "UCL",             slug: "ucl",             ext: "webp" },
  // Canada
  { name: "U of Toronto",    slug: "toronto",         ext: "webp" },
  { name: "UBC",             slug: "ubc",             ext: "webp" },
  { name: "McGill",          slug: "mcgill",          ext: "svg"  },
  // Singapore
  { name: "NUS",             slug: "nus",             ext: "svg"  },
  { name: "NTU",             slug: "ntu",             ext: "webp" },
  // Australia
  { name: "U of Melbourne",  slug: "melbourne",       ext: "svg"  },
  // Hong Kong
  { name: "HKU",             slug: "hku",             ext: "webp" },
];

function UniversityBadge({ name, slug, ext }: { name: string; slug: string; ext: string }) {
  return (
    <div className="group flex flex-col items-center gap-3 px-7 shrink-0 cursor-default select-none">
      {/* Fixed-height container, width is natural — handles wide logos (UCL, Ashoka) and square ones (Harvard) equally */}
      <div className="h-16 flex items-center justify-center">
        <img
          src={`/universities/${slug}.${ext}`}
          alt={name}
          height={64}
          className="h-14 w-auto max-w-[100px] object-contain grayscale opacity-55 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        {/* Fallback */}
        <span
          className="hidden w-14 h-14 items-center justify-center rounded-xl bg-surface-card text-muted text-xs font-semibold"
          aria-hidden
        >
          {slug.slice(0, 4).toUpperCase()}
        </span>
      </div>
      <span className="text-muted-soft group-hover:text-muted text-[11px] font-medium transition-colors duration-300 whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

export function UniversityCarousel() {
  const doubled = [...universities, ...universities];

  return (
    <div className="py-12 overflow-hidden">
      <p className="text-center type-caption-upper text-muted mb-10">Students aiming for</p>

      <div className="relative">
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 z-10"
          style={{ background: "linear-gradient(to right, var(--color-canvas), transparent)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 z-10"
          style={{ background: "linear-gradient(to left, var(--color-canvas), transparent)" }}
        />

        <div className="carousel-track flex items-start gap-0">
          {doubled.map((u, i) => (
            <UniversityBadge key={`${u.slug}-${i}`} {...u} />
          ))}
        </div>
      </div>
    </div>
  );
}
