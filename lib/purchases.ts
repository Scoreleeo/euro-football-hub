import "server-only";
import { promises as fs } from "fs";
import path from "path";

type PurchaseRecord =
| {
id: string;
type: "division";
league: string;
sessionId: string;
createdAt: string;
paymentStatus: string;
}
| {
id: string;
type: "match";
fixtureId: number;
league: string;
sessionId: string;
createdAt: string;
paymentStatus: string;
};

type PurchaseStore = {
purchases: PurchaseRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "purchases.json");

async function ensureStore() {
await fs.mkdir(DATA_DIR, { recursive: true });

try {
await fs.access(STORE_PATH);
} catch {
const initial: PurchaseStore = { purchases: [] };
await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
}
}

async function readStore(): Promise<PurchaseStore> {
await ensureStore();
const raw = await fs.readFile(STORE_PATH, "utf8");
return JSON.parse(raw) as PurchaseStore;
}

async function writeStore(store: PurchaseStore) {
await ensureStore();
await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function savePurchase(record: PurchaseRecord) {
const store = await readStore();

const alreadyExists = store.purchases.some(
(purchase) => purchase.sessionId === record.sessionId
);

if (alreadyExists) {
return;
}

store.purchases.push(record);
await writeStore(store);
}

export async function hasDivisionPurchase(league: string) {
const store = await readStore();
return store.purchases.some(
(purchase) =>
purchase.type === "division" &&
purchase.league === league &&
purchase.paymentStatus === "paid"
);
}

export async function hasMatchPurchase(fixtureId: number) {
const store = await readStore();
return store.purchases.some(
(purchase) =>
purchase.type === "match" &&
purchase.fixtureId === fixtureId &&
purchase.paymentStatus === "paid"
);
}

export async function getPurchases() {
const store = await readStore();
return store.purchases;
}