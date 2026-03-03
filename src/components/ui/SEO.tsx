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

export default function SEO({ title, description, keywords, path = '/', ogImage, noIndex, type = 'website' }: Props) {
  const fullTitle  = title ? `${title} | ${COMPANY}` : `${COMPANY} — Premium Home Appliances ${CITY}`;
  const desc       = description || `Pakistan's trusted home appliance store. Premium ACs, Refrigerators, Solar & more on easy installments. Serving 14,000+ households in ${CITY} since 2015.`;
  const canonical  = `${SITE_URL}${path}`;
  const image      = ogImage || `${SITE_URL}/og-image.svg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description"         content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex  && <meta name="robots"   content="noindex,nofollow" />}
      <link rel="canonical"            href={canonical} />
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={desc} />
      <meta property="og:url"          content={canonical} />
      <meta property="og:image"        content={image} />
      <meta property="og:type"         content={type} />
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={image} />
      <script type="application/ld+json">{JSON.stringify({
        '@context':'https://schema.org','@type':'LocalBusiness',
        name: COMPANY, url: SITE_URL, telephone: '+923702578788',
        address:{ '@type':'PostalAddress', addressLocality: CITY, addressCountry:'PK' },
        openingHours:'Mo-Sa 09:00-21:00',
      })}</script>
    </Helmet>
  );
}
