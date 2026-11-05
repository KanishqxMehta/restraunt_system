import "server-only";
import { Client } from "pg";
import { z } from "zod";

const changeSchema = z.object({ orderId: z.string(), outletId: z.string() });
export type OrderChange = z.infer<typeof changeSchema>;

interface Subscriber {
  change: (change: OrderChange) => void;
  disconnect: () => void;
}

function createListener() {
  let client: Client | undefined;
  let ready: Promise<void> | undefined;
  const subscribers = new Set<Subscriber>();

  function connect() {
    const connection = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
    });
    client = connection;

    function disconnect() {
      if (client !== connection) return;
      client = undefined;
      ready = undefined;
      for (const subscriber of subscribers) subscriber.disconnect();
      subscribers.clear();
      void connection.end().catch(() => {});
    }

    connection.on("error", disconnect);
    connection.on("end", disconnect);
    connection.on("notification", ({ channel, payload }) => {
      if (channel !== "restaurant_order_change" || !payload) return;
      let value: unknown;
      try {
        value = JSON.parse(payload);
      } catch {
        return;
      }
      const parsed = changeSchema.safeParse(value);
      if (!parsed.success) return;
      for (const subscriber of subscribers) subscriber.change(parsed.data);
    });

    ready = (async () => {
      try {
        await connection.connect();
        await connection.query("LISTEN restaurant_order_change");
      } catch (error) {
        disconnect();
        throw error;
      }
    })();
    return ready;
  }

  return {
    subscribe(subscriber: Subscriber) {
      subscribers.add(subscriber);
      return {
        ready: ready ?? connect(),
        unsubscribe: () => subscribers.delete(subscriber),
      };
    },
  };
}

// Share one dedicated LISTEN connection across streams and development reloads.
const globals = globalThis as typeof globalThis & {
  restaurantOrderListener?: ReturnType<typeof createListener>;
};

export function getOrderListener() {
  return (globals.restaurantOrderListener ??= createListener());
}
