function DerivedFieldPlugin(
  builder,
  { pgInflection: inflection, derivedFieldDefinitions }
) {
  builder.hook("GraphQLObjectType:fields", (fields, build, context) => {
    const {
      extend,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      graphql: { GraphQLString },
      fieldDataGeneratorsByFieldNameByType,
    } = build;
    const {
      scope: { pgIntrospection: table, isPgRowType },
      fieldWithHooks,
      Self,
    } = context;

    if (
      !isPgRowType ||
      !table ||
      table.kind !== "class" ||
      derivedFieldDefinitions == null
    ) {
      return fields;
    }

    const tableType = introspectionResultsByKind.type.filter(
      type =>
        type.type === "c" &&
        type.namespaceId === table.namespaceId &&
        type.classId === table.id
    )[0];
    if (!tableType) {
      throw new Error("Could not determine the type for this table");
    }

    const derivedFields = derivedFieldDefinitions
      .map(def => {
        // Map string identifiers to { table, columns }
        const identifiers = def.identifiers.map(ident => {
          if (typeof ident !== "string") {
            return ident;
          }
          const t = ident.substring(0, ident.lastIndexOf("."));
          const c = ident.substring(ident.lastIndexOf(".") + 1, ident.length);
          return {
            table: t,
            columns: [c],
          };
        });
        return Object.assign({}, def, { identifiers });
      })
      .reduce((memo, def) => {
        const columns = def.identifiers
          .filter(
            ident => ident.table === `${table.namespaceName}.${table.name}`
          )
          .reduce((memo, ident) => ident.columns, []);
        if (columns.length === 0) {
          // No matches for this definition
          return memo;
        }
        // Generate the derived field
        const attrs = introspectionResultsByKind.attribute.filter(
          attr => attr.classId === table.id && columns.includes(attr.name)
        );
        const fieldNames = attrs.map(attr =>
          inflection.column(attr.name, table.name, table.namespaceName)
        );
        const derivedFieldName = def.inflect(...fieldNames);
        if (memo[derivedFieldName]) {
          throw new Error(
            `Derived field '${derivedFieldName}' conflicts with existing GraphQL field`
          );
        }
        memo[derivedFieldName] = fieldWithHooks(
          derivedFieldName,
          ({ addDataGenerator }) => {
            const generatorsByField = fieldDataGeneratorsByFieldNameByType.get(
              Self
            );
            const setAlias = (fn, fieldName) => {
              return (...args) => {
                args[0].alias = fieldName;
                return fn(...args);
              };
            };
            for (let fieldName of fieldNames) {
              for (let g of generatorsByField[fieldName]) {
                addDataGenerator(setAlias(g, fieldName));
              }
            }
            return {
              type: def.returnType || GraphQLString,
              description: def.description,
              resolve: data => {
                if (
                  fieldNames.filter(n => !data.hasOwnProperty(n)).length > 0
                ) {
                  throw new Error(
                    `Derived field '${derivedFieldName}' could not be resolved`
                  );
                }
                const args = fieldNames.map(fieldName => data[fieldName]);
                return def.resolve(...args);
              },
            };
          },
          {}
        );
        return memo;
      }, {});

    return extend(
      fields,
      derivedFields,
      `Adding derived field to '${Self.name}'`
    );
  });
}

module.exports = DerivedFieldPlugin;
