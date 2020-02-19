# microservice-intelligence-action

This action uses the LeanIX pivio integration to write microservice information to a workspace.

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

## Maven projects
In order for this action to work with your maven project you need to add the `license-maven-plugin` to the projects pom.xml.

```xml
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>license-maven-plugin</artifactId>
    <version>1.8</version>
    <configuration>
        <outputDirectory>${basedir}</outputDirectory>
        <thirdPartyFilename>third-party-licenses.json</thirdPartyFilename>
        <fileTemplate>${basedir}/src/main/resources/third-party.ftl</fileTemplate>
        <failIfWarning>true</failIfWarning>
        <useMissingFile>true</useMissingFile>
        <missingFile>MISSING-THIRD-PARTY.properties</missingFile>
    </configuration>
</plugin>
```