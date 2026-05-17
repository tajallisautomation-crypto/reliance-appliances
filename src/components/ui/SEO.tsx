import { Helmet } from 'react-helmet-async';
import { SITE_URL, COMPANY, CITY } from '@/lib/config';

interface Props {
  title?:       string;
  description?: string;
  keywords?:    string;
  path?:        string;
  ogImage?:     string;
  noIndex?:     boolean;
  type?:        'website' | 'product';
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#organization`,
  name: COMPANY,
  alternateName: ["Tajalli's Appliances", "Reliance Home Appliances", "Tajalli's Karachi"],
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg`, width: 512, height: 512 },
  image: `${SITE_URL}/og-image.svg`,
  description: "Karachi's trusted home appliance partner since 2015. We supply genuine ACs, refrigerators, washing machines, solar systems, TVs, and kitchen appliances — retail and B2B — with easy installment plans, same-day delivery across Karachi, and professional after-sale support.",
  slogan: "Genuine Products. Real Support. Easy Installments.",
  foundingDate: '2015',
  telephone: '+923702578788',
  email: 'tajallisautomation@gmail.com',
  priceRange: '₨₨',
  currenciesAccepted: 'PKR',
  paymentAccepted: 'Cash, Bank Transfer, Easy Installments',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Karachi',
    addressLocality: 'Karachi',
    addressRegion: 'Sindh',
    postalCode: '75000',
    addressCountry: 'PK',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 24.8607, longitude: 67.0011 },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], opens: '09:00', closes: '21:00' },
  ],
  contactPoint: [
    { '@type': 'ContactPoint', telephone: '+923702578788', contactType: 'sales', areaServed: 'PK', availableLanguage: ['English', 'Urdu'] },
    { '@type': 'ContactPoint', telephone: '+923702578788', contactType: 'customer service', areaServed: 'PK', availableLanguage: ['English', 'Urdu'] },
  ],
  sameAs: [
    'https://www.facebook.com/tajallis',
    'https://www.instagram.com/tajallis',
  ],
  hasMap: 'https://maps.google.com/?q=Tajalli%27s+Karachi',
  areaServed: [
    { '@type': 'City', name: 'Karachi' },
    { '@type': 'State', name: 'Sindh' },
  ],
  knowsAbout: [
    'Air Conditioners', 'Inverter Air Conditioners', 'T3 Air Conditioners', 'Heat and Cool ACs',
    'Refrigerators', 'Inverter Refrigerators', 'Side-by-Side Refrigerators',
    'Washing Machines', 'Automatic Washing Machines', 'Inverter Washing Machines',
    'Solar Systems', 'Solar Inverters', 'Solar Panels', 'Net Metering',
    'Televisions', 'Smart TVs', '4K TVs',
    'Deep Freezers', 'Kitchen Appliances', 'Water Dispensers', 'Ceiling Fans',
    'Home Appliance Installments', 'B2B Appliance Supply', 'Appliance Installation Karachi',
    'Haier', 'Dawlance', 'Gree', 'EcoStar', 'PEL', 'Orient', 'Samsung', 'TCL',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    bestRating: '5',
    worstRating: '1',
    ratingCount: '14400',
    reviewCount: '14400',
  },
  numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
};

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: COMPANY,
  url: SITE_URL,
  description: `Pakistan's leading appliance supplier in ${CITY}. ACs, Refrigerators, Washing Machines, Solar Systems — retail & B2B supply on easy installments.`,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-PK',
  copyrightYear: new Date().getFullYear(),
  copyrightHolder: { '@id': `${SITE_URL}/#organization` },
};

export default function SEO({ title, description, keywords, path = '/', ogImage, noIndex, type = 'website' }: Props) {
  const fullTitle  = title ? `${title} | ${COMPANY}` : `${COMPANY} — Premium Appliances ${CITY}`;
  const desc       = description || `Pakistan's trusted appliance supplier. Premium ACs, Refrigerators, Solar & more on easy installments. Serving 14,400+ clients in ${CITY} since 2015.`;
  const canonical  = `${SITE_URL}${path}`;
  const image      = ogImage || `${SITE_URL}/og-image.svg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description"          content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex  && <meta name="robots"   content="noindex,nofollow" />}
      <link rel="canonical"             href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name"        content={COMPANY} />
      <meta property="og:locale"           content="en_PK" />
      <meta property="og:title"            content={fullTitle} />
      <meta property="og:description"      content={desc} />
      <meta property="og:url"              content={canonical} />
      <meta property="og:image"            content={image} />
      <meta property="og:image:secure_url" content={image} />
      <meta property="og:image:width"      content="1200" />
      <meta property="og:image:height"     content="630" />
      <meta property="og:image:alt"        content={fullTitle} />
      <meta property="og:type"             content={type} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@tajallis" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />
      <meta name="twitter:image:alt"   content={fullTitle} />

      {/* Regional targeting — Pakistan, English */}
      <link rel="alternate" hrefLang="en-PK" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Structured data */}
      <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
      <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
    </Helmet>
  );
}
