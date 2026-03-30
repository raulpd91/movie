import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { generateInstallToken, hashInstallToken, maskApiKey } from "@/lib/auth";
import { redis } from "@/lib/redis";

type CustomerRecord = {
  customerId: string;
  customerName: string;
  status: "active" | "inactive";
  rateLimit: number;
  createdAt: number;
};

const CUSTOMER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function parseArgs(argv: string[]) {
  const parsed: {
    customerId?: string;
  } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--customer-id") {
      parsed.customerId = next;
      index += 1;
    }
  }

  return parsed;
}

async function promptForCustomerId(initialCustomerId?: string) {
  const readline = createInterface({ input, output });

  try {
    if (initialCustomerId?.trim()) {
      return initialCustomerId.trim();
    }

    return (await readline.question("Customer ID: ")).trim();
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

function isCustomerRecord(value: unknown): value is CustomerRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CustomerRecord>;

  return (
    typeof candidate.customerId === "string" &&
    typeof candidate.customerName === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.rateLimit === "number"
  );
}

async function createUniqueInstallToken() {
  while (true) {
    const installToken = generateInstallToken();
    const installTokenHash = hashInstallToken(installToken);
    const existing = await redis.get(`installtoken:${installTokenHash}`);

    if (!existing) {
      return { installToken, installTokenHash };
    }
  }
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2));
  const customerId = await promptForCustomerId(parsedArgs.customerId);
  validateCustomerId(customerId);

  const customerRaw = await redis.get(`customer:${customerId}`);
  if (!isCustomerRecord(customerRaw)) {
    throw new Error(
      `Customer "${customerId}" was not found. Create the customer first with admin:create.`,
    );
  }

  const { installToken, installTokenHash } = await createUniqueInstallToken();

  const tokenRecord = {
    customerId: customerRaw.customerId,
    customerName: customerRaw.customerName,
    status: customerRaw.status,
    rateLimit: customerRaw.rateLimit,
    createdAt: Date.now(),
  };

  await redis.set(`installtoken:${installTokenHash}`, tokenRecord);
  await redis.set(`customer-install:${customerId}`, {
    ...tokenRecord,
    installTokenHash,
  });

  console.log("Install token created successfully.");
  console.log(`Customer ID: ${customerRaw.customerId}`);
  console.log(`Customer name: ${customerRaw.customerName}`);
  console.log(`Stored install token hash: ${maskApiKey(installTokenHash)}`);
  console.log("Install token (shown only once, save it now):");
  console.log(installToken);
}

main()
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : "Failed to create install token.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await redis.close();
  });

