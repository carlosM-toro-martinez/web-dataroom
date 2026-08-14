import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { env } from "@/shared/config/env";

const siteName = "Empresa Minera Marte S.R.L.";
const defaultDescription =
  "Empresa Minera Marte S.R.L. is a private Bolivian mining company focused on gold, copper and silver exploration in Potosi, Sud Lipez and Bolivia.";
const defaultKeywords = [
  "mineria Bolivia",
  "mineria Potosi",
  "mineria Oruro",
  "Sud Lipez",
  "oro Bolivia",
  "cobre Bolivia",
  "plata Bolivia",
  "inversion minera Bolivia",
  "Bolivian mining company",
  "mining investment Bolivia",
  "gold copper silver Bolivia",
  "Potosi mining projects",
  "Sud Lipez mining"
];

type SeoConfig = {
  title: string;
  description: string;
  keywords?: string[];
  lang?: "en" | "es";
  index?: boolean;
};

const publicSeo: Record<string, SeoConfig> = {
  "/": {
    title: "Minera Marte S.R.L. | Gold, Copper and Silver Mining in Bolivia",
    description:
      "Private Bolivian mining company focused on gold, copper and silver exploration, responsible mining and technical development in Potosi and Sud Lipez, Bolivia.",
    lang: "en",
    keywords: [
      "gold mining Bolivia",
      "copper mining Bolivia",
      "silver mining Bolivia",
      "mining company Bolivia",
      "mineria oro cobre plata Bolivia",
      "empresa minera Potosi"
    ]
  },
  "/mineria-responsable": {
    title: "Responsible Mining in Bolivia | Minera Marte S.R.L.",
    description:
      "Responsible mining practices, safety, environmental stewardship and sustainable exploration by Minera Marte in Bolivia.",
    lang: "en",
    keywords: [
      "responsible mining Bolivia",
      "mineria responsable Bolivia",
      "sustainable mining Bolivia",
      "environmental mining management Bolivia"
    ]
  },
  "/medio-ambiente": {
    title: "Environmental Management for Mining in Bolivia | Minera Marte",
    description:
      "Environmental management, field controls and responsible exploration practices for mining projects in Bolivia.",
    lang: "en",
    keywords: [
      "environmental mining Bolivia",
      "medio ambiente mineria Bolivia",
      "mining environmental management",
      "responsible exploration Bolivia"
    ]
  },
  "/seguridad-industrial": {
    title: "Mining Safety and Industrial Safety in Bolivia | Minera Marte",
    description:
      "Industrial safety, mining safety controls and operational standards for exploration and mining work in Bolivia.",
    lang: "en",
    keywords: [
      "mining safety Bolivia",
      "seguridad minera Bolivia",
      "industrial safety mining",
      "safety controls underground mining"
    ]
  },
  "/solicitar-acceso-data-room": {
    title: "Request Mining Data Room Access | Minera Marte Bolivia",
    description:
      "Request controlled visitor access to Minera Marte's mining Data Room for technical review of exploration information in Bolivia.",
    lang: "en",
    keywords: [
      "mining data room Bolivia",
      "mining investment data room",
      "technical mining review Bolivia",
      "exploration data room"
    ]
  }
};

const privatePrefixes = [
  "/dashboard",
  "/exploraciones",
  "/exploraciones-data-room",
  "/solicitudes-data-room",
  "/trabajadores",
  "/usuarios",
  "/login",
  "/forgot-password",
  "/reset-password"
];

export function SeoManager() {
  const location = useLocation();
  const pathname = normalizePath(location.pathname);
  const isPrivate = privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const config = publicSeo[pathname] ?? {
    title: `${siteName} | Mining Exploration in Bolivia`,
    description: defaultDescription,
    lang: "en" as const,
    index: !isPrivate
  };
  const canonical = `${env.VITE_PUBLIC_SITE_URL}${pathname === "/" ? "" : pathname}`;
  const title = config.title;
  const description = config.description;
  const keywords = [...defaultKeywords, ...(config.keywords ?? [])].join(", ");
  const shouldIndex = config.index ?? !isPrivate;
  const imageUrl = `${env.VITE_PUBLIC_SITE_URL}/icons/app-icon-512.png`;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: env.VITE_PUBLIC_SITE_URL,
    logo: imageUrl,
    description: defaultDescription,
    address: {
      "@type": "PostalAddress",
      addressCountry: "BO",
      addressRegion: "Potosi",
      addressLocality: "Sud Lipez"
    },
    knowsAbout: [
      "Gold mining",
      "Copper mining",
      "Silver mining",
      "Mining exploration",
      "Mining investment in Bolivia",
      "Responsible mining"
    ]
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: env.VITE_PUBLIC_SITE_URL,
    inLanguage: ["en", "es-BO"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${env.VITE_PUBLIC_SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet htmlAttributes={{ lang: config.lang ?? "en" }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={shouldIndex ? "index,follow" : "noindex,nofollow"} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:locale" content={config.lang === "es" ? "es_BO" : "en_US"} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
    </Helmet>
  );
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}
