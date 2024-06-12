export * from "https://esm.sh/*ember-source@5.9.0/dist/packages/@ember/template-compilation/index.js?&dev";
import emberTemplateCompiler from "https://esm.sh/*ember-source@5.9.0/dist/ember-template-compiler.js?dev";

import { createTemplateFactory } from "https://esm.sh/*ember-source@5.9.0/dist/packages/@ember/template-factory/index.js?&dev";

import { precompileJSON } from "@glimmer/compiler";
import { getTemplateLocals } from "@glimmer/syntax";

/**
 * The reason why we can't use precompile directly is because of this:
 * https://github.com/glimmerjs/glimmer-vm/blob/master/packages/%40glimmer/compiler/lib/compiler.ts#L132
 *
 * Support for dynamically compiling templates in strict mode doesn't seem to be fully their yet.
 * That JSON.stringify (and the lines after) prevent us from easily setting the scope function,
 * which means that *everything* is undefined.
 */
export function precompileTemplate(source, { moduleName, scope = {} }) {
  let s = typeof scope === "function" ? scope() : scope;
  let localScope = { ...s };
  let locals = getTemplateLocals(source);

  let options = {
    mode: "precompile",
    strictMode: true,
    moduleName,
    locals,
    isProduction: false,
    meta: { moduleName },
  };

  // Copied from @glimmer/compiler/lib/compiler#precompile
  let [block, usedLocals] = precompileJSON(source, options);

  let usedScope = usedLocals.map((key) => {
    let value = localScope[key];

    if (!value) {
      throw new Error(
        `Attempt to use ${key} in compiled hbs, but it was not available in scope. ` +
          `Available scope includes: ${Object.keys(localScope)}`,
      );
    }

    return value;
  });

  let blockJSON = JSON.stringify(block);
  let templateJSONObject = {
    id: moduleName,
    block: blockJSON,
    moduleName: moduleName ?? "(dynamically compiled component)",
    scope: () => usedScope,
    isStrictMode: true,
  };

  let factory = createTemplateFactory(templateJSONObject);

  return factory;
}
