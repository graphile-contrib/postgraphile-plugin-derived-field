function DerivedFieldPlugin(
  builder,
  { pgInflection: inflection, derivedFieldDefinitions }
) {
  builder.hook("GraphQLObjectType:fields", (fields, build, context) => {
    const {
      extend,
      getTypeByName,
      pgIntrospectionResultsByKind: introspectionResultsByKind,
      graphql: { GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean },
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
        if (def.identifiers == null) {
          throw new Error(
            `Derived field definitions must include 'identifiers'`
          );
        }
        const identifiers = def.identifiers
          .filter(
            // Exclude identifiers that reference other tables
            ident =>
              !ident.table ||
              ident.table === `${table.namespaceName}.${table.name}`
          )
          .map(ident => {
            // Map tag strings to { tag } objects and column strings to { table, columns } objects
            if (typeof ident !== "string") {
              return ident;
            }
            if (ident.startsWith("@")) {
              return {
                tag: ident.substr(1),
              };
            } else {
              const t = ident.substring(0, ident.lastIndexOf("."));
              const c = ident.substring(
                ident.lastIndexOf(".") + 1,
                ident.length
              );
              return {
                table: t,
                columns: [c],
              };
            }
          });
        return Object.assign({}, def, { identifiers });
      })
      .reduce((memo, def) => {
        const addDerivedField = columns => {
          const attrs = introspectionResultsByKind.attribute
            .filter(attr => attr.classId === table.id)
            .filter(attr => columns.includes(attr.name));
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
              const scalarTypes = {
                String: GraphQLString,
                Int: GraphQLInt,
                Float: GraphQLFloat,
                Boolean: GraphQLBoolean,
              };
              return {
                type: def.returnTypeName
                  ? getTypeByName(def.returnTypeName) ||
                    scalarTypes[def.returnTypeName] ||
                    GraphQLString
                  : GraphQLString,
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
        };
        for (const ident of def.identifiers) {
          if ((ident.columns && ident.tag) || (!ident.columns && !ident.tag)) {
            throw new Error(
              `One (and only one) of 'columns' or 'tags' must be specified in 'identifers'`
            );
          }
          if (ident.columns) {
            addDerivedField(ident.columns);
          }
          if (ident.tag) {
            const columns = introspectionResultsByKind.attribute
              .filter(attr => attr.classId === table.id)
              .filter(attr => Object.keys(attr.tags).includes(ident.tag))
              .map(attr => attr.name);
            for (const column of columns) {
              addDerivedField([column]);
            }
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
