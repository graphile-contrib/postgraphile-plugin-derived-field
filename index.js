module.exports = function PostGraphileDerivedFieldPlugin(builder, options) {
  require("./src/DerivedFieldPlugin.js")(builder, options);
};
