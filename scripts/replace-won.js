const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.tsx");
project.addSourceFilesAtPaths("src/**/*.ts");

let updatedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  let hasChanges = false;
  
  // 1. JsxText
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const text of jsxTexts) {
    if (text.getText().includes('₩')) {
      const newText = text.getText().replace(/₩/g, '{currencySymbol}');
      text.replaceWithText(newText);
      hasChanges = true;
    }
  }
  
  // 2. StringLiteral
  const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
  for (const text of stringLiterals) {
    if (text.getLiteralText().includes('₩')) {
      const parent = text.getParent();
      const newString = text.getLiteralText().replace(/₩/g, '${currencySymbol}');
      if (parent.getKind() === SyntaxKind.JsxAttribute) {
         text.replaceWithText(`{\`${newString}\`}`);
      } else {
         text.replaceWithText(`\`${newString}\``);
      }
      hasChanges = true;
    }
  }
  
  // 3. NoSubstitutionTemplateLiteral (e.g. `₩100`)
  const noSubTemplates = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral);
  for (const text of noSubTemplates) {
    if (text.getText().includes('₩')) {
      text.replaceWithText(text.getText().replace(/₩/g, '${currencySymbol}'));
      hasChanges = true;
    }
  }

  // 4. TemplateExpression (e.g. `₩${val}`)
  const templateExprs = sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression);
  for (const expr of templateExprs) {
    if (expr.getText().includes('₩')) {
      expr.replaceWithText(expr.getText().replace(/₩/g, '${currencySymbol}'));
      hasChanges = true;
    }
  }

  if (hasChanges) {
    // Add import { useCurrency } from "@/hooks/use-currency";
    const importDecl = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === "@/hooks/use-currency");
    if (!importDecl) {
      sourceFile.addImportDeclaration({
        namedImports: ["useCurrency"],
        moduleSpecifier: "@/hooks/use-currency"
      });
    }

    // Inject const { symbol: currencySymbol } = useCurrency(); into functional components
    const functions = [...sourceFile.getFunctions(), ...sourceFile.getVariableDeclarations().filter(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction))];
    for (const func of functions) {
       let body = func.getKind() === SyntaxKind.FunctionDeclaration ? func.getBody() : (func.getInitializer()?.getBody ? func.getInitializer().getBody() : null);
       if (body && body.getKind() === SyntaxKind.Block) {
          const name = func.getName ? func.getName() : func.getNameNode?.()?.getText();
          // basic check for React component
          if (name && /^[A-Z]/.test(name)) {
             const block = body;
             if (!block.getText().includes("useCurrency(")) {
               block.insertStatements(0, "const { symbol: currencySymbol } = useCurrency();");
             }
          }
       }
    }
    
    try {
      sourceFile.saveSync();
      updatedCount++;
      console.log(`Updated ${sourceFile.getFilePath()}`);
    } catch(e) {
      console.error(`Failed to save ${sourceFile.getFilePath()}:`, e);
    }
  }
}

console.log(`Total files updated: ${updatedCount}`);
