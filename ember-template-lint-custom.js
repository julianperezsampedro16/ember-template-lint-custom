import HeaderMain from "./lib/rules/header-main.js";

export default {
  name: "ember-template-lint-lint-custom",
  configurations: {
    rules: {
      "header-main": true,
    },
  },
  rules: {
    "header-main": HeaderMain,
  },
};
