/**
 * Showcase movies — local posters in assets/posters/ (run cachePostersToDisk.js),
 * with live fallback to IMDb / Wikimedia when online.
 */
const path = require("path");

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const movies = [
  {
    title: "The Dark Knight",
    year: 2008,
    localFile: "the-dark-knight.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/1/1c/The_Dark_Knight_%282008_film%29.jpg",
  },
  {
    title: "Inception",
    year: 2010,
    localFile: "inception.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg",
  },
  {
    title: "Avengers: Endgame",
    year: 2019,
    localFile: "avengers-endgame.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg",
  },
  {
    title: "Titanic",
    year: 1997,
    localFile: "titanic.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
  },
  {
    title: "Interstellar",
    year: 2014,
    localFile: "interstellar.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg",
  },
  {
    title: "The Matrix",
    year: 1999,
    localFile: "the-matrix.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  },
  {
    title: "Parasite",
    year: 2019,
    localFile: "parasite.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/53/Parasite_%282019_film%29.png",
  },
  {
    title: "Oppenheimer",
    year: 2023,
    localFile: "oppenheimer.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/4/4a/Oppenheimer_%28film%29.jpg",
  },
  {
    title: "Avatar",
    year: 2009,
    localFile: "avatar.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/d6/Avatar_%282009_film%29_poster.jpg",
  },
  {
    title: "Joker",
    year: 2019,
    localFile: "joker.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/e1/Joker_%282019_film%29_poster.jpg",
  },
  {
    title: "Pulp Fiction",
    year: 1994,
    localFile: "pulp-fiction.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/3b/Pulp_Fiction_%281994%29_poster.jpg",
  },
  {
    title: "Gladiator",
    year: 2000,
    localFile: "gladiator.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/fb/Gladiator_%282000_film_poster%29.png",
  },
];

movies.forEach((m) => {
  m.slug = slug(m.title);
});

module.exports = {
  tagline: "Every iconic film. One home screen.",
  subtitle: "Blockbusters, classics, and cult favorites — ready when you are.",
  movies,
  postersDir: path.join(__dirname, "assets", "posters"),
};
