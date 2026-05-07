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
  alternateName: 'Tajalli\'s Appliances',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  image: `${SITE_URL}/og-image.svg`,
  telephone: '+923702578788',
  priceRange: '₨₨',
  currenciesAccepted: 'PKR',
  paymentAccepted: 'Cash, Installments, Bank Transfer',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Karachi',
    addressLocality: 'Karachi',
    addressRegion: 'Sindh',
    addressCountry: 'PK',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 24.8607, longitude: 67.0011 },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], opens: '09:00', closes: '21:00' },
  ],
  sameAs: [
    'https://www.facebook.com/tajallis',
    'https://www.instagram.com/tajallis',
  ],
  hasMap: 'https://maps.google.com/?q=Tajalli%27s+Karachi',
  areaServed: { '@type': 'City', name: 'Karachi' },
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
