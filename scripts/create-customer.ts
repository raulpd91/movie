import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { generateApiKey, hashApiKey, maskApiKey } from "@/lib/auth";
import { redis } from "@/lib/redis";

type CustomerRecord = {
  customerId: string;
  customerName: string;
  status: "active";
  rateLimit: 60;
  createdAt: number;
};

type CustomerIndexRecord = CustomerRecord & {
  apiKeyHash: string;
};

const DEFAULT_RATE_LIMIT = 60;
const CUSTOMER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_KEY_GENERATION_ATTEMPTS = 5;

function parseArgs(argv: string[]) {
  const parsed: {
    customerId?: string;
    customerName?: string;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--customer-id") {
      parsed.customerId = next;
      index += 1;
    }

    if (current === "--customer-name") {
      parsed.customerName = next;
      index += 1;
    }
  }

  return parsed;
}

async function promptForMissingValues(initialValues: {
  customerId?: string;
  customerName?: string;
}) {
  const readline = createInterface({ input, output });

  try {
    const customerId =
      initialValues.customerId?.trim() ||
      (await readline.question("Customer ID: ")).trim();
    const customerName =
      initialValues.customerName?.trim() ||
      (await readline.question("Customer name: ")).trim();

    return { customerId, customerName };
  } finally {
    readline.close();
  }
}

function validateCustomerId(customerId: string) {
  if (!customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!CUSTOMER_ID_PATTERN.test(customerId)) {
    throw new Error(
      "Customer ID may only contain letters, numbers, hyphens, and underscores.",
    );
  }
}

function validateCustomerName(customerName: string) {
  if (!customerName) {
    throw new Error("Customer name is required.");
  }
}

async function createUniqueApiKey() {
  for (let attempt = 0; attempt < MAX_KEY_GENERATION_ATTEMPTS; attempt += 1) {
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const existing = await redis.get(`apikey:${apiKeyHash}`);

    if (!existing) {
      return { apiKey, apiKeyHash };
    }
  }

  throw new Error(
    "Failed to generate a unique API key after multiple attempts.",
  );
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const { customerId, customerName } = await promptForMissingValues(parsedArgs);

  validateCustomerId(customerId);
  validateCustomerName(customerName);

  const existingCustomer = await redis.get(`customer:${customerId}`);
  if (existingCustomer) {
    throw new Error(`Customer "${customerId}" already exists.`);
  }

  const { apiKey, apiKeyHash } = await createUniqueApiKey();
  const createdAt = Date.now();

  const customerRecord: CustomerRecord = {
    customerId,
    customerName,
    status: "active",
    rateLimit: DEFAULT_RATE_LIMIT,
    createdAt,
  };

  const customerIndexRecord: CustomerIndexRecord = {
    ...customerRecord,
    apiKeyHash,
  };

  await redis.set(`apikey:${apiKeyHash}`, customerRecord);
  await redis.set(`customer:${customerId}`, customerIndexRecord);

  console.log("Customer created successfully.");
  console.log(`Customer ID: ${customerId}`);
  console.log(`Customer name: ${customerName}`);
  console.log(`Stored API key hash: ${maskApiKey(apiKeyHash)}`);
  console.log("Plaintext API key (shown only once, save it now):");
  console.log(apiKey);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Failed to create customer.";
  console.error(message);
  process.exitCode = 1;
}).finally(async () => {
  await redis.close();
});
