import Head from 'expo-router/head';

const SITE = 'https://wordfuse.expo.app';

/**
 * Per-page title, description and canonical URL for the web build (search engines and
 * link previews). Renders nothing on Android/iOS. Session pages (rooms, results) pass
 * `noindex` so they stay out of search results.
 */
export function PageMeta({ title, description, path, noindex = false }) {
  const fullTitle = title ? `${title} | Word Fuse` : 'Word Fuse – Free Word Game';
  return (
    <Head>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:title" content={fullTitle} />
      {path ? <link rel="canonical" href={`${SITE}${path}`} /> : null}
      {path ? <meta property="og:url" content={`${SITE}${path}`} /> : null}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
    </Head>
  );
}
