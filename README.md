[![Package on npm](https://img.shields.io/npm/v/postgraphile-plugin-derived-field.svg)](https://www.npmjs.com/package/postgraphile-plugin-derived-field)

# postgraphile-plugin-derived-field
This plugin adds derived fields in PostGraphile v4.

> **Note:** This plugin targets the beta release of PostGraphile v4.

## Getting Started

``` js
const express = require("express");
const { postgraphile } = require("postgraphile");
const PostGraphileDerivedFieldPlugin = require("postgraphile-plugin-derived-field");

const app = express();

const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const bucket = "postgraphile-plugin-test";

app.use(
  postgraphile(pgConfig, schema, {
    graphiql: true,
    appendPlugins: [PostGraphileDerivedFieldPlugin],
    graphileBuildOptions: {
      derivedFieldDefinitions: [
        {
          identifiers: ["my_schema.my_table.my_column"],
          inflect: (fieldName) => `${fieldName}Derived`,
          resolve: (val) => `Value derived from ${val}`
        }
      ]
    }
  })
);

app.listen(5000);
```

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
          inflect: (fieldName) => `${fieldName}Url`,
          resolve: (val) => s3.getSignedUrl('getObject', {Bucket: bucket, Key: val, Expires: 900})
        }
      ]
    }
  })
);

app.listen(5000);
```

</details>