import { InfoPage } from '../components/InfoPage';
import { PageMeta } from '../components/PageMeta';
import { HOW_TO_PLAY, toUiCase } from '../content/help';

const SECTIONS = HOW_TO_PLAY.map(({ heading, body }) => ({
  heading: toUiCase(heading),
  body: toUiCase(body),
}));

/** /how-to-play: the rules, multiplayer and tips. */
export function HowToPlayScreen() {
  return (
    <InfoPage
      title="how to play"
      sections={SECTIONS}
      head={
        <PageMeta
          title="How to Play – Rules, Multiplayer and Tips"
          description="How to play Word Fuse: type a word containing the letters before the fuse burns out. Scoring, lives, difficulty, playing online with friends, and tips."
          path="/how-to-play"
        />
      }
    />
  );
}
