import { Project, SyntaxKind, VariableDeclaration, PropertyAssignment, BinaryExpression, CallExpression } from "ts-morph";

const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
});

function addDecimalImport(sourceFile: any) {
    const imports = sourceFile.getImportDeclarations();
    const hasDecimal = imports.some((i: any) => i.getModuleSpecifierValue() === "decimal.js-light");
    if (!hasDecimal) {
        sourceFile.addImportDeclaration({
            namedImports: ["Decimal"],
            moduleSpecifier: "decimal.js-light"
        });
    }
}

// ---------------------------------------------------------
// 1. PaymentModal.tsx
// ---------------------------------------------------------
const paymentModal = project.getSourceFile("src/components/patients/billing/PaymentModal.tsx");
if (paymentModal) {
    addDecimalImport(paymentModal);
    
    // Fix remainingBalance
    paymentModal.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((decl: VariableDeclaration) => {
        if (decl.getName() === "remainingBalance") {
            const init = decl.getInitializerIfKind(SyntaxKind.ConditionalExpression);
            if (init) {
                init.getWhenTrue().replaceWithText("new Decimal(invoice.totalAmount).minus(invoice.paidAmount).toNumber()");
            }
        }
    });

    // Fix amount assignment inside handleSubmit
    paymentModal.getDescendantsOfKind(SyntaxKind.PropertyAssignment).forEach((prop: PropertyAssignment) => {
        if (prop.getName() === "amount") {
            const init = prop.getInitializer();
            if (init && init.getText() === "Number(amount)") {
                init.replaceWithText("new Decimal(amount).toNumber()");
            }
        }
    });
}

// ---------------------------------------------------------
// 2. InvoiceForm.tsx
// ---------------------------------------------------------
const invoiceForm = project.getSourceFile("src/components/patients/billing/InvoiceForm.tsx");
if (invoiceForm) {
    addDecimalImport(invoiceForm);
    
    // Fix totalAmount
    invoiceForm.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((decl: VariableDeclaration) => {
        if (decl.getName() === "totalAmount") {
            const init = decl.getInitializerIfKind(SyntaxKind.CallExpression);
            if (init && init.getExpression().getText() === "items.reduce") {
                init.replaceWithText("items.reduce((sum, item) => sum.plus(new Decimal(item.price || 0).mul(item.quantity)), new Decimal(0)).toNumber()");
            }
        }
    });

    // Fix handleSubmit prices mapping
    invoiceForm.getDescendantsOfKind(SyntaxKind.PropertyAssignment).forEach((prop: PropertyAssignment) => {
        if (prop.getName() === "price") {
            const init = prop.getInitializer();
            if (init && init.getText() === "Number(i.price)") {
                init.replaceWithText("new Decimal(i.price || 0).toNumber()");
            }
        }
    });
}

// ---------------------------------------------------------
// 3. BillingList.tsx
// ---------------------------------------------------------
const billingList = project.getSourceFile("src/components/patients/billing/BillingList.tsx");
if (billingList) {
    addDecimalImport(billingList);

    // 3.1 Replace Number(item.price) * item.quantity inside template literals and JSX
    billingList.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach((node: BinaryExpression) => {
        if (node.getOperatorToken().getKind() === SyntaxKind.AsteriskToken) {
            const left = node.getLeft().getText();
            const right = node.getRight().getText();
            if (left === "Number(item.price)" && right === "item.quantity") {
                node.replaceWithText("new Decimal(item.price).mul(item.quantity).toNumber()");
            }
        } else if (node.getOperatorToken().getKind() === SyntaxKind.MinusToken) {
            const left = node.getLeft().getText();
            const right = node.getRight().getText();
            if (left === "Number(invoice.totalAmount)" && right === "Number(invoice.paidAmount)") {
                node.replaceWithText("new Decimal(invoice.totalAmount).minus(invoice.paidAmount).toNumber()");
            }
        } else if (node.getOperatorToken().getKind() === SyntaxKind.GreaterThanToken) {
             const left = node.getLeft().getText();
             const right = node.getRight().getText();
             if (left === "(Number(invoice.totalAmount) - Number(invoice.paidAmount))") {
                 node.replaceWithText("new Decimal(invoice.totalAmount).minus(invoice.paidAmount).greaterThan(0)");
             }
        }
    });

    // 3.2 Replace array reduce math: reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
    billingList.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call: CallExpression) => {
        const exprText = call.getExpression().getText();
        if (exprText === "invoiceHistory.reduce") {
            const args = call.getArguments();
            if (args.length === 2 && args[1].getText() === "0") {
                const arrowFunc = args[0];
                if (arrowFunc.getKind() === SyntaxKind.ArrowFunction) {
                    const body = (arrowFunc as any).getBody().getText();
                    if (body === "sum + Number(inv.totalAmount)") {
                        call.replaceWithText("invoiceHistory.reduce((sum, inv) => sum.plus(inv.totalAmount || 0), new Decimal(0)).toNumber()");
                    } else if (body === "sum + Number(inv.paidAmount)") {
                        call.replaceWithText("invoiceHistory.reduce((sum, inv) => sum.plus(inv.paidAmount || 0), new Decimal(0)).toNumber()");
                    }
                }
            }
        }
    });

    // 3.3 Replace bare Number(xxx) calls that are not caught above
    billingList.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call: CallExpression) => {
        if (call.getExpression().getText() === "Number") {
            const args = call.getArguments();
            if (args.length === 1) {
                const arg = args[0].getText();
                // Avoid messing with already replaced ones that are nested (ts-morph throws if you replace deleted nodes).
                // But we can check if it hasn't been deleted.
                if (!call.wasForgotten()) {
                    if (arg === "item.price" || arg === "invoice.totalAmount" || arg === "invoice.paidAmount" || arg === "payment.amount") {
                        call.replaceWithText(`new Decimal(${arg}).toNumber()`);
                    }
                }
            }
        }
    });
}

project.saveSync();
console.log("Migration complete.");
