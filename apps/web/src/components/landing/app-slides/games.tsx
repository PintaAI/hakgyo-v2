import { reveal } from "../reveal";
import { Slide, SlideHeading } from "../slide";
import { GameList, games } from "../slides/learner-app";

/** The practice games. */
export function AppGamesSlide() {
  return (
    <Slide id="game">
      <SlideHeading
        id="game"
        title={`${games.length} game latihan,`}
        muted="dari Hangeul sampai kalimat."
        description="Hafalkan huruf dan kosakata dari kelasmu sambil bermain."
        descriptionOnPhones={false}
        className="max-w-4xl"
      />
      <div {...reveal(2)}>
        <GameList />
      </div>
    </Slide>
  );
}
