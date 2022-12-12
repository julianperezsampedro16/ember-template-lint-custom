import { Rule } from "ember-template-lint";

/**
 Disallow usage of String actions in "header-main" component
 Good:

 ```
 <HeaderMain @close={{this.close}} />
 ```

 Bad:

 ```
 <HeaderMain @close="close" />
 ```
 */

const FORBIDDEN_STRING_ATTRS = ["back", "close", "edit", "menu"];
const HEADERS_ATTRS = {
  headerOperationIndex: ["close"],
  headerOperationConditions: ["edit", "close"],
  headerOperationConfirmation: ["close"],
};
const ANY_HEADER_NAME = Object.keys(HEADERS_ATTRS).map(
  (key) => `wrapper.${key}`
);

const nodeIsHeaderMain = ({ path: { original } }) =>
  original === "wrapper.header" || original === "header-main";
const elementIsHeaderMain = ({ tag }) =>
  tag === "HeaderMain" || tag === "wrapper.header";
const nodeIsAnyHeader = ({ path: { original } }) =>
  ANY_HEADER_NAME.includes(original);
const elementIsAnyHeader = ({ tag }) => ANY_HEADER_NAME.includes(tag);

export default class HeaderMain extends Rule {
  parseConfig(config) {
    const configType = typeof config;
    const errorMessage = `The header-main rule accepts a boolean value.
				  * boolean - 'true' to enable
				You specified '${config}'`;

    switch (configType) {
      case "boolean":
        return config;
      case "undefined":
        return false;
      default:
        throw new Error(errorMessage);
    }
  }

  _withoutString(node) {
    this.log({
      message: `Use of actions as Strings should be avoided. You used ${this.sourceForNode(
        node
      )}.`,
      line: node.loc && node.loc.start.line,
      column: node.loc && node.loc.start.column,
      source: this.sourceForNode(node),
    });
  }

  _withoutMandatoryAttrs(node, name) {
    this.log({
      message: `Component "${name}" must implement all attrs: ${HEADERS_ATTRS[
        name
      ].join(", ")}.`,
      line: node.loc && node.loc.start.line,
      column: node.loc && node.loc.start.column,
      source: this.sourceForNode(node),
    });
  }

  _checkAttrs(attrs) {
    attrs.forEach((childNode) => {
      const {
        key,
        name,
        value: { type },
      } = childNode;
      const isGlimmer = name && name.includes("@");
      const attrName = isGlimmer ? name.replace("@", "") : key;
      const rightType = isGlimmer ? "TextNode" : "StringLiteral";

      if (FORBIDDEN_STRING_ATTRS.includes(attrName) && rightType === type) {
        this._withoutString(childNode);
      }
    });
  }

  _checkMandatoryAttrs(node, cName, attrs) {
    const mandatoryAttrs = HEADERS_ATTRS[cName];
    const hasMandatoryAttrs = attrs.some(({ key, name }) => {
      const isGlimmer = name && name.includes("@");
      const attrName = isGlimmer ? name.replace("@", "") : key;

      return mandatoryAttrs.includes(attrName);
    });

    if (!hasMandatoryAttrs) {
      this._withoutMandatoryAttrs(node, cName);
    }
  }

  _handleNode(node) {
    const attrs = node.hash.pairs || [];

    if (nodeIsHeaderMain(node)) {
      this._checkAttrs(attrs);
    }

    if (nodeIsAnyHeader(node)) {
      const chunks = node.path.original.split(".");
      const name = chunks[chunks.length - 1];

      this._checkMandatoryAttrs(node, name, attrs);
    }
  }

  _handleElement(node) {
    const attrs = node.attributes || [];

    if (elementIsHeaderMain(node)) {
      this._checkAttrs(attrs);
    }

    if (elementIsAnyHeader(node)) {
      const chunks = node.tag.split(".");
      const name = chunks[chunks.length - 1];

      this._checkMandatoryAttrs(node, name, attrs);
    }
  }

  _handleMustacheElement(node) {
    /**
     * {{family/my-component/private-component}}
     */
    this._handleNode(node);

    /**
     * (component 'family/my-component/private-component')
     */
    if (node.path.original === "component") {
      this._handlePaths(node);
    }
  }

  _handlePaths(node) {
    node.params.forEach((path) => {
      const fakeNode = Object.assign({}, node, {
        path: { original: path.original },
      });

      this._handleNode(fakeNode);
    });
  }

  visitor() {
    return {
      SubExpression(node) {
        /**
         * {{foo a=(component 'family/my-component/private-component')}}
         *
         * {{foo (component 'family/my-component/private-component')}}
         */
        if (node.path.original === "component") {
          this._handlePaths(node);
        }
      },

      BlockStatement(node) {
        /**
         * {{#family/my-component/private-component}}{{/family/my-component/private-component}}
         */
        this._handleNode(node);
      },

      MustacheStatement(node) {
        /**
         * {{family/my-component/private-component}}
         *
         * {{component 'family/my-component/private-component'}}
         */
        this._handleMustacheElement(node);
      },

      ElementNode(node) {
        /**
         * {{Family::MyComponent::PrivateComponent}}
         */
        this._handleElement(node);
      },
    };
  }
}
