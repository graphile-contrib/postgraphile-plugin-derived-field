const { upperFirst } = require("graphile-build-pg");

module.exports = [
  {
    identifiers: ["c.person.name"],
    inflect: fieldName => `${fieldName}Initials`,
    resolve: name => name.split(" ").reduce((p, c) => p + c.substr(0, 1), ""),
    description: "The person’s initials",
  },
  {
    identifiers: [
      {
        table: "c.person",
        columns: ["name", "email"],
      },
    ],
    inflect: (...fieldNames) =>
      `combined${fieldNames.map(upperFirst).join("And")}`,
    resolve: (name, email) => `${name} (${email})`,
    description: "The person’s name and email",
  },
  {
    identifiers: ["c.person.name"],
    inflect: () => "hasName",
    resolve: name => typeof name === "string" && name !== "",
    returnTypeName: "Boolean",
  },
];
