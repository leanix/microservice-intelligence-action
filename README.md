# microservice-intelligence-action

This action uses the LeanIX pivio integration to write microservice information to a workspace.
It also includes increasing our deployment frequency metric. You do not longer need to also run the deprecated https://github.com/leanix/deployment-frequency-action

## Inputs

### `buildTool`

**required** Build tool used for this project. [mvn, npm]

**default** mvn

## Example usage
```
uses: leanix/microservice-intelligence-action@master
with:
  buildTool: npm
```

This action requires that you also use the "leanix/secrets-action@master".
