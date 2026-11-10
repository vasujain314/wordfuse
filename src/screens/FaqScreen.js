import { InfoPage } from '../components/InfoPage';
import { PageMeta } from '../components/PageMeta';
import { FAQ, toUiCase } from '../content/help';

const SECTIONS = FAQ.map(({ q, a }) => ({ heading: toUiCase(q), body: toUiCase(a) }));

/** /faq: common questions. */
export function FaqScreen() {
  return (
    <InfoPage
      title="faq"
      sections={SECTIONS}
      head={
        <PageMeta
          title="FAQ – Free, No Sign-up, Play with Friends"
          description="Word Fuse questions answered: is it free, do I need an account, how to play with friends online, how many players, which words count, iPhone and offline play."
          path="/faq"
        />
      }
    />
  );
}
