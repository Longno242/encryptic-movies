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
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwNDAyMTk2Mw@@._V1_SX300.jpg",
  },
  {
    title: "Inception",
    year: 2010,
    localFile: "inception.jpg",
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTE3NA@@._V1_SX300.jpg",
    posterUrl:
      "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTE3NA@@._V1_SX300.jpg",
  },
  {
    title: "Avengers: Endgame",
    year: 2019,
    localFile: "avengers-endgame.jpg",
    posterUrl:
      "https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX300.jpg",
  },
  {
    title: "Titanic",
    year: 1997,
    localFile: "titanic.jpg",
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BMDdmZGU5NDEtY2E5My00OWI4LWI3MDctMGYxYjczYjM4YzFhXkEyXkFqcGc@._V1_SX300.jpg",
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
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/d8/The_Matrix.png",
  },
  {
    title: "Parasite",
    year: 2019,
    localFile: "parasite.jpg",
    posterUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a4/Parasite_%282019_film%29.jpg",
  },
  {
    title: "Oppenheimer",
    year: 2023,
    localFile: "oppenheimer.jpg",
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BNDBmMjA3MmQtNzY1MC00N2I0LWI5YjUtY2U3MjhhYTY3N2VlXkEyXkFqcGc@._V1_SX300.jpg",
  },
  {
    title: "Avatar",
    year: 2009,
    localFile: "avatar.jpg",
    posterUrl:
      "https://m.media-amazon.com/images/M/MV5BMTYwOTEwNjAzMl5BMl5BanBnXkFtZTcwODc5MTUwMw@@._V1_SX300.jpg",
  },
  {
    title: "Joker",
    year: 2019,
    localFile: "joker.jpg",
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BNGVjN2M4MzgtMVhMNS00ZDA1LWE1ZjgtZGY5N2RjNWE3ZjRkXkEyXkFqcGc@._V1_SX300.jpg",
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
    imdbUrl:
      "https://m.media-amazon.com/images/M/MV5BMDlkMmNhYTMtYWU4Ny00ZDMiLWFmYWYtN2Y2ZDQ2Y2ZiZmVlXkEyXkFqcGc@._V1_SX300.jpg",
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
