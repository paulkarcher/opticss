import { suite, test, skip, only, slow, timeout } from "mocha-typescript";
import { assert } from "chai";
import * as path from "path";
import * as fs from "fs";
import * as cssSize from "css-size";
import * as parse5 from "parse5";

import { OptimizationResult } from "../src/Optimizer";
import { TestTemplate } from "./util/TestTemplate";
import clean from "./util/clean";
import { testOptimizationCascade, CascadeTestResult, CascadeTestError, logOptimizations, debugError, debugResult } from "./util/assertCascade";
import { TemplateIntegrationOptions, RewritableIdents } from "../src/OpticssOptions";
import { IdentGenerator } from "../src/util/IdentGenerator";
import { walkElements } from "./util/SimpleTemplateRunner";

function testDefaults(...stylesAndTemplates: Array<string | TestTemplate>): Promise<CascadeTestResult> {
  return testOptimizationCascade(
    { },
    { rewriteIdents: {id: true, class: true} },
    ...stylesAndTemplates).catch((e: CascadeTestError) => {
      debugError(stylesAndTemplates.filter(s => typeof s === "string").join("\n"), e);
      throw e;
    });
}

@suite("Integration Tests", slow(3000), timeout(4000))
export class IntegrationTests {
  @test "Google Homepage"() {
    let css = fs.readFileSync(path.resolve(__dirname, "../../test/fixtures/integration-tests/google-homepage/styles.css"), "utf-8");
    let markup = fs.readFileSync(path.resolve(__dirname, "../../test/fixtures/integration-tests/google-homepage/markup.html"), "utf-8");
    let template = new TestTemplate("test", markup, true);
    return testDefaults(css, template).then(_result => {
      // logOptimizations(result.optimization);
      // return debugSize(css, result).then(() => {
      //   // debugResult(css, result);
      // });
    });
  }
  @test "NYT Homepage"() {
    let markup = fs.readFileSync(path.resolve(__dirname, "../../test/fixtures/integration-tests/nytimes-homepage/markup.html"), "utf-8");
    let css = fs.readFileSync(path.resolve(__dirname, "../../test/fixtures/integration-tests/nytimes-homepage/styles.css"), "utf-8");
    let template = new TestTemplate("test", markup, true);
    return testDefaults(css, template).then(_result => {
      // logOptimizations(result.optimization);
      // return debugSize(css, result).then(() => {
      //   debugResult(css, result);
      // });
    });
  }
}

function debugSize(inputCSS: string, result: CascadeTestResult): Promise<void> {
  let testedMarkup = result.testedTemplates[0].testedMarkups[0];
  let inputHtml = testedMarkup.originalBody;
  let optimizedHtml = Promise.resolve({css: testedMarkup.optimizedBody});
  const optimizedCss = Promise.resolve({css: result.optimization.output.content.toString()});
  let templatePromise = cssSize.table(inputHtml, {}, () => optimizedHtml).then((table) => {
    console.log("Markup");
    console.log(table);
  });
  let cssPromise = cssSize.table(inputCSS, {}, () => optimizedCss).then((table) => {
    console.log("Styles");
    console.log(table);
  });
  return Promise.all([cssPromise, templatePromise]).then(() => {});
}

export function extractInlineStyleTags(html: string) {
  let document = parse5.parse(html, {
    treeAdapter: parse5.treeAdapters.default
  }) as parse5.AST.Default.Document;
  let css = "";
  walkElements(document, (element) => {
    // console.log(element.tagName);
    if (element.tagName === "style") {
      element.childNodes.forEach(e => {
        css += (<parse5.AST.Default.TextNode>e).value;
      });
    }
  });
  console.log(css);
}