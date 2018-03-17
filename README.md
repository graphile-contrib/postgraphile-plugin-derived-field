[![Package on npm](https://img.shields.io/npm/v/postgraphile-plugin-derived-field.svg)](https://www.npmjs.com/package/postgraphile-plugin-derived-field)

# postgraphile-plugin-derived-field

This plugin provides an interface for defining derived fields <!--and wrapping existing resolvers--> in the schema generated by PostGraphile v4.

The term "derived fields" is used to differentiate this approach from the standard [Computed Columns](https://www.graphile.org/postgraphile/computed-columns/) support in PostGraphile.  This plugin effectively adds "computed columns in JavaScript" to your toolbelt.  It was originally built as a means of returning pre-signed URLs for object keys stored in Postgres.

## Getting Started

Define your derived fields in the `derivedFieldDefinitions` property of `graphileBuildOptions`:

``` js
const express = require("express");
const { postgraphile } = require("postgraphile");
const PostGraphileDerivedFieldPlugin = require("postgraphile-plugin-derived-field");

const app = express();

app.use(
  postgraphile(pgConfig, schema, {
    graphiql: true,
    appendPlugins: [PostGraphileDerivedFieldPlugin],
    graphileBuildOptions: {
      derivedFieldDefinitions: [
        // your definitions here
      ]
    }
  })
);

app.listen(5000);
```

The `derivedFieldDefinitions` should be an array of objects with the following structure:

```
type DerivedFieldDefintion = {
  identifiers: Array<string | Identifier>,
  inflect?: function,
  resolve: function
}

type Identifier = {
  table: string
  columns: Array<string>
}
```

<!--Either `tags` or `identifiers` must be defined in order to identify the Postgres columns that will be passed to the resolver.-->

The `identifiers` items can be supplied as strings or objects.  The following are equivalent:
```
"my_schema.my_table.my_column"
```
```
{
  table: "my_schema.my_table",
  columns: ["my_column"],
}
```

<!--  If an `inflect` function is provided, new fields will be generated using `resolve`.  If `inflect` is omitted, the existing fields will be wrapped by `resolve`. -->

## Use Cases

### Derive a new field from an existing field

``` js
derivedFieldDefinitions = [
  {
    identifiers: [
      {
        table: "my_schema.my_table",
        columns: ["my_column"],
      },
    ],
    inflect: fieldName => `derivedFrom${fieldName}`,
    resolve: val => `Value derived from ${val}`,
  },
]
```

### Derive a new field from two or more existing fields

``` js
derivedFieldDefinitions = [
  {
    identifiers: [
      {
        table: "my_schema.my_table",
        columns: ["my_column", "my_other_column"],
      },
    ],
    inflect: (...fieldNames) =>
      `derivedFrom${fieldNames.map(upperFirst).join("And")}`,
    resolve: (my_column, my_other_column) =>
      `Value derived from ${my_column} and ${my_other_column}`,
  },
]
```

<!--### Wrap one or more existing fields

To wrap existing fields with additional resolver logic, simply exclude the `inflect` parameter.-->

## Examples

<details>

<summary>Generate pre-signed URLs for client-side S3 GET requests</summary>

``` js
const express = require("express");
const { postgraphile } = require("postgraphile");
const PostGraphileDerivedFieldPlugin = require("postgraphile-plugin-derived-field");

const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const bucket = "postgraphile-plugin-test";

const app = express();

app.use(
  postgraphile(pgConfig, schema, {
    graphiql: true,
    appendPlugins: [PostGraphileDerivedFieldPlugin],
    graphileBuildOptions: {
      derivedFieldDefinitions: [
        {
          identifiers: ["my_schema.my_table.my_column"],
          inflect: fieldName => `${fieldName}SignedUrl`,
          resolve: val => s3.getSignedUrl('getObject', {Bucket: bucket, Key: val, Expires: 900})
        }
      ]
    }
  })
);

app.listen(5000);
```

</details>