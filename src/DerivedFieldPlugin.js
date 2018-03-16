function DerivedFieldPlugin(
  builder,
  { pgInflection: inflection, derivedFieldDefinitions }
) {
  builder.hook("GraphQLObjectType:fields", (fields, build, context) => {
    const {
      extend,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      graphql: { GraphQLString },
      pgColumnFilter,
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

    const derivedFields = introspectionResultsByKind.attribute
      .filter(attr => attr.classId === table.id)
      .filter(attr => pgColumnFilter(attr, build, context))
      .reduce((memo, attr) => {
        for (let def of derivedFieldDefinitions) {
          if (
            def.identifiers.includes(
              `${table.namespaceName}.${table.name}.${attr.name}`
            )
          ) {
            const fieldName = inflection.column(
              attr.name,
              table.name,
              table.namespaceName
            );
            const derivedFieldName = def.inflect(fieldName);
            if (memo[derivedFieldName]) {
              throw new Error(
                `Derived field '${derivedFieldName}' conflicts with existing GraphQL field`
              );
            }
            const field = fields[fieldName];
            const { resolve: oldResolve } = field;
            memo[derivedFieldName] = fieldWithHooks(
              derivedFieldName,
              ({ addDataGenerator }) => {
                const generatorsByField = fieldDataGeneratorsByFieldNameByType.get(
                  Self
                );
                generatorsByField[fieldName].forEach(g => {
                  addDataGenerator(g);
                });
                return {
                  type: def.returnType || GraphQLString,
                  resolve: (...resolveParams) => {
                    const val = oldResolve(...resolveParams);
                    return def.resolve(val);
                  },
                };
              },
              { pgFieldIntrospection: attr }
            );
          }
        }
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
