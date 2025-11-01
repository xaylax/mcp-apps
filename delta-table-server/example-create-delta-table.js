// Example usage of the create_delta_table tool

/**
 * Example 1: Simple table with basic types
 */
const simpleTableExample = {
  tablePath: "test-tables/customers",
  schema: [
    { name: "customer_id", type: "long", nullable: false },
    { name: "name", type: "string", nullable: false },
    { name: "email", type: "string", nullable: true },
    { name: "age", type: "int", nullable: true },
    { name: "balance", type: "double", nullable: true },
    { name: "is_active", type: "boolean", nullable: false },
    { name: "created_date", type: "timestamp", nullable: false }
  ],
  description: "Customer information table",
  properties: {
    "owner": "data-team",
    "retention_days": "365"
  }
};

/**
 * Example 2: Table with array type
 */
const arrayTableExample = {
  tablePath: "test-tables/orders",
  schema: [
    { name: "order_id", type: "long", nullable: false },
    { name: "customer_id", type: "long", nullable: false },
    { name: "product_ids", type: "array", elementType: "long", nullable: true },
    { name: "tags", type: "array", elementType: "string", nullable: true },
    { name: "total_amount", type: "double", nullable: false },
    { name: "order_date", type: "timestamp", nullable: false }
  ],
  partitionBy: ["order_date"],
  description: "Orders with product arrays"
};

/**
 * Example 3: Table with nested struct type
 */
const structTableExample = {
  tablePath: "test-tables/employees",
  schema: [
    { name: "employee_id", type: "long", nullable: false },
    { name: "name", type: "string", nullable: false },
    { 
      name: "address", 
      type: "struct", 
      nullable: true,
      fields: [
        { name: "street", type: "string", nullable: true },
        { name: "city", type: "string", nullable: true },
        { name: "state", type: "string", nullable: true },
        { name: "zip_code", type: "string", nullable: true }
      ]
    },
    { name: "salary", type: "double", nullable: true },
    { name: "hire_date", type: "date", nullable: false }
  ],
  description: "Employee information with nested address"
};

/**
 * Example 4: Table with decimal type for financial data
 */
const decimalTableExample = {
  tablePath: "test-tables/transactions",
  schema: [
    { name: "transaction_id", type: "long", nullable: false },
    { name: "account_id", type: "long", nullable: false },
    { name: "amount", type: "decimal", precision: 18, scale: 2, nullable: false },
    { name: "fee", type: "decimal", precision: 18, scale: 2, nullable: true },
    { name: "transaction_type", type: "string", nullable: false },
    { name: "transaction_date", type: "timestamp", nullable: false }
  ],
  partitionBy: ["transaction_date"],
  description: "Financial transactions with precise decimal amounts"
};

/**
 * Example 5: Complex table with arrays of structs
 */
const complexTableExample = {
  tablePath: "test-tables/invoice-details",
  schema: [
    { name: "invoiceId", type: "string", nullable: false },
    { name: "invoiceDate", type: "timestamp", nullable: false },
    { name: "totalAmount", type: "double", nullable: false },
    { 
      name: "lineItems", 
      type: "array", 
      elementType: "struct",
      nullable: true,
      fields: [
        { name: "itemId", type: "string", nullable: false },
        { name: "description", type: "string", nullable: true },
        { name: "quantity", type: "int", nullable: false },
        { name: "unitPrice", type: "double", nullable: false },
        { name: "totalPrice", type: "double", nullable: false }
      ]
    },
    { name: "customerName", type: "string", nullable: false }
  ],
  description: "Invoice details with line items"
};

/**
 * Example 6: Table with map type
 */
const mapTableExample = {
  tablePath: "test-tables/products",
  schema: [
    { name: "product_id", type: "long", nullable: false },
    { name: "name", type: "string", nullable: false },
    { name: "price", type: "double", nullable: false },
    { 
      name: "attributes", 
      type: "map", 
      keyType: "string", 
      valueType: "string", 
      nullable: true 
    },
    { name: "created_date", type: "timestamp", nullable: false }
  ],
  description: "Products with key-value attributes"
};

console.log("Examples of create_delta_table tool usage:");
console.log("\n1. Simple Table Example:");
console.log(JSON.stringify(simpleTableExample, null, 2));
console.log("\n2. Array Table Example:");
console.log(JSON.stringify(arrayTableExample, null, 2));
console.log("\n3. Struct Table Example:");
console.log(JSON.stringify(structTableExample, null, 2));
console.log("\n4. Decimal Table Example:");
console.log(JSON.stringify(decimalTableExample, null, 2));
console.log("\n5. Complex Table Example:");
console.log(JSON.stringify(complexTableExample, null, 2));
console.log("\n6. Map Table Example:");
console.log(JSON.stringify(mapTableExample, null, 2));
