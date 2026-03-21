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
  alternateName: 'Reliance',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  image: `${SITE_URL}/og-image.jpg`,
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
    'https://www.facebook.com/relianceappliances',
    'https://www.instagram.com/relianceappliances',
  ],
  hasMap: 'https://maps.google.com/?q=Reliance+Appliances+Karachi',
  areaServed: { '@type': 'City', name: 'Karachi' },
};

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: COMPANY,
  url: SITE_URL,
  description: `Pakistan's leading home appliance store in ${CITY}. Buy ACs, Refrigerators, Washing Machines, Solar Systems on easy installments.`,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: 'en-PK',
};

export default function SEO({ title, description, keywords, path = '/', ogImage, noIndex, type = 'website' }: Props) {
  const fullTitle  = title ? `${title} | ${COMPANY}` : `${COMPANY} — Premium Home Appliances ${CITY}`;
  const desc       = description || `Pakistan's trusted home appliance store. Premium ACs, Refrigerators, Solar & more on easy installments. Serving 14,000+ households in ${CITY} since 2015.`;
  const canonical  = `${SITE_URL}${path}`;
  const image      = ogImage || `${SITE_URL}/og-image.jpg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description"          content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex  && <meta name="robots"   content="noindex,nofollow" />}
      <link rel="canonical"             href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name"    content={COMPANY} />
      <meta property="og:locale"       content="en_PK" />
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={desc} />
      <meta property="og:url"          content={canonical} />
      <meta property="og:image"        content={image} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type"         content={type} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@relianceappliances" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />

      {/* Structured data */}
      <script type="application/ld+json">{JSON.stringify(ORG_SCHEMA)}</script>
      <script type="application/ld+json">{JSON.stringify(WEBSITE_SCHEMA)}</script>
    </Helmet>
  );
}
