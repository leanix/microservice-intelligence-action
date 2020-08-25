# microservice-intelligence-action

This action uses the LeanIX pivio integration to write microservice information to a workspace.
It also includes increasing our deployment frequency metric. You do not longer need to also run the deprecated https://github.com/leanix/deployment-frequency-action

## Inputs

* `buildTool`    Build tool used for this project (`mvn` or `npm`), defaults to `mvn`
* `serviceName`  Name of the service when pushing the deployment frequency metric, defaults to the short name of the repository
* `configFilePath`  File path of the config file at the repository describing the microservice, defaults to the `pivio.yaml` at the top root directory

## Example usage
```
uses: leanix/microservice-intelligence-action@master
with:
  buildTool: npm
  serviceName: foo
  configFilePath: /packages/service1/pivio.yaml
```

This action requires that you also use the "leanix/secrets-action@master".

## Copyright and license

Copyright 2020 LeanIX GmbH under the [Unlicense license](LICENSE).