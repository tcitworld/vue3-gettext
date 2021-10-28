module.exports = {
  input: {
    path: "./docs/.vuepress",
    include: ["**/*.html", "**/*.vue"],
    exclude: [],
  },
  output: {
    path: "./docs/language",
    locales: ["en", "de"],
    flat: false,
    linguas: true,
  },
};
