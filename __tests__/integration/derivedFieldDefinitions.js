const { upperFirst } = require("graphile-build-pg");

module.exports = [
  {
    identifiers: ["p.person.name"],
    inflect: fieldName => `${fieldName}Initials`,
    resolve: name => name.split(" ").reduce((p, c) => p + c.substr(0, 1), ""),
    description: "The person’s initials",
  },
  {
    identifiers: [
      {
        table: "p.person",
        columns: ["name", "email"],
      },
    ],
    inflect: (...fieldNames) =>
      `combined${fieldNames.map(upperFirst).join("And")}`,
    resolve: (name, email) => `${name} (${email})`,
    description: "The person’s name and email",
  },
  {
    identifiers: ["p.person.name"],
    inflect: () => "hasName",
    resolve: name => typeof name === "string" && name !== "",
    returnTypeName: "Boolean",
  },
  {
    identifiers: [
      {
        tag: "key",
      },
    ],
    inflect: fieldName => fieldName.replace("Key", "Url"),
    resolve: key => `https://example.com/${key}`,
  },
  {
    identifiers: [
      {
        table: "p.person",
        columns: ["menu_extras"],
      },
    ],
    type: build => {
      const {
        getTypeByName,
        graphql: { GraphQLList },
      } = build;
      const compositeTypeName = "MenuExtrasWithDefault";
      const compositeType = getTypeByName(compositeTypeName);
      if (!compositeType)
        throw new Error(`Could not find composite type '${compositeTypeName}'`);
      return new GraphQLList(compositeType);
    },
    inflect: fieldName => `${fieldName}WithDefaults`,
    resolve: () => {
      return [];
    },
  },
];
